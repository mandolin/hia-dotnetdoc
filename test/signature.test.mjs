/**
 * @file
 * @lang zh-CN 验证精确信息优先与XML文档ID的保守签名投影；不得从注释猜返回类型。
 * @lang en Verifies exact-information precedence and conservative XML documentation-ID signatures, without guessing return types from prose.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { extractDotnetXmlDocs } from "../packages/dotnet-xml-doc-extractor/src/index.mjs";
import { extractDotnetSourceFiles } from "../packages/dotnet-source-extractor/src/index.mjs";
import { dotnetXmlDocsToHiaDocument } from "../packages/dotnetdoc-adapter/src/index.mjs";
import { runDotnetDoc } from "../packages/dotnetdoc-runner/src/index.mjs";

/** @lang zh-CN 创建只含公开合成成员的真实XML抽取产物。 @lang en Creates an actual XML extraction artifact containing only public synthetic members. */
function artifact(memberName) {
  return extractDotnetXmlDocs(`<doc><assembly><name>Signature.Sample</name></assembly><members><member name="${memberName}"><summary>Sample.</summary><returns>This text is documentation, never a type declaration.</returns></member></members></doc>`);
}

const cases = [
  { id: "M:Sample.Widget.Read(System.Int32,System.String)", text: "Sample.Widget.Read(int, string) /* return type unavailable */" },
  { id: "M:Sample.Widget.Read", text: "Sample.Widget.Read() /* return type unavailable */" },
  { id: "M:Sample.Widget.Read(System.Int32[0:,0:],System.String[])", text: "Sample.Widget.Read(int[,], string[]) /* return type unavailable */" },
  { id: "M:Sample.Widget.Read(System.Collections.Generic.Dictionary{System.String,System.Collections.Generic.List{System.Int32}})", text: "Sample.Widget.Read(System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<int>>) /* return type unavailable */" },
  { id: "M:Sample.Widget.Change(System.Int32@)", text: "Sample.Widget.Change(int&) /* return type unavailable */" },
  { id: "M:Sample.Widget.Pointer(System.Int32*)", text: "Sample.Widget.Pointer(int*) /* return type unavailable */" },
  { id: "M:Sample.Widget.#ctor(System.String)", text: "Sample.Widget(string)" },
  { id: "M:Sample.Widget.#cctor", text: "static Sample.Widget()" },
  { id: "M:Sample.Widget.op_Implicit(Sample.Widget)~System.String", text: "string Sample.Widget.op_Implicit(Sample.Widget)" },
  { id: "P:Sample.Widget.Item(System.Int32)", text: "Sample.Widget.Item[int] /* type unavailable */" },
  { id: "P:Sample.Widget.Name", text: "Sample.Widget.Name /* type unavailable */" },
  { id: "F:Sample.Widget.Count", text: "Sample.Widget.Count /* type unavailable */" },
  { id: "E:Sample.Widget.Changed", text: "Sample.Widget.Changed /* type unavailable */" },
  { id: "T:Sample.Widget`1", text: "Sample.Widget<T1>" },
  { id: "M:Sample.Widget.Map``1(``0,`0)", text: "Sample.Widget.Map<TMethod1>(TMethod1, TType1) /* return type unavailable */" },
  { id: "M:Sample.Widget.Sample#IReader#Read(System.String)", text: "Sample.Widget.Sample.IReader.Read(string) /* return type unavailable */" }
];

