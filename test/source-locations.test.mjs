/** @file @lang zh-CN 文档出处和代码定义的隔离与精确定位反例。 @lang en Isolation and exact-location counterexamples for documentation origins versus code definitions. */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractDotnetXmlDocs } from '../packages/dotnet-xml-doc-extractor/src/index.mjs';
import { dotnetXmlDocsToHiaDocument } from '../packages/dotnetdoc-adapter/src/index.mjs';
import { runDotnetDoc } from '../packages/dotnetdoc-runner/src/index.mjs';
import { selectExactDeclaration } from '../packages/dotnetdoc-runner/src/source-locations.mjs';
import { symlink } from 'node:fs/promises';

/** @lang zh-CN 纯合成编译器XML，覆盖完整注释主体。 @lang en Synthetic compiler XML covering the complete documentation body. */
const XML = '<doc><assembly><name>Sample</name></assembly><members><member name="M:Demo.Widget.Run(System.Int32)"><summary>Summary</summary><remarks>Remarks</remarks><param name="id">Parameter</param><returns>Result</returns><exception cref="T:System.Exception">Failure</exception></member></members></doc>';

it('keeps XML provenance without publishing it as a code definition', () => {
  const extraction = extractDotnetXmlDocs(XML, { path: 'bin/Sample.xml' });
  const document = dotnetXmlDocsToHiaDocument(extraction);
  assert.equal(extraction.members[0].source.path, 'bin/Sample.xml');
  assert.equal(document.symbols[0].source, undefined);
  assert.equal(document.symbols[0].metadata.dotnetdoc.documentationSource.path, 'bin/Sample.xml');
  assert.equal(document.symbols[0].metadata.dotnetdoc.remarks, 'Remarks');
  assert.equal(document.symbols[0].metadata.dotnetdoc.returns, 'Result');
  assert.equal(document.symbols[0].metadata.dotnetdoc.parameters[0].summary, 'Parameter');
  assert.equal(document.symbols[0].metadata.dotnetdoc.exceptions[0].summary, 'Failure');
});

it('keeps unresolved warnings within the producer diagnostic wire contract', async () => {
  // <lang><zh-CN>没有源码项目的XML必然未定位；警告必须可被严格生产器消费者接受。</zh-CN><en>An XML input without source projects remains unresolved; its warning must be accepted by strict producer consumers.</en></lang>
  const root = await mkdtemp(path.join(tmpdir(), 'dotnet-source-warning-'));
  await writeFile(path.join(root, 'Sample.xml'), XML);
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: path.join(root, 'out'), inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml' }] });
  const warning = result.diagnostics.find(item => item.code === 'DOTNETDOC_SOURCE_LOCATION_UNRESOLVED');
  assert.ok(warning);
  assert.deepEqual(Object.keys(warning).sort(), ['code', 'message', 'metadata', 'severity', 'source']);
  assert.equal(warning.metadata.missing, 1);
});

it('accepts a real bounded C# declaration while keeping its XML documentation origin', () => {
  const extraction = extractDotnetXmlDocs(XML, { path: 'bin/Sample.xml' });
  extraction.members[0].source = { path: 'src/Widget.cs', language: 'csharp', range: { start: { line: 4, column: 1 }, end: { line: 8, column: 2 } }, rangeSource: 'roslyn-syntax' };
  const document = dotnetXmlDocsToHiaDocument(extraction);
  assert.equal(document.symbols[0].source.definedIn.relativePath, 'src/Widget.cs');
  assert.equal(document.symbols[0].source.definedIn.language, 'csharp');
  assert.equal(document.symbols[0].source.definedIn.position.line, 4);
  assert.equal(document.symbols[0].metadata.dotnetdoc.documentationSource.path, 'bin/Sample.xml');
});

it('retains explicit file-only C# locations without inventing a member line', () => {
  const extraction = extractDotnetXmlDocs(XML);
  extraction.members[0].source = { path: 'src/Widget.cs', language: 'csharp' };
  const source = dotnetXmlDocsToHiaDocument(extraction).symbols[0].source;
  assert.equal(source.definedIn.relativePath, 'src/Widget.cs');
  assert.equal(source.definedIn.position, undefined);
});

it('resolves configured project declarations without relation emission or duplicate source documents', async () => {
  // <lang><zh-CN>独立系统temp仅放合成数据，不触碰任何目标仓。</zh-CN><en>The independent system temp contains synthetic data only and never touches target repositories.</en></lang>
  const root = await mkdtemp(path.join(tmpdir(), 'dotnet-source-location-'));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'Sample.csproj'), '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><AssemblyName>Sample</AssemblyName><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>');
  await writeFile(path.join(root, 'src/Widget.cs'), 'namespace Demo;\npublic class Widget\n{\n    public string Run(int id)\n    {\n        return id.ToString();\n    }\n}\n');
  await writeFile(path.join(root, 'Sample.xml'), XML);
  const out = path.join(root, 'out');
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml', artifactBasePath: 'api/Sample' }, { kind: 'dotnet-project', path: 'Sample.csproj', artifactBasePath: 'project/Sample' }], options: { writeSourceRelationArtifact: false } });
  assert.notEqual(result.status, 'failed');
  assert.equal(result.artifacts.length, 4);
  const document = JSON.parse(await readFile(path.join(out, 'api/Sample.hia.json'), 'utf8'));
  assert.equal(document.symbols.length, 1);
  assert.equal(document.symbols[0].source.definedIn.relativePath, 'src/Widget.cs');
  assert.equal(document.symbols[0].source.definedIn.position.line, 4);
  assert.equal(document.symbols[0].source.definedIn.range.end.line, 7);
  assert.equal(document.symbols[0].metadata.dotnetdoc.remarks, 'Remarks');
  assert.equal(document.metadata.sourceLocationResolution.resolved, 1);
  // <lang><zh-CN>纯XML输入也可利用既有projectPath显式绑定；不要求生成额外project/C#文档。</zh-CN><en>An XML-only input can use the existing projectPath for explicit binding without additional project/C# documents.</en></lang>
  const explicitOut = path.join(root, 'explicit');
  const explicitResult = await runDotnetDoc({ workspaceRoot: root, outputDirectory: explicitOut, inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml', projectPath: 'Sample.csproj' }], options: { writeSourceRelationArtifact: false } });
  assert.equal(explicitResult.artifacts.length, 2);
  assert.equal(JSON.parse(await readFile(path.join(explicitOut, 'Sample.hia.json'), 'utf8')).symbols[0].source.definedIn.relativePath, 'src/Widget.cs');
});

