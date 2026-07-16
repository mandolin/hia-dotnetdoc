# @hia-doc/dotnet-source-extractor

C# source and ASP.NET endpoint surface extractor for DotNetDoc.

```js
import {
  extractAspNetEndpoints,
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
```

The first slice is syntax-only. It extracts documented/public declarations,
XML documentation trivia and source ranges from explicit `.cs` files. It does
not yet perform semantic compilation, `.sln` discovery, inherited docs or full
compiler member id normalization.

The ASP.NET endpoint slice is source-scan based. It recognizes Web Forms
`Page`/`Control` directives, controller attribute routing such as `Route` and
`HttpGet`, and Minimal API `MapGet`/`MapPost` calls. It records route metadata
and source ranges without embedding source text.
