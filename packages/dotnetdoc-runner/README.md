# @hia-doc/dotnetdoc-runner

## Configuration Compatibility

Current configuration uses `schemaVersion: "1.0.0"`; exact `0.1.0-draft`
configuration remains readable. `readDotnetDocConfig(value)` returns the original
relative config, while `loadDotnetDocConfig(path)` reads a file and resolves its
runtime directories. `migrateDotnetDocConfig(value)` explicitly creates a new
current object without materializing omitted defaults or modifying input.

New config requires nonempty `inputs` with explicit supported `kind`. Omitted
directories retain `.` / `dist/dotnetdoc`; explicit null and wrong types are
rejected. Legacy omission/null runtime behavior remains readable despite its
original schema's required-directory fields; lossy null/coercion-dependent
migrations are refused. `getDotnetDocConfigSchema(identity)` selects an exact
version or matching ID, returning `undefined` otherwise. Both schemas ship under
`@hia-doc/dotnetdoc-runner/schemas/dotnetdoc-config-<version>.schema.json`.

新旧配置精确读取，不自动改号；新版本允许目录省略但拒绝null，旧默认按原运行语义保留。
显式迁移无法无损表示时拒绝；不填默认、删字段或执行抽取来凑通过。
主SDK结果使用1.0.0，领域wire与源码地图版本独立；失败结果/CLI不回显底层路径和堆栈。

See the [compatibility guide](https://github.com/mandolin/hia-dotnetdoc/blob/main/COMPATIBILITY.md)
for all seven domain artifacts, original-schema preservation and runtime requirements.

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

## Documentation source map (opt in)

Set `options.writeDocSourceMapArtifact: true` in `dotnetdoc.config.json` to emit
an independent `doc-source-map@1.1.0` file alongside each XML or C# member
document. The default is `false`. The runner exports the pure
`createDotnetDocSourceMap()` writer from its existing package; this does not add
a separately published npm package. The result manifest and
`document.metadata.docSourceMaps` reference the emitted file and its actual
contract version only while the option is enabled.

```json
{
  "schemaVersion": "1.0.0",
  "workspaceRoot": ".",
  "outputDirectory": "dist/dotnetdoc",
  "inputs": [
    { "kind": "dotnet-xml-doc", "path": "bin/Sample.xml", "projectPath": "Sample.csproj" }
  ],
  "options": { "writeDocSourceMapArtifact": true }
}
```

Only uniquely matched XML members and native C# members with verified Roslyn
declaration ranges can carry C# source references. Valid declarations use an
exclusive end and UTF-16 code-unit columns; recovered syntax or incomplete
range precision remains explicitly unknown. XML-only inputs without a matching
project keep symbol entries with no code source reference. The map embeds no
source text, XML comments or arbitrary producer diagnostics. ASP.NET surface,
markup comment and project-discovery inputs remain outside this first map
scope. The older source-relation artifact remains independent and may be
disabled while source-map emission is enabled.

中文：在配置的 `options` 中显式设置 `writeDocSourceMapArtifact: true` 才生成
`doc-source-map@1.1.0`。纯数据 writer 从现有 runner 包导出，本轮不增加 npm 包。
XML 注释来源不会伪装成代码位置；只有唯一匹配的 Roslyn 声明和原生 C# 成员可引用
已核工作区内 `.cs` 文件。有效声明逐条写明排除终点及 UTF-16 列单位；恢复解析或
列精度不足时标记未知，不能精确查询。映射不包含源码正文或 XML 注释；关系工件与
源码映射各有独立用途，关闭映射时结果清单与 HIA 文档也不保留悬空引用。

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