/** @lang zh-CN 生成不含正文的声明候选。 @lang en Creates a declaration candidate without source bodies. */
function candidate(assembly = 'Sample', file = 'src/A.cs', id = 'M:Demo.Widget.Run(System.Int32)') {
  return { assembly, member: { semantic: { documentationCommentId: id }, source: { path: file, range: { start: { line: 2 }, end: { line: 4 } } } } };
}
it('matches complete overload identities rather than names or arity', () => {
  const one = candidate();
  assert.equal(selectExactDeclaration({ memberName: one.member.semantic.documentationCommentId }, [candidate('Sample', 'src/B.cs', 'M:Demo.Widget.Run(System.String)'), one], 'Sample').declaration, one.member);
});
it('isolates equal member identities belonging to different assemblies', () => {
  const one = candidate();
  assert.equal(selectExactDeclaration({ memberName: one.member.semantic.documentationCommentId }, [candidate('Other')], 'Sample').status, 'missing');
  assert.equal(selectExactDeclaration({ memberName: one.member.semantic.documentationCommentId }, [candidate('Other'), one], 'Sample').declaration, one.member);
});
it('refuses ambiguous partial locations and duplicate registrations at one location', () => {
  const one = candidate();
  const member = { memberName: one.member.semantic.documentationCommentId };
  assert.equal(selectExactDeclaration(member, [one, candidate('Sample', 'src/B.cs')], 'Sample').status, 'ambiguous');
  assert.equal(selectExactDeclaration(member, [one, candidate()], 'Sample').status, 'ambiguous');
});
it('does not upgrade syntax-only fallback identities as semantic matches', () => {
  assert.equal(selectExactDeclaration({ memberName: 'M:Demo.Widget.Run(System.Int32)' }, [{ assembly: 'Sample', member: { memberName: 'M:Demo.Widget.Run(System.Int32)' } }], 'Sample').status, 'missing');
});
for (const invalid of [
  { path: '../outside.cs' }, { path: 'C:/private.cs' }, { path: 'https://example.test/private.cs' }, { path: 'bin/Sample.xml' },
  { path: 'src/A.cs', rangeSource: 'compiler-xml-doc' },
  { path: 'src/A.cs', range: { start: { line: 0 } } },
  { path: 'src/A.cs', range: { start: { line: 5 }, end: { line: 4 } } },
  { path: 'src/A.cs', range: { start: { line: 1, column: 0 } } },
  { path: 'src/A.cs', range: { start: { line: 1, column: 5 }, end: { line: 1, column: 2 } } }
]) {
  it(`rejects unsafe/non-code locators ${JSON.stringify(invalid)}`, () => {
    const extraction = extractDotnetXmlDocs(XML);
    extraction.members[0].source = invalid;
    assert.equal(dotnetXmlDocsToHiaDocument(extraction).symbols[0].source, undefined);
  });
}
it('does not follow a compile item symlink outside the selected workspace', async context => {
  const root = await mkdtemp(path.join(tmpdir(), 'dotnet-source-boundary-'));
  const outside = await mkdtemp(path.join(tmpdir(), 'dotnet-source-outside-'));
  await writeFile(path.join(outside, 'Secret.cs'), 'namespace Demo; public class Widget { public string Run(int id) => "PRIVATE_SENTINEL"; }');
  try { await symlink(path.join(outside, 'Secret.cs'), path.join(root, 'Widget.cs'), 'file'); }
  catch (error) { if (error.code === 'EPERM') { context.skip('Windows symlink privilege unavailable'); return; } throw error; }
  await writeFile(path.join(root, 'Sample.csproj'), '<Project><PropertyGroup><AssemblyName>Sample</AssemblyName></PropertyGroup><ItemGroup><Compile Include="Widget.cs" /></ItemGroup></Project>');
  await writeFile(path.join(root, 'Sample.xml'), XML);
  const out = path.join(root, 'out');
  const result = await runDotnetDoc({ workspaceRoot: root, outputDirectory: out, inputs: [{ kind: 'dotnet-xml-doc', path: 'Sample.xml', projectPath: 'Sample.csproj' }] });
  const document = JSON.parse(await readFile(path.join(out, 'Sample.hia.json'), 'utf8'));
  assert.equal(document.symbols[0].source, undefined);
  assert.ok(result.diagnostics.some(diagnostic => diagnostic.code === 'DOTNETDOC_SOURCE_LOCATION_UNRESOLVED'));
  assert.ok(!JSON.stringify(document).includes('PRIVATE_SENTINEL'));
});
