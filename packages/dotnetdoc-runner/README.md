# @hia-doc/dotnetdoc-runner

Standalone runner and CLI for compiler-generated .NET XML documentation files,
C# source inputs, ASP.NET endpoint surface inputs, ASP.NET/Razor markup comment
inputs and `.sln`/`.csproj` structure discovery.

DotNetDoc 独立 runner 与 CLI，支持编译器 XML documentation、C# 源码、
ASP.NET endpoint surface、ASP.NET/Razor 标记层注释，以及 `.sln`/`.csproj`
结构发现。

```sh
hia-dotnetdoc --config dotnetdoc.config.json
```

This package emits DotNetDoc extraction artifacts, HIA document artifacts,
optional source relation artifacts, ASP.NET endpoint extraction artifacts and a
documentation producer result manifest without embedding private source text.

It also exposes `classifyDotnetBuildDiagnostics()` for target scripts that need
to turn compiler XML documentation warnings such as `CS1591` into a
generated/designer/manual-source evidence summary.

它也导出 `classifyDotnetBuildDiagnostics()`，供目标项目脚本把 `CS1591` 等
编译器 XML documentation warning 分类为 generated / designer / manual source
边界 evidence。

`dotnet-markup-comments` inputs emit `dotnetdoc-markup-comment-extraction` and
matching HIA document artifacts for `.aspx`, `.ascx`, `.cshtml` and `.razor`
files.

`dotnet-markup-comments` input 会为 `.aspx`、`.ascx`、`.cshtml`、`.razor`
文件输出 `dotnetdoc-markup-comment-extraction` 与对应 HIA document。

Config inputs support the original single `path`, explicit `paths`, and
workspace-relative `glob` / `globs` patterns. Glob expansion is performed inside
the workspace and never accepts absolute paths or `..` traversal.

配置输入支持原有单个 `path`、显式 `paths`，以及工作区相对的 `glob` /
`globs`。glob 展开只在工作区内执行，不接受绝对路径或 `..` 路径穿越。

For `dotnet-csharp-source`, config inputs can also provide `projectPath` to let
the runner resolve `.cs` files from a `.csproj` before invoking the lightweight
Roslyn source extractor.

对 `dotnet-csharp-source`，配置也可以提供 `projectPath`，由 runner 先从
`.csproj` 推导源码文件集合，再调用轻量 Roslyn source extractor。

当同一请求同时包含 XML documentation 与带 `projectPath` 的 C# source 时，
`dotnetdoc-source-relation` 会携带同一 project-relative identity，并把
resolution、confidence、provenance 分开输出。relation 仍是 metadata-only：
`sourcesContentPolicy: none`，不嵌入源码正文，也不授予 source reader 能力。

```json
{
  "kind": "dotnet-csharp-source",
  "projectPath": "src/Portal.Components/Portal.Components.csproj",
  "artifactBasePath": "source/Portal.Components",
  "title": "Portal Components Source API"
}
```

```json
{
  "kind": "dotnet-markup-comments",
  "globs": ["src/Web/**/*.{aspx,ascx,master,cshtml,razor}"],
  "excludeGlobs": ["src/Web/**/bin/**", "src/Web/**/obj/**"],
  "artifactBasePath": "web/markup-comments",
  "title": "Web Markup Comments"
}
```

## Code source locations

Compiler XML paths are documentation origins. They stay in extraction `member.source`
and HIA `metadata.dotnetdoc.documentationSource`; they are not exposed as code definitions.
For real C# locations, use a configured `dotnet-project` solution/project input or set
`projectPath` on an XML input. The runner reuses its Roslyn extractor and requires a
unique assembly and complete documentation-comment ID match. It does not add duplicate
C# documentation pages and works with `writeSourceRelationArtifact: false`.

Unresolved or ambiguous members have no code locator. Conflicting declarations, missing
references, unavailable .NET tooling and sources outside the workspace are never repaired
by choosing an arbitrary filename. Extraction reads configured source only; it does not
execute the target build, download source, parse Windows/Portable PDBs or grant publication
permission. Existing source preview settings still require explicit publication consent.

中文：XML是文档出处；代码定位来自已配置项目中的唯一真实Roslyn声明。缺失/歧义保持未定位，
不会回退XML或按名称猜文件。需要现有.NET 8 SDK/helper；本轮不实现PDB读取，尤其不能把传统
Windows PDB当作Portable PDB。范围与语言随真实声明输出，所有XML注释/本地化字段保持。

### Coverage diagnostics (0.1.12)

Read `document.metadata.sourceLocationResolution` for coverage counts and reference-warning codes, and each `symbol.diagnostics` for `data.symbolId`, `memberName`, `reason` (`missing`/`ambiguous`) and detail. Proven partial types prefer a non-generated declaration, then stable path/start position; the selected rule and candidate count appear in `symbol.metadata.dotnetdoc.sourceLocationResolution`. Duplicate inputs are not silently collapsed. Re-extract artifacts after upgrading; source publication still requires the existing explicit authorization.

中文：计数在metadata层；未定位成员逐项带诊断，合法partial记录主声明选择。升级后重新抽取，不改变公开授权。
