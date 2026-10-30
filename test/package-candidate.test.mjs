/** @file 六包源码候选责任与分发反例；不发布或访问registry。 @lang en Six-package source-candidate responsibility and distribution regressions without publishing or registry access. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { it } from 'node:test';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

/** 六包固定责任边界，禁止用workspace根替代独立包。 @lang en Fixed six-package responsibility boundary, never substituting the workspace root for individual packages. */
const packages = ['dotnetdoc-spec', 'dotnet-xml-doc-extractor', 'dotnet-source-extractor', 'dotnetdoc-adapter', 'dotnetdoc-runner', 'dotnetdoc-producer'];
/** 中文：测试根目录来自自身模块，不依赖调用方cwd。 English: Resolve the test root from this module independently of caller cwd. */
const root = new URL('../', import.meta.url);

for (const name of packages) {
  it(`${name} has coordinated candidate metadata and permanent dependencies`, async () => {
    // <lang><zh-CN>只读真实包清单，精确版本和provenance必须同时成立。</zh-CN><en>Read the real manifest; exact versions and provenance must both hold.</en></lang>
    const manifest = JSON.parse(await readFile(new URL(`packages/${name}/package.json`, root), 'utf8'));
    assert.equal(manifest.version, '1.0.0');
    assert.equal(manifest.publishConfig.provenance, true);
    for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
      if (dependency.startsWith('@hia-doc/')) assert.equal(version, '1.0.0');
    }
  });
  it(`${name} exposes an ESM declaration and documents every runtime root export`, async () => {
    // <lang><zh-CN>运行时真实导出驱动文档/声明覆盖，不能只检查静态清单。</zh-CN><en>Actual runtime exports drive documentation/declaration coverage rather than a static inventory alone.</en></lang>
    const directory = new URL(`packages/${name}/`, root);
    const manifest = JSON.parse(await readFile(new URL('package.json', directory), 'utf8'));
    assert.equal(manifest.types, './src/index.d.mts');
    assert.deepEqual(manifest.exports['.'], { types: './src/index.d.mts', default: './src/index.mjs' });
    const declaration = await readFile(new URL('src/index.d.mts', directory), 'utf8');
    const api = await readFile(new URL('API.md', directory), 'utf8');
    const runtime = await import(new URL('src/index.mjs', directory));
    for (const key of Object.keys(runtime)) {
      assert.ok(api.includes(`\`${key}\``), `${name}: API ${key}`);
      assert.match(declaration, new RegExp(key === 'default' ? 'export default' : `\\b${key}\\b`, 'u'));
    }
    assert.match(declaration, /@lang en/u);
    assert.match(declaration, /[\p{Script=Han}]/u);
    assert.doesNotMatch(declaration, /\bany\b/u);
  });
  it(`${name} ships API and migration material as package files`, async () => {
    // <lang><zh-CN>包files白名单必须纳入独立责任文档，具体归档由pack门禁再核。</zh-CN><en>The files allowlist must include responsibility documents; the pack gate separately checks actual archives.</en></lang>
    const directory = new URL(`packages/${name}/`, root);
    const manifest = JSON.parse(await readFile(new URL('package.json', directory), 'utf8'));
    for (const name of ['API.md', 'MIGRATION.md']) {
      assert.ok(manifest.files.includes(name));
      const body = await readFile(new URL(name, directory), 'utf8');
      assert.match(body, /1\.0\.0/u);
      assert.match(body, /0\.1\.12/u);
      assert.match(body, /[\p{Script=Han}]/u);
    }
  });
}

it('marks source candidates separately from actual npm publication', async () => {
  // <lang><zh-CN>发行清单仅描述本地候选，不能将源码版本号当已发布证据。</zh-CN><en>The release inventory describes local candidates, never treating source versions as publication evidence.</en></lang>
  const plan = JSON.parse(await readFile(new URL('release-plan.json', root), 'utf8'));
  assert.equal(plan.version, '1.0.0');
  assert.equal(plan.status, 'local-candidate');
  assert.equal(plan.publishedToNpm, false);
  assert.deepEqual(plan.packages.map(item => item.name), packages.map(name => `@hia-doc/${name}`));
  assert.ok(fileURLToPath(root));
});

