/**
 * @file
 * @lang zh-CN DotNetDoc 独立源码映射的真实运行器反例，检验精确声明、未知边界和关闭时的引用闭包。
 * @lang en Real-runner counterexamples for DotNetDoc source maps, covering exact declarations, unknown bounds, and disabled-reference closure.
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, access, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDotnetDocSourceMap, loadDotnetDocConfig, runDotnetDoc } from '../packages/dotnetdoc-runner/src/index.mjs';

/** @lang zh-CN 用工作区外系统临时目录装载合成源码。 @lang en Places synthetic source in an independent system temporary directory. */
async function sample() {
  const root = await mkdtemp(path.join(tmpdir(), 'dotnet-docmap-'));
  await writeFile(path.join(root, 'Sample.csproj'), '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><AssemblyName>Sample</AssemblyName><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>');
  await writeFile(path.join(root, 'Widget.cs'), 'namespace Demo;\r\npublic class Widget {\r\n    /*😀*/ public void M(){}public void N(){}\r\n}\r\n');
  await writeFile(path.join(root, 'Sample.xml'), '<doc><assembly><name>Sample</name></assembly><members><member name="M:Demo.Widget.M"><summary>M</summary></member><member name="M:Demo.Widget.N"><summary>N</summary></member></members></doc>');
  return root;
}

/** @lang zh-CN XML 只有注释出处，未设置项目时映射条目不能伪造 C# 位置。 @lang en XML alone carries documentation provenance and cannot invent a C# location. */
it('keeps XML-only source-map entries unresolved without a code source', async () => {
  const root = await sample();
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: path.join(root, 'out'), inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml' }], options: { writeDocSourceMapArtifact: true, writeSourceRelationArtifact: false } });
  const map = JSON.parse(await readFile(path.join(root, 'out', 'Sample.doc-source-map.json'), 'utf8'));
  const document = JSON.parse(await readFile(path.join(root, 'out', 'Sample.hia.json'), 'utf8'));
  assert.equal(map.contractVersion, '1.1.0');
  assert.equal(map.entries.length, 2);
  assert.ok(map.entries.every(entry => entry.sourceRefs.length === 0));
  assert.deepEqual(map.sources, []);
  assert.equal(document.metadata.docSourceMaps[0].contractVersion, map.contractVersion);
  assert.equal(result.artifacts.find(artifact => artifact.kind === 'doc-source-map')?.contractVersion, map.contractVersion);
  assert.equal(JSON.stringify(map).includes('Sample.xml'), false);
});

/** @lang zh-CN 显式项目绑定应在 relation 关闭时仍产生真实声明的半开 UTF-16 位置。 @lang en Explicit project binding still yields real exclusive UTF-16 declarations when relation emission is disabled. */
it('links exact XML declarations to adjacent Roslyn ranges without relation output', async () => {
  const root = await sample();
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: path.join(root, 'out'), inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml', projectPath: 'Sample.csproj' }], options: { writeDocSourceMapArtifact: true, writeSourceRelationArtifact: false } });
  const map = JSON.parse(await readFile(path.join(root, 'out', 'Sample.doc-source-map.json'), 'utf8'));
  const entries = map.entries;
  assert.equal(entries.length, 2);
  assert.ok(entries.every(entry => entry.sourceRefs.length === 1));
  assert.equal(entries[0].sourceRefs[0].range.end.column, entries[1].sourceRefs[0].range.start.column);
  assert.deepEqual(entries[0].sourceRefs[0].rangeConvention, { endBoundary: 'exclusive', columnUnit: 'utf16-code-unit' });
  assert.equal(entries[0].sourceRefs[0].range.start.column, 12);
  assert.equal(map.sources[0].path, 'Widget.cs');
  assert.equal(map.sources[0].sourcesContentPolicy, 'none');
  assert.equal(result.artifacts.some(artifact => artifact.kind === 'dotnetdoc-source-relation'), false);
  assert.equal(JSON.stringify(map).includes('😀'), false);
});

/** @lang zh-CN 关闭映射后无文件、结果项或 HIA 元数据悬空引用。 @lang en Disabling maps leaves no file, result item, or dangling HIA metadata reference. */
it('does not emit a map or reference when the explicit option is disabled', async () => {
  const root = await sample();
  const out = path.join(root, 'off');
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml' }], options: { writeDocSourceMapArtifact: false } });
  const document = JSON.parse(await readFile(path.join(out, 'Sample.hia.json'), 'utf8'));
  assert.equal(result.artifacts.some(artifact => artifact.kind === 'doc-source-map'), false);
  assert.equal(document.metadata.docSourceMaps, undefined);
  await assert.rejects(access(path.join(out, 'Sample.doc-source-map.json')), { code: 'ENOENT' });
});

