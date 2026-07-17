# @hia-doc/dotnetdoc-runner

Standalone runner and CLI for compiler-generated .NET XML documentation files,
C# source inputs, ASP.NET endpoint surface inputs and `.sln`/`.csproj`
structure discovery.

```sh
hia-dotnetdoc --config dotnetdoc.config.json
```

This package emits DotNetDoc extraction artifacts, HIA document artifacts,
optional source relation artifacts, ASP.NET endpoint extraction artifacts and a
documentation producer result manifest without embedding private source text.