it('refuses prepublication of local candidates before contacting a registry', () => {
  // <lang><zh-CN>不可连接的registry是网络负控；必须在任何npm查询前以固定候选提示拒绝。</zh-CN><en>An unreachable registry is the network negative control; refuse with the fixed candidate message before npm lookup.</en></lang>
  const result = spawnSync(process.execPath, ['scripts/check-release-registry-status.cjs', '--prepublish', '--registry=http://127.0.0.1:1/'], { cwd: fileURLToPath(root), encoding: 'utf8', timeout: 5000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /source candidates are not publication-ready/u);
  assert.equal(result.stdout, '');
});

it('uses actual candidate package provenance independently from domain versions', async () => {
  // <lang><zh-CN>真实XML/runner/producer写者必须带新包版本，领域与地图身份分别核对。</zh-CN><en>Actual XML/runner/producer writers must carry the new package version; domain/map identities are checked separately.</en></lang>
  const xml = await import(new URL('packages/dotnet-xml-doc-extractor/src/index.mjs', root));
  const runner = await import(new URL('packages/dotnetdoc-runner/src/index.mjs', root));
  const producer = await import(new URL('packages/dotnetdoc-producer/src/index.mjs', root));
  assert.equal(xml.extractDotnetXmlDocs('<doc><members><member name="T:Sample.Widget"><summary>Widget.</summary></member></members></doc>').producer.version, '1.0.0');
  assert.equal(runner.classifyDotnetBuildDiagnostics([]).producer.version, '1.0.0');
  assert.equal(runner.DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION, '1.1.0');
  assert.equal(producer.dotnetdocProducerDescriptor.version, '1.0.0');
  assert.equal(producer.default, producer.dotnetdocProducer);
});

it('reports the candidate version from the real CLI', () => {
  // <lang><zh-CN>直接执行随包CLI入口，不通过替身或读取常量冒充运行。</zh-CN><en>Execute the shipped CLI entry directly instead of substituting a mock or merely reading a constant.</en></lang>
  const result = spawnSync(process.execPath, ['packages/dotnetdoc-runner/src/cli.mjs', '--version'], { cwd: fileURLToPath(root), encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '1.0.0');
});

it('rejects stale, duplicated or falsely ready release inventories', async () => {
  // <lang><zh-CN>使用纯清单检查器做定向反例，绝不改真实清单或执行发布。</zh-CN><en>Exercise the pure inventory validator without changing the real plan or publishing.</en></lang>
  const require = createRequire(import.meta.url);
  const { validateReleasePlan } = require('../scripts/check-release-plan.cjs');
  const { loadReleasePackages } = require('../scripts/release-packages.cjs');
  const plan = JSON.parse(await readFile(new URL('release-plan.json', root), 'utf8'));
  assert.doesNotThrow(() => validateReleasePlan(plan, loadReleasePackages()));
  assert.throws(() => validateReleasePlan(plan, loadReleasePackages(), true));
  assert.throws(() => validateReleasePlan({ ...plan, version: '0.1.12' }, loadReleasePackages()));
  assert.throws(() => validateReleasePlan({ ...plan, packages: [...plan.packages.slice(0, 5), plan.packages[0]] }, loadReleasePackages()));
  assert.throws(() => validateReleasePlan({ ...plan, publishedToNpm: true }, loadReleasePackages()));
});

it('guards the manual publisher with explicit publication readiness', async () => {
  // <lang><zh-CN>只读workflow，保护声明须早于实际npm发布语句。</zh-CN><en>Read the workflow only; the readiness guard must precede actual npm publication.</en></lang>
  const workflow = await readFile(new URL('.github/workflows/npm-trusted-publish.yml', root), 'utf8');
  assert.ok(workflow.includes('node scripts/check-release-plan.cjs --publication-ready'));
  assert.ok(workflow.indexOf('node scripts/check-release-plan.cjs --publication-ready') < workflow.indexOf('run: npm publish'));
});

it('resolves every actual release package at its candidate version without publishing', async () => {
  // <lang><zh-CN>执行真正resolver的只读JSON路径，不写GITHUB_OUTPUT或触发工作流。</zh-CN><en>Execute the real resolver's read-only JSON path without writing GITHUB_OUTPUT or triggering workflows.</en></lang>
  for (const name of packages) {
    const result = spawnSync(process.execPath, ['scripts/resolve-release-package.cjs', `@hia-doc/${name}`], { cwd: fileURLToPath(root), encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).package_version, '1.0.0');
  }
});

it('aligns the local development Node default with the qualified Node 24 patch', async () => {
  // <lang><zh-CN>本地工具默认对齐已验补丁，不改变包支持的22/24大版本边界。</zh-CN><en>Align the local default with the qualified patch without changing supported Node 22/24 major lines.</en></lang>
  const policy = await readFile(new URL('.mise.toml', root), 'utf8');
  assert.match(policy, /node = "24\.22\.1"/u);
});
