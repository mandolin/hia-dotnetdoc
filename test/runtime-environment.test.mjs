/**
 * @file 验证工具环境为稳定.NET10，而旧项目输入继续静态读取；仅构建自有helper。
 * @lang en Verifies stable .NET 10 tooling while retaining static legacy-project intake; builds only the owned helper.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { it } from 'node:test';
import { extractDotnetProjectDiscovery, extractDotnetSourceFiles } from '../packages/dotnet-source-extractor/src/index.mjs';

/** 仓库根仅用于自有运行策略与fixture，不读取业务项目。 @lang en Repository root used only for owned runtime policies and fixtures, never business projects. */
const root = fileURLToPath(new URL('../', import.meta.url));
/** 提取包根也是dotnet子进程cwd；安装后必须携带相同SDK策略。 @lang en Extractor package root is also the dotnet child cwd and must carry the same SDK policy after installation. */
const extractorRoot = path.join(root, 'packages/dotnet-source-extractor');
/** 自有Roslyn工具目录；测试不构建输入项目。 @lang en Owned Roslyn tool directory; tests never build input projects. */
const helperRoot = path.join(extractorRoot, 'tools/DotNetDoc.RoslynSourceExtractor');

it('declares the supported Node lines for all six distributed packages', async () => {
  // <lang><zh-CN>发布包不可只依赖私有仓根的engine声明；逐包检查用户可消费的元数据。</zh-CN><en>Distributed packages cannot rely on the private workspace engine declaration; check each consumer-visible manifest.</en></lang>
  for (const name of ['dotnetdoc-spec', 'dotnet-xml-doc-extractor', 'dotnet-source-extractor', 'dotnetdoc-adapter', 'dotnetdoc-runner', 'dotnetdoc-producer']) {
    // <lang><zh-CN>每次仅读取一个自有包的清单，固定版本范围与既定两条Node线一致。</zh-CN><en>Read one owned manifest at a time and keep its range aligned with the two established Node lines.</en></lang>
    const manifest = JSON.parse(await readFile(path.join(root, 'packages', name, 'package.json'), 'utf8'));
    assert.equal(manifest.engines?.node, '^22.0.0 || ^24.0.0', name);
  }
});

it('targets the owned Roslyn helper at .NET 10 without changing the reviewed Roslyn dependency', async () => {
  // <lang><zh-CN>框架迁移与第三方版本分开校验，避免以环境升级顺带升级解析器。</zh-CN><en>Check framework migration separately from the third-party version to avoid an incidental parser upgrade.</en></lang>
  const project = await readFile(path.join(helperRoot, 'DotNetDoc.RoslynSourceExtractor.csproj'), 'utf8');
  assert.match(project, /<TargetFramework>net10\.0<\/TargetFramework>/u);
  assert.match(project, /PackageReference Include="Microsoft\.CodeAnalysis\.CSharp" Version="5\.6\.0"/u);
});

it('ships the stable .NET 10 SDK policy at the helper invocation directory', async () => {
  // <lang><zh-CN>仓库与发布包使用相同规则；禁止预览或跨主版本滚动。</zh-CN><en>The repository and published package share a policy that rejects previews and cross-major roll-forward.</en></lang>
  const repositoryPolicy = JSON.parse(await readFile(path.join(root, 'global.json'), 'utf8'));
  const packagePolicy = JSON.parse(await readFile(path.join(extractorRoot, 'global.json'), 'utf8'));
  assert.deepEqual(repositoryPolicy, { sdk: { version: '10.0.100', rollForward: 'latestFeature', allowPrerelease: false } });
  assert.deepEqual(packagePolicy, repositoryPolicy);
  // <lang><zh-CN>文件存在不等于随包交付；显式files闭包必须包含SDK策略。</zh-CN><en>Presence in the tree does not imply distribution; the explicit files closure must include the SDK policy.</en></lang>
  const manifest = JSON.parse(await readFile(path.join(extractorRoot, 'package.json'), 'utf8'));
  assert.ok(manifest.files.includes('global.json'));
});