/** @lang zh-CN 默认关闭时已解析 HIA 文档也保持既有元数据形状。 @lang en A resolved HIA document retains its prior metadata shape while map emission is disabled. */
it('keeps resolved HIA metadata unchanged when map emission is off', async () => {
  const root = await sample();
  const out = path.join(root, 'off-resolved');
  await runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml', projectPath: 'Sample.csproj' }], options: { writeDocSourceMapArtifact: false, writeSourceRelationArtifact: false } });
  const document = JSON.parse(await readFile(path.join(out, 'Sample.hia.json'), 'utf8'));
  assert.equal(document.metadata.docSourceMaps, undefined);
  assert.equal(document.symbols[0].metadata.dotnetdoc.sourceLocationResolution.status, 'resolved');
  assert.equal(document.symbols[0].metadata.dotnetdoc.sourceLocationResolution.sourceRangeSource, undefined);
  assert.equal(document.symbols[0].metadata.dotnetdoc.sourceLocationResolution.sourceHasErrors, undefined);
});

/** @lang zh-CN 两个输入映射到同一输出基名须提前拒绝，避免后者覆盖前者身份。 @lang en Duplicate output bases must fail before one input overwrites another's identity. */
it('rejects duplicate output artifact bases before writing', async () => {
  const root = await sample();
  await assert.rejects(runDotnetDoc({ workspaceRoot: root, outputDirectory: path.join(root, 'collision'), inputs: [
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/Sample' },
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/Sample' }
  ], options: { writeDocSourceMapArtifact: true } }), /duplicate|collision|same output/iu);
  await assert.rejects(runDotnetDoc({ workspaceRoot: root, outputDirectory: path.join(root, 'normalized-collision'), inputs: [
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/Sample' },
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/./Sample' }
  ], options: { writeDocSourceMapArtifact: true } }), /duplicate|collision|same output/iu);
  await assert.rejects(runDotnetDoc({ workspaceRoot: root, outputDirectory: path.join(root, 'case-collision'), inputs: [
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'API/Sample' },
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/sample' }
  ], options: { writeDocSourceMapArtifact: true } }), /duplicate|collision|same output/iu);
  await assert.rejects(runDotnetDoc({ workspaceRoot: root, outputDirectory: path.join(root, 'traversal'), inputs: [
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/../Sample' }
  ], options: { writeDocSourceMapArtifact: true } }), /safe relative path/iu);
});

/** @lang zh-CN 原生 C# 抽取用相同成员身份与实际 Roslyn 源范围，不经 XML 反向推断。 @lang en Native C# extraction uses matching member identities and actual Roslyn source ranges without XML inference. */
it('emits native C# members with exact map references', async () => {
  const root = await sample();
  const out = path.join(root, 'csharp');
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [{ kind: 'dotnet-csharp-source', path: 'Widget.cs', projectPath: 'Sample.csproj' }], options: { writeDocSourceMapArtifact: true } });
  const map = JSON.parse(await readFile(path.join(out, 'Widget.doc-source-map.json'), 'utf8'));
  assert.ok(map.entries.length >= 3);
  assert.ok(map.entries.every(entry => entry.sourceRefs.length === 1));
  assert.ok(map.entries.every(entry => entry.sourceRefs[0].rangeConvention.columnUnit === 'utf16-code-unit'));
  assert.equal(result.artifacts.find(artifact => artifact.kind === 'doc-source-map')?.contractVersion, '1.1.0');
});

/** @lang zh-CN Roslyn 错误恢复的声明范围不得沿用有效源码的精确约定。 @lang en Roslyn error-recovery ranges cannot inherit precision proven for valid source. */
it('marks recovered C# ranges unknown and keeps their code facts separate', async () => {
  const root = await sample();
  await writeFile(path.join(root, 'Broken.cs'), 'public class C { public void M( }');
  const out = path.join(root, 'broken');
  await runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [{ kind: 'dotnet-csharp-source', path: 'Broken.cs' }], options: { writeDocSourceMapArtifact: true } });
  const map = JSON.parse(await readFile(path.join(out, 'Broken.doc-source-map.json'), 'utf8'));
  assert.ok(map.entries.some(entry => entry.sourceRefs.length === 1));
  assert.ok(map.entries.flatMap(entry => entry.sourceRefs).every(ref => ref.rangeConvention.endBoundary === 'unknown' && ref.rangeConvention.columnUnit === 'unknown' && ref.confidence === 'low'));
});

