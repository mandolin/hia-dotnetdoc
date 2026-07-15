# @hia-doc/dotnet-source-extractor

Roslyn-backed C# source extractor for DotNetDoc.

```js
import { extractDotnetSourceFiles } from "@hia-doc/dotnet-source-extractor";

const artifact = await extractDotnetSourceFiles({
  workspaceRoot: process.cwd(),
  paths: ["src/Example.cs"]
});
```

The first slice is syntax-only. It extracts documented/public declarations,
XML documentation trivia and source ranges from explicit `.cs` files. It does
not yet perform semantic compilation, `.sln` discovery, inherited docs or full
compiler member id normalization.
