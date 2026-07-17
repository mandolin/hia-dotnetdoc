# @hia-doc/dotnet-source-extractor

C# source and ASP.NET endpoint surface extractor for DotNetDoc.

```js
import {
  extractAspNetEndpoints,
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

The project discovery slice reads `.sln` and `.csproj` files without compiling.
It records solution/project structure, target frameworks, package references,
project references and explicit compile items as a `dotnetdoc-project-discovery`
artifact.

The ASP.NET endpoint slice is source-scan based. It recognizes Web Forms
`Page`/`Control` directives, controller attribute routing such as `Route` and
`HttpGet`, and Minimal API `MapGet`/`MapPost` calls. It records route metadata,
endpoint names, tags, source-scan authorization hints, response hints and source
ranges without embedding source text.