describe("DotNetDoc member signatures", () => {
  for (const example of cases) it(`preserves documentation-ID semantics: ${example.id}`, () => {
    const input = artifact(example.id);
    const original = JSON.stringify(input);
    const symbol = dotnetXmlDocsToHiaDocument(input).symbols[0];
    assert.equal(symbol.signature, example.text);
    assert.equal(symbol.metadata.dotnetdoc.signature.source, "documentation-id");
    assert.equal(JSON.stringify(input), original);
    assert.equal(symbol.signature.includes("This text"), false);
  });

  it("prefers explicit signatures and preserves text for safe renderer escaping", () => {
    const input = artifact("M:Sample.Widget.Read(System.String)");
    input.members[0].signature = "public string Read(string value) <script>";
    input.members[0].semantic = { signature: "string Read(string other)" };
    assert.equal(dotnetXmlDocsToHiaDocument(input).symbols[0].signature, input.members[0].signature);
  });

  it("consumes exact Roslyn signatures before documentation-ID fallbacks", () => {
    const input = artifact("M:Sample.Widget.Read(System.String)");
    input.members[0].semantic = { signature: "public string Sample.Widget.Read(string value)" };
    const symbol = dotnetXmlDocsToHiaDocument(input).symbols[0];
    assert.equal(symbol.signature, input.members[0].semantic.signature);
    assert.equal(symbol.metadata.dotnetdoc.signature.source, "roslyn-declaration");
  });

  it("uses explicit return type metadata without deriving it from returns prose", () => {
    const input = artifact("M:Sample.Widget.Read(System.String)");
    input.members[0].semantic = { returnType: "System.Int64" };
    assert.equal(dotnetXmlDocsToHiaDocument(input).symbols[0].signature, "long Sample.Widget.Read(string)");
  });

  it("retains distinct overload signatures", () => {
    const first = dotnetXmlDocsToHiaDocument(artifact("M:Sample.Widget.Read(System.Int32)")).symbols[0];
    const second = dotnetXmlDocsToHiaDocument(artifact("M:Sample.Widget.Read(System.String)")).symbols[0];
    assert.notEqual(first.signature, second.signature);
  });

  it("retains oversized generic indices instead of rounding them", () => {
    const input = artifact("M:Sample.Widget.Map``999(``999999999999999999999999,`999999999999999999999999)");
    const symbol = dotnetXmlDocsToHiaDocument(input).symbols[0];
    assert.equal(symbol.signature, "Sample.Widget.Map``999(``999999999999999999999999, `999999999999999999999999) /* return type unavailable */");
  });

  it("does not guess parameter names from possibly reordered XML comments", () => {
    const input = artifact("M:Sample.Widget.Read(System.Int32,System.String)");
    input.members[0].parameters = [{ name: "text", summary: "Second parameter first." }, { name: "count", summary: "First parameter second." }];
    const symbol = dotnetXmlDocsToHiaDocument(input).symbols[0];
    assert.equal(symbol.signature, "Sample.Widget.Read(int, string) /* return type unavailable */");
    assert.ok(symbol.metadata.dotnetdoc.signature.missingInformation.includes("parameterNames"));
  });

  it("extracts real Roslyn parameter names, return types and overloads", async () => {
    const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const source = await extractDotnetSourceFiles({ workspaceRoot, paths: ["fixtures/source/Signature.Sample/SignatureSample.cs"] });
    const output = dotnetXmlDocsToHiaDocument(source);
    const echoes = output.symbols.filter((symbol) => symbol.metadata.dotnetdoc.memberName.includes(".Echo("));
    assert.equal(echoes.length, 2);
    assert.ok(echoes.some((symbol) => /string .*Echo\(int count, string text = "x"\)/u.test(symbol.signature)));
    assert.ok(echoes.some((symbol) => /int .*Echo\(string text\)/u.test(symbol.signature)));
    assert.ok(output.symbols.some((symbol) => /Change\(ref int number\)/u.test(symbol.signature)));
    assert.ok(output.symbols.every((symbol) => typeof symbol.signature === "string" && symbol.signature.length > 0));
  });

  for (const duplicate of [false, true]) it(`enriches only unique exact XML declarations with relation emission disabled: duplicate=${duplicate}`, async () => {
    const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    await mkdir(path.join(workspaceRoot, "temp"), { recursive: true });
    const outputDirectory = await mkdtemp(path.join(workspaceRoot, "temp", "signature-run-"));
    const xmlPath = "fixtures/xml-doc/Portal.Components.xml";
    const source = { kind: "dotnet-csharp-source", path: "fixtures/source/Portal.Components/Navigation/PortalMenu.cs", artifactBasePath: "source" };
    const result = await runDotnetDoc({ workspaceRoot, outputDirectory, inputs: [{ kind: "dotnet-xml-doc", path: xmlPath, artifactBasePath: "xml" }, source, ...(duplicate ? [{ ...source, artifactBasePath: "duplicate" }] : [])], options: { writeSourceRelationArtifact: false } });
    assert.equal(result.status, "success");
    assert.equal(result.artifacts.some((item) => item.kind === "dotnetdoc-source-relation"), false);
    const hia = JSON.parse(await readFile(path.join(outputDirectory, "xml.hia.json"), "utf8"));
    const baseline = dotnetXmlDocsToHiaDocument(extractDotnetXmlDocs(await readFile(path.join(workspaceRoot, xmlPath), "utf8")));
    assert.deepEqual(hia.symbols.map((symbol) => symbol.i18n), baseline.symbols.map((symbol) => symbol.i18n));
    const render = hia.symbols.find((symbol) => symbol.name === "Render");
    if (duplicate) assert.equal(render.metadata.dotnetdoc.signature.source, "documentation-id");
    else assert.match(render.signature, /string .*Render\(string tenantId\)/u);
  });
});
