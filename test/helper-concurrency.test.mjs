/**
 * @file
 * @lang zh-CN 自有helper的编译隔离、同进程并发、失败重试和机器输出通道回归，使用内存子进程替身。
 * @lang en In-memory child-process regressions for owned-helper build isolation, same-process concurrency, failure recovery and machine-output separation.
 */
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { it } from 'node:test';

/** @lang zh-CN 替身仅输出已确认C#契约的最小有效空结果。 @lang en The stub emits a minimal valid empty result for the confirmed C# contract. */
const artifact = { contract: 'dotnetdoc-csharp-source-extraction', contractVersion: '1.0.0', source: { files: [] }, members: [] };

/**
 * @lang zh-CN 为一个用例创建独立模块实例，并恢复内建spawn绑定；替身绝不执行dotnet或读取调用者源码。
 * @lang en Creates an independent module instance per case and restores built-in spawn bindings; the stub never executes dotnet or reads caller source.
 * @param {import('node:test').TestContext} context <lang><zh-CN>负责恢复替身的测试上下文。</zh-CN><en>Test context responsible for stub restoration.</en></lang>
 * @param {string} scenario <lang><zh-CN>固定用例身份，控制第一次编译或执行的故障。</zh-CN><en>Fixed case identity controlling the first build or execution failure.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>公开抽取入口和私有调用记录。</zh-CN><en>Public extraction entry and private call records.</en></lang>
 */
async function setup(context, scenario) {
  // <lang><zh-CN>记录副本用于核参数与目录，不持有真实子进程或用户文件。</zh-CN><en>Argument snapshots verify parameters and roots without retaining real child processes or user files.</en></lang>
  const calls = [];
  // <lang><zh-CN>各阶段计数只用于固定首次故障，随后请求必须能够恢复。</zh-CN><en>Stage counts inject only the first failure so later requests must recover.</en></lang>
  let builds = 0;
  let executions = 0;
  // <lang><zh-CN>原生EventEmitter和流模拟spawn异步事件顺序，未知阶段固定失败以避免伪绿。</zh-CN><en>Native events and streams model asynchronous spawn ordering; unknown stages fail to prevent false positives.</en></lang>
  const stub = context.mock.method(childProcess, 'spawn', (command, args, options) => {
    calls.push({ command, args: [...args], cwd: options.cwd, windowsHide: options.windowsHide });
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    process.nextTick(() => {
      if (args[0] === 'build') {
        builds += 1;
        if (scenario === 'spawn-error' && builds === 1) {
          child.emit('error', new Error('Synthetic build spawn failure'));
          return;
        }
        child.stdout.end('Synthetic compiler warning, separate from JSON.\n');
        child.emit('close', scenario === 'build-failure' && builds === 1 ? 1 : 0);
        return;
      }
      if (args[0].endsWith('DotNetDoc.RoslynSourceExtractor.dll')) {
        executions += 1;
        child.stdout.end(scenario === 'invalid-json' && executions === 1 ? 'warning\n' + JSON.stringify(artifact) : JSON.stringify(artifact));
        child.emit('close', 0);
        return;
      }
      child.stderr.end('Unexpected helper invocation');
      child.emit('close', 1);
    });
    return child;
  });
  syncBuiltinESMExports();
  context.after(() => { stub.mock.restore(); syncBuiltinESMExports(); });
  // <lang><zh-CN>查询参数只隔离内部编译缓存；公共包入口及输出契约沿实际模块。</zh-CN><en>A query isolates the internal build cache while preserving the real module and output contract.</en></lang>
  const entry = new URL('../packages/dotnet-source-extractor/src/index.mjs', import.meta.url);
  entry.searchParams.set('helper-regression', scenario);
  const { extractDotnetSourceFiles } = await import(entry.href);
  return { extract: () => extractDotnetSourceFiles({ workspaceRoot: process.cwd(), paths: ['Synthetic.cs'] }), calls };
}

it('shares one isolated build across concurrent requests and separates compiler text from JSON', async (context) => {
  const probe = await setup(context, 'concurrent');
  const results = await Promise.all([probe.extract(), probe.extract(), probe.extract()]);
  assert.deepEqual(results, [artifact, artifact, artifact]);
  const builds = probe.calls.filter(call => call.args[0] === 'build');
  const executions = probe.calls.filter(call => call.args[0].endsWith('.dll'));
  assert.equal(builds.length, 1);
  assert.equal(executions.length, 3);
  assert(builds[0].args.includes('--artifacts-path'));
  const root = builds[0].args[builds[0].args.indexOf('--artifacts-path') + 1];
  assert.notEqual(root, builds[0].cwd);
  assert(executions.every(call => call.args[0].startsWith(path.dirname(root) + path.sep)));
  assert(probe.calls.every(call => call.command === 'dotnet' && call.windowsHide === true));
});

for (const scenario of ['build-failure', 'spawn-error']) {
  it(`cleans a failed isolated ${scenario} and permits a later build`, async (context) => {
    const probe = await setup(context, scenario);
    await assert.rejects(probe.extract());
    const first = probe.calls[0].args;
    const root = path.dirname(first[first.indexOf('--artifacts-path') + 1]);
    assert.equal(existsSync(root), false);
    assert.deepEqual(await probe.extract(), artifact);
    const builds = probe.calls.filter(call => call.args[0] === 'build');
    assert.equal(builds.length, 2);
    assert.notEqual(builds[0].args[builds[0].args.indexOf('--artifacts-path') + 1], builds[1].args[builds[1].args.indexOf('--artifacts-path') + 1]);
  });
}

it('rejects noisy runtime JSON without discarding the successful build for later requests', async (context) => {
  const probe = await setup(context, 'invalid-json');
  await assert.rejects(probe.extract(), /invalid JSON/u);
  assert.deepEqual(await probe.extract(), artifact);
  assert.equal(probe.calls.filter(call => call.args[0] === 'build').length, 1);
});