it('runs the complete release gate on both supported operating systems and Node lines with .NET 10', async () => {
  // <lang><zh-CN>检查本仓CI既有固定矩阵格式，不引入YAML解析依赖。</zh-CN><en>Inspect this repository's fixed CI matrix shape without adding a YAML dependency.</en></lang>
  const workflow = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(workflow, /runs-on: \$\{\{ matrix\.os \}\}/u);
  assert.match(workflow, /ubuntu-24\.04/u);
  assert.match(workflow, /windows-2022/u);
  assert.match(workflow, /22\.x/u);
  assert.match(workflow, /24\.x/u);
  assert.doesNotMatch(workflow, /20\.20\.2/u);
  assert.match(workflow, /dotnet-version: 10\.0\.x/u);
  assert.match(workflow, /run: npm run release:gate/u);
});

it('uses the same .NET 10 tooling for the separately authorized publishing workflow', async () => {
  // <lang><zh-CN>这里只读workflow；测试绝不触发发布。</zh-CN><en>Read the workflow only; the test never triggers publication.</en></lang>
  const workflow = await readFile(path.join(root, '.github/workflows/npm-trusted-publish.yml'), 'utf8');
  assert.match(workflow, /dotnet-version: 10\.0\.x/u);
  assert.doesNotMatch(workflow, /dotnet-version: 8\.0\.x/u);
});

it('executes the real helper on .NET 10 and preserves bilingual C# documentation', async (context) => {
  // <lang><zh-CN>仅创建临时C#输入与失配的宿主SDK策略；helper必须使用包内策略而不是输入目录。</zh-CN><en>Create only temporary C# input and a conflicting host SDK policy; the helper must use its package policy rather than the input directory.</en></lang>
  const workspace = await mkdtemp(path.join(tmpdir(), 'dotnetdoc-runtime10-'));
  context.after(() => rm(workspace, { recursive: true, force: true }));
  await writeFile(path.join(workspace, 'global.json'), JSON.stringify({ sdk: { version: '8.0.999', rollForward: 'disable' } }));
  await writeFile(path.join(workspace, 'Legacy.cs'), 'namespace Legacy;\n/// <summary><lang><zh-CN>旧项目组件。</zh-CN><en>Legacy component.</en></lang></summary>\npublic class Widget { public int Value { get; set; } }\n');
  // <lang><zh-CN>公开API真实生成产物，验证非空语义成员与双语字段。</zh-CN><en>Generate an artifact through the public API and verify nonempty semantic members and bilingual fields.</en></lang>
  const artifact = await extractDotnetSourceFiles({ workspaceRoot: workspace, paths: ['Legacy.cs'] });
  const member = artifact.members.find((item) => item.memberName === 'T:Legacy.Widget');
  assert.ok(member);
  assert.deepEqual(artifact.locales.toSorted(), ['en', 'zh-CN']);
  assert.equal(JSON.stringify(artifact).includes(workspace), false);
  // <lang><zh-CN>执行成功后核真实runtimeconfig，防止只改源码标签却运行旧框架。</zh-CN><en>After execution inspect the actual runtimeconfig, preventing a source-only label change with an old runtime.</en></lang>
  const runtime = JSON.parse(await readFile(path.join(helperRoot, 'bin/Debug/net10.0/DotNetDoc.RoslynSourceExtractor.runtimeconfig.json'), 'utf8'));
  assert.equal(runtime.runtimeOptions.tfm, 'net10.0');
  assert.equal(runtime.runtimeOptions.framework.name, 'Microsoft.NETCore.App');
  assert.match(runtime.runtimeOptions.framework.version, /^10\.0\./u);
});

it('keeps legacy .NET 8 project metadata as read-only input rather than changing its target', async () => {
  // <lang><zh-CN>此旧框架fixture故意保留net8.0，只做静态发现，不restore或构建它。</zh-CN><en>This legacy-framework fixture intentionally retains net8.0 and is discovered statically without restoring or building it.</en></lang>
  const artifact = await extractDotnetProjectDiscovery({ workspaceRoot: root, path: 'fixtures/source/Portal.sln' });
  assert.deepEqual(artifact.projects[0].targetFrameworks, ['net8.0']);
  assert.equal(artifact.privacy.embedsSourcesContent, false);
});
