# @hia-doc/dotnetdoc-adapter

Convert DotNetDoc extraction artifacts into HIA document shapes.

将 DotNetDoc 抽取产物转换为 HIA document 形态。

## Install

```sh
npm install @hia-doc/dotnetdoc-adapter
```

## Usage

```js
import {
  dotnetMarkupCommentsToHiaDocument,
  dotnetXmlDocsToHiaDocument
} from "@hia-doc/dotnetdoc-adapter";

const document = dotnetXmlDocsToHiaDocument(artifact, {
  id: "dotnetdoc:Portal.Components",
  title: "Portal.Components API"
});

const markupDocument = dotnetMarkupCommentsToHiaDocument(markupArtifact, {
  id: "dotnetdoc:markup:Home",
  title: "Home Markup Comments"
});
```

The adapter keeps .NET member ids and source metadata while avoiding embedded
private source text.

Adapter 会保留 .NET member id、标记层注释位置和 source metadata，同时避免嵌入
私有源码正文。

## Member signatures / 成员签名

Every XML/source member symbol includes a display-only `signature`. Explicit member
signatures take precedence over Roslyn declarations, followed by conservative C#
documentation-ID formatting. Roslyn declarations include parameter names, return
types, generic parameters and modifiers. Signatures contain no method bodies.

每个XML/源码成员符号均提供显示用`signature`。显式签名优先，其次是Roslyn精确声明，最后是
文档ID可证明的信息。普通编译器XML文档ID不包含返回类型，也不能区分`ref`/`out`/`in`；
未知返回类型会显示`/* return type unavailable */`，by-ref保留为`&`，不猜测`void`或参数名。

`metadata.dotnetdoc.signature` reports `source` (`provided`, `roslyn-declaration`,
or `documentation-id`) and `missingInformation`. When the runner processes XML
and source together, only a unique identical documentation ID enriches the XML
HIA artifact with a Roslyn declaration. Ambiguous/fallback matches do not upgrade
signature precision; relation-file emission can remain disabled.

元数据保留签名来源和缺失信息。需要完整返回类型和参数名时，请向runner同时提供对应C#源码，
或直接消费Roslyn派生HIA工件；单独XML输入无法恢复没有记录的信息。附加本地化注释字段保持原样。

## License

MIT.

## Code source locations

Compiler XML paths are documentation origins. They stay in extraction `member.source`
and HIA `metadata.dotnetdoc.documentationSource`; they are not exposed as code definitions.
For real C# locations, use a configured `dotnet-project` solution/project input or set
`projectPath` on an XML input. The runner reuses its Roslyn extractor and requires a
unique assembly and complete documentation-comment ID match. It does not add duplicate
C# documentation pages and works with `writeSourceRelationArtifact: false`.

Unresolved or ambiguous members have no code locator. Partial declarations, missing
references, unavailable .NET tooling and sources outside the workspace are never repaired
by choosing an arbitrary filename. Extraction reads configured source only; it does not
execute the target build, download source, parse Windows/Portable PDBs or grant publication
permission. Existing source preview settings still require explicit publication consent.

中文：XML是文档出处；代码定位来自已配置项目中的唯一真实Roslyn声明。缺失/歧义保持未定位，
不会回退XML或按名称猜文件。需要现有.NET 8 SDK/helper；本轮不实现PDB读取，尤其不能把传统
Windows PDB当作Portable PDB。范围与语言随真实声明输出，所有XML注释/本地化字段保持。
