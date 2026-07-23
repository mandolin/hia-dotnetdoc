# @hia-doc/dotnet-source-extractor

C# source, ASP.NET endpoint surface and ASP.NET/Razor markup comment extractor
for DotNetDoc.

DotNetDoc 源码抽取器，覆盖 C# 源码、ASP.NET endpoint surface，以及
ASP.NET/Razor 标记层非 XML 注释。

```js
import {
  extractAspNetEndpoints,
  extractDotnetMarkupComments,
  extractDotnetProjectDiscovery,
  extractDotnetSourceFiles
} from "@hia-doc/dotnet-source-extractor";

const artifact = await extractDotnetSourceFiles({
  workspaceRoot: process.cwd(),
  paths: ["src/Example.cs"]
});

const endpoints = await extractAspNetEndpoints({
  workspaceRoot: process.cwd(),
  applicationRoot: "src/Web",
  paths: ["src/Web/Default.aspx", "src/Web/Controllers/BooksController.cs"]
});

const markupComments = await extractDotnetMarkupComments({
  workspaceRoot: process.cwd(),
  paths: ["src/Web/Default.aspx", "src/Web/Views/Home/Index.cshtml"]
});

const projects = await extractDotnetProjectDiscovery({
  workspaceRoot: process.cwd(),
  path: "Example.sln"
});
```

The C# source slice builds a lightweight Roslyn compilation for explicit `.cs`
files. It extracts documented/public declarations, XML documentation trivia,
source ranges and semantic documentation comment ids without loading an
MSBuild workspace. It does not yet perform inherited docs or full project-load
semantic analysis.

XML documentation `<lang>` / `<l>` markers and legacy
`div h_type="doc" > para[lang]` blocks are normalized into each member's HIA
field-level `i18n` model. The temporary raw XML trivia used for this normalization
is not retained in the returned artifact.

The project discovery slice reads `.sln` and `.csproj` files without compiling.
It records solution/project structure, target frameworks, package references,
project references and explicit compile items as a `dotnetdoc-project-discovery`
artifact.

The ASP.NET endpoint slice is source-scan based. It recognizes Web Forms
`Page`/`Control` directives, controller attribute routing such as `Route` and
`HttpGet`, and Minimal API `MapGet`/`MapPost` calls. It records route metadata,
endpoint names, tags, source-scan authorization hints, response hints and source
ranges without embedding source text.

The markup comment slice recognizes Web Forms `<%-- --%>`, Razor `@* *@` and
HTML `<!-- -->` comments in `.aspx`, `.ascx`, `.cshtml` and `.razor` files. It
records source ranges, syntax kind, server/client visibility and `<lang>` /
`<l>` locale markers without embedding complete source files.

标记层注释抽取识别 `.aspx`、`.ascx`、`.cshtml`、`.razor` 中的 Web Forms
`<%-- --%>`、Razor `@* *@` 与 HTML `<!-- -->` 注释，记录位置、语法类型与
服务端/客户端可见性，并解析 `<lang>` / `<l>` 语言标记，不嵌入完整源码。
