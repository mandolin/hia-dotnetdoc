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