/** @lang zh-CN 外来身份、任意诊断正文与绝对路径不得进入可公开的 map。 @lang en Foreign identities, arbitrary diagnostics, and absolute paths cannot enter the public-safe map. */
it('does not promote foreign range labels or copy arbitrary producer data', () => {
  const record = {
    artifactPath: 'api/Sample.dotnetdoc.json', hiaPath: 'api/Sample.hia.json',
    artifact: { contract: 'dotnetdoc-xml-doc-extraction', contractVersion: '0.1.0-draft', producer: { name: 'C:/Private/producer' }, members: [{ id: 'dotnet:m' }] },
    hiaDocument: { symbols: [{ id: 'dotnet:m', kind: 'dotnet-method', source: { definedIn: { relativePath: 'src/A.cs', language: 'csharp', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } } } }, metadata: { dotnetdoc: { sourceLocationResolution: { status: 'resolved', sourceRangeSource: 'foreign', sourceHasErrors: false }, remarks: 'SECRET_COMMENT_SENTINEL' } } }] }
  };
  const map = createDotnetDocSourceMap({ record, verifiedSourcePaths: new Set(['src/A.cs']), producerVersion: '0.1.12' });
  assert.deepEqual(map.entries[0].sourceRefs, []);
  assert.equal(JSON.stringify(map).includes('Private'), false);
  assert.equal(JSON.stringify(map).includes('SECRET_COMMENT_SENTINEL'), false);
});

/** @lang zh-CN 零长与缺列即使自报 Roslyn 也不能冒充已证精确范围。 @lang en Zero-length and columnless ranges cannot claim proven precision even when labeled Roslyn. */
it('keeps zero-length and missing-column ranges explicitly unknown', () => {
  const cases = [
    { start: { line: 2, column: 5 }, end: { line: 2, column: 5 } },
    { start: { line: 2 }, end: { line: 3 } }
  ];
  for (const range of cases) {
    const record = {
      artifactPath: 'api/Sample.dotnetdoc.json', hiaPath: 'api/Sample.hia.json',
      artifact: { contract: 'dotnetdoc-xml-doc-extraction', contractVersion: '0.1.0-draft', members: [{ id: 'dotnet:m', memberName: 'M:Demo.Widget.Run' }] },
      hiaDocument: { symbols: [{ id: 'dotnet:m', kind: 'dotnet-method', source: { definedIn: { relativePath: 'src/A.cs', language: 'csharp', range } }, metadata: { dotnetdoc: { memberName: 'M:Demo.Widget.Run', sourceLocationResolution: { status: 'resolved', sourceRangeSource: 'roslyn-syntax', sourceHasErrors: false } } } }] }
    };
    const map = createDotnetDocSourceMap({ record, verifiedSourcePaths: new Set(['src/A.cs']), producerVersion: '0.1.12' });
    assert.deepEqual(map.entries[0].sourceRefs[0].rangeConvention, { endBoundary: 'unknown', columnUnit: 'unknown' });
    assert.equal(map.entries[0].sourceRefs[0].confidence, 'low');
  }
});

/** @lang zh-CN 配置只接受显式 opt-in 并继续使用旧版配置 schema 身份。 @lang en Configuration accepts the explicit opt-in while retaining the existing config schema identity. */
it('loads the opt-in from configuration without changing its schema version', async () => {
  const root = await sample();
  const configPath = path.join(root, 'dotnetdoc.config.json');
  await writeFile(configPath, JSON.stringify({ schemaVersion: '0.1.0-draft', workspaceRoot: '.', outputDirectory: 'out', inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml' }], options: { writeDocSourceMapArtifact: true } }));
  const config = await loadDotnetDocConfig(configPath);
  assert.equal(config.options.writeDocSourceMapArtifact, true);
});

/** @lang zh-CN 不同输出路径的同名成员仍保持映射、条目及结果工件身份分离。 @lang en Identical member names under different output paths retain distinct map, entry, and result artifact identities. */
it('keeps multi-input map and artifact identities collision-free', async () => {
  const root = await sample();
  const out = path.join(root, 'multi');
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/A-B' },
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/A/B' }
  ], options: { writeDocSourceMapArtifact: true, writeSourceRelationArtifact: false } });
  const left = JSON.parse(await readFile(path.join(out, 'api/A-B.doc-source-map.json'), 'utf8'));
  const right = JSON.parse(await readFile(path.join(out, 'api/A/B.doc-source-map.json'), 'utf8'));
  assert.notEqual(left.id, right.id);
  assert.notEqual(left.entries[0].id, right.entries[0].id);
  assert.equal(new Set(result.artifacts.filter(item => item.kind === 'doc-source-map').map(item => item.id)).size, 2);
  assert.equal(new Set(result.artifacts.map(item => item.id)).size, result.artifacts.length);
});

