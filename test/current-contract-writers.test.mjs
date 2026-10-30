/** @file 真实七写者、新旧adapter与版本化schema/profile联动，不以常量替换代替生成链验证。 @lang en Exercises seven actual writers, dual-generation adapters and versioned schemas/profiles rather than substituting constant edits for generation-chain verification. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, it } from 'node:test';
import { DOTNETDOC_ARTIFACT_CONTRACTS, getDotnetDocArtifactSchema, readDotnetDocArtifact } from '../packages/dotnetdoc-spec/src/index.mjs';
import { dotnetXmlDocsToHiaDocument, dotnetAspNetEndpointsToHiaDocument, dotnetMarkupCommentsToHiaDocument, dotnetProjectDiscoveryToHiaDocument } from '../packages/dotnetdoc-adapter/src/index.mjs';
import { classifyDotnetBuildDiagnostics, runDotnetDoc } from '../packages/dotnetdoc-runner/src/index.mjs';
import { dotnetdocProducerDescriptor } from '../packages/dotnetdoc-producer/src/index.mjs';

/** 自有fixture根，不运行业务项目。 @lang en Owned fixture root, without business-project execution. */
const root = fileURLToPath(new URL('../', import.meta.url));
/** 单次真实运行的临时输出，不复用旧产物。 @lang en Temporary output for one actual run, without reusing legacy output. */
let output;
/** 当前生成链结果按精确合同索引，供每个独立断言复核。 @lang en Actual current-generation results indexed by exact contract for individual assertions. */
const artifacts = new Map();
before(async () => {
  output = await mkdtemp(path.join(tmpdir(), 'dotnetdoc-current-contracts-'));
  // <lang><zh-CN>五输入覆盖六种领域产物；XML/C#配对产生真实源码关系，源码地图仍独立1.1.0。</zh-CN><en>Five inputs cover six domain artifacts; actual XML/C# pairing creates relations while source maps remain independently at 1.1.0.</en></lang>
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: output, inputs: [
    { kind: 'dotnet-xml-doc', path: 'fixtures/xml-doc/Portal.Components.xml', artifactBasePath: 'xml' },
    { kind: 'dotnet-csharp-source', path: 'fixtures/source/Portal.Components/Navigation/PortalMenu.cs', artifactBasePath: 'csharp' },
    { kind: 'dotnet-aspnet-surface', paths: ['fixtures/source/Portal.Web/Default.aspx', 'fixtures/source/Portal.Web/Controllers/BooksController.cs'], artifactBasePath: 'endpoints' },
    { kind: 'dotnet-markup-comments', path: 'fixtures/source/Portal.Web/Default.aspx', artifactBasePath: 'markup' },
    { kind: 'dotnet-project', path: 'fixtures/source/Portal.sln', artifactBasePath: 'project' }
  ], options: { writeDocSourceMapArtifact: true } });
  assert.equal(result.status, 'success');
  assert.equal(result.contractVersion, '1.0.0');
  for (const item of result.artifacts) {
    // <lang><zh-CN>读取本次实际输出的领域JSON；HIA文档和源码地图保持它们自己的合同版本。</zh-CN><en>Read domain JSON produced by this run; HIA documents and source maps keep their own contract versions.</en></lang>
    const value = JSON.parse(await readFile(path.join(output, item.path), 'utf8'));
    if (DOTNETDOC_ARTIFACT_CONTRACTS.includes(value.contract)) artifacts.set(value.contract, value);
    if (item.kind === 'doc-source-map') assert.equal(value.contractVersion, '1.1.0');
  }
  artifacts.set('dotnetdoc-build-warning-classification', classifyDotnetBuildDiagnostics(['src/Widget.cs(1,1): warning CS1591: Missing documentation']));
});
after(async () => { if (output) await rm(output, { recursive: true, force: true }); });

for (const contract of DOTNETDOC_ARTIFACT_CONTRACTS) {
  it(`emits and reads actual current ${contract} without legacy relabeling`, () => {
    const value = artifacts.get(contract);
    assert.ok(value);
    assert.equal(value.contractVersion, '1.0.0');
    assert.equal(readDotnetDocArtifact(value), value);
    assert.equal(JSON.stringify(value).includes(root), false);
  });
}

it('projects both exact generations through the public domain adapters while retaining bilingual fields', async () => {
  // <lang><zh-CN>转换只用已支持四类adapter，源码/XML共享成员投影；关系/告警保持机器产物。</zh-CN><en>Use the four supported adapters with shared XML/source member projection; relations/warnings remain machine artifacts.</en></lang>
  const adapters = {
    'dotnetdoc-xml-doc-extraction': dotnetXmlDocsToHiaDocument,
    'dotnetdoc-csharp-source-extraction': dotnetXmlDocsToHiaDocument,
    'dotnetdoc-aspnet-endpoint-extraction': dotnetAspNetEndpointsToHiaDocument,
    'dotnetdoc-markup-comment-extraction': dotnetMarkupCommentsToHiaDocument,
    'dotnetdoc-project-discovery': dotnetProjectDiscoveryToHiaDocument
  };
  for (const [contract, convert] of Object.entries(adapters)) {
    const current = artifacts.get(contract);
    const legacy = JSON.parse(await readFile(new URL(`./fixtures/legacy-contracts/${contract}-0.1.0-draft.json`, import.meta.url), 'utf8'));
    for (const value of [legacy, current]) {
      const document = convert(value, { id: `test:${contract}` });
      assert.equal(document.metadata.sourceContractVersion, value.contractVersion);
      assert.ok(document.symbols.length);
      if (contract === 'dotnetdoc-xml-doc-extraction' || contract === 'dotnetdoc-csharp-source-extraction') {
        assert.ok(document.locales.includes('en'));
        assert.ok(document.locales.includes('zh-CN'));
      }
    }
  }
});

it('keeps legacy schema models immutable and distinct from current payload evolution', async () => {
  const manifest = JSON.parse(await readFile(new URL('./fixtures/legacy-contracts/schema-manifest.json', import.meta.url), 'utf8'));
  for (const item of manifest.schemas) {
    const bytes = await readFile(new URL(`../packages/dotnetdoc-spec/src/schemas/${item.name}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
  }
  const schema = getDotnetDocArtifactSchema('dotnetdoc-xml-doc-extraction', '1.0.0');
  assert.throws(() => { schema.properties.contractVersion.const = '99.0.0'; }, TypeError);
});

it('exposes the current shared producer contract independently of domain versions', () => {
  assert.equal(dotnetdocProducerDescriptor.contract, 'documentation-producer');
  assert.equal(dotnetdocProducerDescriptor.contractVersion, '1.0.0');
  assert.equal(dotnetdocProducerDescriptor.capabilities.watch, false);
});
