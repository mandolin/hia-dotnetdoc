/** @file 主SDK结果和CLI公开失败不得泄漏底层私有路径、异常或源正文。 @lang en Main SDK results and public CLI failures must not leak private lower-layer paths, exceptions or source bodies. */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { it } from 'node:test';
import { runDotnetDoc } from '../packages/dotnetdoc-runner/src/index.mjs';

/** 固定自有CLI文件，进程仅运行Node文档工具。 @lang en Fixed owned CLI path; child processes run only the Node documentation tool. */
const cli = fileURLToPath(new URL('../packages/dotnetdoc-runner/src/cli.mjs', import.meta.url));
/** 捕获预期CLI非零退出，不把退出异常本身当作通过。 @lang en Captures expected nonzero CLI exits without treating the process exception itself as success. */
const execute = promisify(execFile);

for (const partial of [false, true]) {
  it(`keeps ${partial ? 'partial' : 'failed'} result manifests public-safe when input I/O fails`, async (context) => {
    // <lang><zh-CN>含私有哨兵的临时根用于真实I/O失败，成功/失败产物都不能回显它。</zh-CN><en>A private-sentinel temporary root induces real I/O failure that neither successful nor failed artifacts may echo.</en></lang>
    const root = await mkdtemp(path.join(tmpdir(), 'PRIVATE_ROOT_WP145_'));
    context.after(() => rm(root, { recursive: true, force: true }));
    await writeFile(path.join(root, 'Good.xml'), '<doc><assembly><name>Good</name></assembly><members><member name="T:Good.Widget"><summary>Public summary</summary></member></members></doc>');
    const output = path.join(root, 'out');
    const inputs = [{ kind: 'dotnet-xml-doc', path: 'Missing.xml' }];
    if (partial) inputs.unshift({ kind: 'dotnet-xml-doc', path: 'Good.xml' });
    const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: output, inputs });
    assert.equal(result.status, partial ? 'partial' : 'failed');
    assert.equal(result.contractVersion, '1.0.0');
    const serialized = JSON.stringify(result);
    const manifest = await readFile(path.join(output, 'dotnetdoc.producer-result.json'), 'utf8');
    for (const body of [serialized, manifest]) {
      assert.equal(body.includes(root), false);
      assert.doesNotMatch(body, /PRIVATE_ROOT_WP145_|ENOENT|node:internal/u);
    }
    assert.equal(result.diagnostics.some((item) => item.code === 'DOTNETDOC_RUNNER_INPUT_FAILED'), true);
  });
}

for (const mode of ['unknown-option', 'missing-config']) {
  it(`returns a controlled CLI failure for ${mode} without raw values or stack traces`, async (context) => {
    const root = await mkdtemp(path.join(tmpdir(), 'PRIVATE_CLI_WP145_'));
    context.after(() => rm(root, { recursive: true, force: true }));
    const args = mode === 'unknown-option' ? ['--PRIVATE_OPTION_WP145'] : ['--config', path.join(root, 'PRIVATE_CONFIG_WP145.json')];
    let result;
    try { await execute(process.execPath, [cli, ...args], { cwd: root, windowsHide: true }); }
    catch (error) { result = error; }
    assert.equal(result?.code, 1);
    assert.match(result.stderr, /DotNetDoc failed/u);
    assert.doesNotMatch(result.stderr, /PRIVATE_|ENOENT|ERR_PARSE_ARGS|node:internal|file:\/\//u);
  });
}
