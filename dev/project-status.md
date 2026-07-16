# Project Status

`hia-dotnetdoc` is at local 0.1.0 release candidate status.

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

Completed in the 0.1.0 release-candidate slice:

- package versions and internal dependencies aligned to `0.1.0`;
- public npm metadata, repository links and `publishConfig.access = "public"` for all six packages;
- package-level README/LICENSE coverage;
- `npm pack --dry-run --json` gate for all package contents;
- release gate coverage for syntax, skeleton, Roslyn helper build, fixtures, standalone smoke, license audit, pack dry-run and tests.

Completed in W-P18.2 first slice:

- public GitHub remote created and bound: `https://github.com/mandolin/hia-dotnetdoc`;
- CI workflow added for Node 20.20.2 / 22.x / 24.x with .NET 8;
- manual npm Trusted Publisher workflow added for package-level provenance publishing;
- release package resolver added for the six publishable `@hia-doc/*dotnet*` packages;
- release gate remains green after workflow and resolver additions.

Not yet implemented:

- DocFX metadata bridge;
- Roslyn semantic extraction over `.sln` / `.csproj`;
- SHFB project bridge;
- ASP.NET OpenAPI endpoint inventory;
- inherited docs, exact overload member ids and semantic cref resolution;
- npm package-level Trusted Publisher setup and real package publishing.
