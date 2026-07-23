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