/** @lang zh-CN symlink 越根时不能借真实外部路径输出代码位置或正文。 @lang en An escaping symlink cannot yield a code location or body from the real external path. */
it('does not publish an escaping symlink as a code source', async context => {
  const root = await sample();
  const outside = await mkdtemp(path.join(tmpdir(), 'dotnet-docmap-outside-'));
  await writeFile(path.join(outside, 'Private.cs'), 'public class Secret { public void Leak(){} }');
  try { await symlink(path.join(outside, 'Private.cs'), path.join(root, 'Link.cs'), 'file'); }
  catch (error) { if (error.code === 'EPERM') { context.skip('Windows symlink privilege unavailable'); return; } throw error; }
  const out = path.join(root, 'link');
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [{ kind: 'dotnet-csharp-source', path: 'Link.cs' }], options: { writeDocSourceMapArtifact: true } });
  const maps = result.artifacts.filter(item => item.kind === 'doc-source-map');
  for (const item of maps) {
    const map = JSON.parse(await readFile(path.join(out, item.path), 'utf8'));
    assert.ok(map.entries.every(entry => entry.sourceRefs.length === 0));
    assert.equal(JSON.stringify(map).includes('Private.cs'), false);
    assert.equal(JSON.stringify(map).includes('Leak'), false);
  }
});

/** @lang zh-CN NTFS 备用数据流不是目录条目，不能作为可公开代码源路径。 @lang en An NTFS alternate data stream is not a directory entry and cannot become a publishable code source path. */
it('keeps XML members while rejecting an ADS compile item as a code reference', async context => {
  if (process.platform !== 'win32') { context.skip('NTFS ADS reproduction requires Windows'); return; }
  const root = await sample();
  await writeFile(path.join(root, 'Host'), '');
  await writeFile(path.join(root, 'Host:stream.cs'), await readFile(path.join(root, 'Widget.cs')));
  await writeFile(path.join(root, 'Sample.csproj'), '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><AssemblyName>Sample</AssemblyName><TargetFramework>net8.0</TargetFramework><EnableDefaultCompileItems>false</EnableDefaultCompileItems></PropertyGroup><ItemGroup><Compile Include="Host:stream.cs" /></ItemGroup></Project>');
  const out = path.join(root, 'ads-source');
  await runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml', projectPath: 'Sample.csproj' }], options: { writeDocSourceMapArtifact: true, writeSourceRelationArtifact: false } });
  const map = JSON.parse(await readFile(path.join(out, 'Sample.doc-source-map.json'), 'utf8'));
  const document = JSON.parse(await readFile(path.join(out, 'Sample.hia.json'), 'utf8'));
  assert.equal(document.symbols.length, 2);
  assert.ok(map.entries.every(entry => entry.sourceRefs.length === 0));
  assert.deepEqual(map.sources, []);
});

/** @lang zh-CN 输出基名的任意路径片段出现冒号时须在写入前拒绝 NTFS ADS。 @lang en A colon in any output-base path segment must be rejected before writing an NTFS ADS. */
it('rejects an ADS output artifact path before writing a hidden stream', async context => {
  if (process.platform !== 'win32') { context.skip('NTFS ADS reproduction requires Windows'); return; }
  const root = await sample();
  const out = path.join(root, 'ads-output');
  await mkdir(path.join(out, 'api'), { recursive: true });
  await writeFile(path.join(out, 'api', 'Host'), '');
  await assert.rejects(runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/Host:stream' }], options: { writeDocSourceMapArtifact: true } }), /safe relative path|unsafe.*path|alternate data stream/iu);
  await assert.rejects(access(path.join(out, 'api', 'Host:stream.hia.json')), { code: 'ENOENT' });
});

/** @lang zh-CN 纯 writer 独立拒绝 ADS 源与工件路径，不能依赖 runner 的调用顺序。 @lang en The pure writer independently rejects ADS source and artifact paths instead of relying on runner call order. */
it('rejects ADS paths inside the pure map writer', () => {
  const record = {
    artifactPath: 'api/Sample.dotnetdoc.json', hiaPath: 'api/Sample.hia.json',
    artifact: { contract: 'dotnetdoc-xml-doc-extraction', contractVersion: '0.1.0-draft', members: [{ id: 'dotnet:m', memberName: 'M:Demo.Widget.Run' }] },
    hiaDocument: { symbols: [{ id: 'dotnet:m', kind: 'dotnet-method', source: { definedIn: { relativePath: 'api/Host:stream.cs', language: 'csharp', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } } } }, metadata: { dotnetdoc: { memberName: 'M:Demo.Widget.Run', sourceLocationResolution: { status: 'resolved', sourceRangeSource: 'roslyn-syntax', sourceHasErrors: false } } } }] }
  };
  const map = createDotnetDocSourceMap({ record, verifiedSourcePaths: new Set(['api/Host:stream.cs']), producerVersion: '0.1.12' });
  assert.equal(map.entries.length, 1);
  assert.deepEqual(map.entries[0].sourceRefs, []);
  assert.deepEqual(map.sources, []);
  assert.throws(() => createDotnetDocSourceMap({ record: { ...record, artifactPath: 'api/Host:shadow.dotnetdoc.json' }, verifiedSourcePaths: new Set(), producerVersion: '0.1.12' }), /unsafe.*path/iu);
});

