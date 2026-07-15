# Project Status

`hia-dotnetdoc` is at P0/P1 skeleton status.

Completed in the first slice:

- workspace skeleton;
- XML documentation extraction contract;
- HIA document adapter;
- fixture build/check/test scripts;
- dependency license audit for `fast-xml-parser`.

Completed in W-P16.3 first slice:

- standalone `@hia-doc/dotnetdoc-runner`;
- `hia-dotnetdoc` and `dotnetdoc` CLI aliases;
- versioned `dotnetdoc.config.json`;
- documentation producer result manifest;
- `@hia-doc/dotnetdoc-producer` descriptor and adapter;
- standalone example and release gate checks.

Completed in W-P16.4b first slice:

- `@hia-doc/dotnet-source-extractor`;
- Roslyn helper project using `Microsoft.CodeAnalysis.CSharp@5.6.0`;
- `dotnetdoc-csharp-source-extraction@0.1.0-draft`;
- `dotnet-csharp-source` runner input kind;
- source range mapping into HIA `definedIn.position` / `definedIn.range`;
- release gate coverage for helper build, source fixture and runner source input.

Not yet implemented:

- DocFX metadata bridge;
- Roslyn semantic extraction over `.sln` / `.csproj`;
- SHFB project bridge;
- ASP.NET OpenAPI endpoint inventory;
- inherited docs, exact overload member ids and semantic cref resolution;
- package publishing setup.