/** @lang zh-CN 多输入中第二个输出名含孤立代理项时，首个输入也不能先落盘。 @lang en An unpaired surrogate in the second output identity must fail before the first input writes anything. */
it('preflights every map output identity before multi-input writes', async () => {
  const root = await sample();
  const out = path.join(root, 'surrogate-output');
  await assert.rejects(runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/Safe' },
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: `api/${'\uD800'}` }
  ], options: { writeDocSourceMapArtifact: true } }), { name: 'TypeError', message: /safe relative path|well-formed/iu });
  await assert.rejects(access(path.join(out, 'api', 'Safe.hia.json')), { code: 'ENOENT' });
});

/** @lang zh-CN 纯函数不可让无效 UTF-16 路径进入原生 URIError 或源引用。 @lang en The pure writer must not turn invalid UTF-16 paths into raw URIError or source references. */
it('rejects unpaired UTF-16 surrogate paths in the pure writer', () => {
  const sourcePath = `src/${'\uD800'}.cs`;
  const record = {
    artifactPath: 'api/Sample.dotnetdoc.json', hiaPath: 'api/Sample.hia.json',
    artifact: { contract: 'dotnetdoc-xml-doc-extraction', contractVersion: '0.1.0-draft', members: [{ id: 'dotnet:m', memberName: 'M:Demo.Widget.Run' }] },
    hiaDocument: { symbols: [{ id: 'dotnet:m', kind: 'dotnet-method', source: { definedIn: { relativePath: sourcePath, language: 'csharp', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } } } }, metadata: { dotnetdoc: { memberName: 'M:Demo.Widget.Run', sourceLocationResolution: { status: 'resolved', sourceRangeSource: 'roslyn-syntax', sourceHasErrors: false } } } }] }
  };
  const map = createDotnetDocSourceMap({ record, verifiedSourcePaths: new Set([sourcePath]), producerVersion: '0.1.12' });
  assert.deepEqual(map.sources, []);
  assert.deepEqual(map.entries[0].sourceRefs, []);
  assert.throws(() => createDotnetDocSourceMap({ record: { ...record, artifactPath: `api/${'\uD800'}.dotnetdoc.json` }, verifiedSourcePaths: new Set(), producerVersion: '0.1.12' }), { name: 'TypeError', message: /unsafe.*path/iu });
  assert.throws(() => createDotnetDocSourceMap({ record: { ...record, hiaPath: `api/${'\uD800'}.hia.json` }, verifiedSourcePaths: new Set(), producerVersion: '0.1.12' }), { name: 'TypeError', message: /unsafe.*path/iu });
});

/** @lang zh-CN 地图写入受阻只产生可控 partial，原始 HIA 文档不留下悬空地图声明。 @lang en A blocked map write yields a controlled partial result without a dangling HIA map declaration. */
it('returns a partial result without a dangling reference when map emission fails', async () => {
  const root = await sample();
  const out = path.join(root, 'blocked-map');
  await mkdir(path.join(out, 'api', 'Sample.doc-source-map.json'), { recursive: true });
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [
    { kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/Sample' }
  ], options: { writeDocSourceMapArtifact: true, writeSourceRelationArtifact: false } });
  const document = JSON.parse(await readFile(path.join(out, 'api', 'Sample.hia.json'), 'utf8'));
  assert.equal(result.status, 'partial');
  assert.ok(result.diagnostics.some(item => item.code === 'DOTNETDOC_RUNNER_SOURCE_MAP_FAILED'));
  assert.equal(result.artifacts.some(item => item.kind === 'doc-source-map'), false);
  assert.equal(document.metadata.docSourceMaps, undefined);
});
