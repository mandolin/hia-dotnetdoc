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

Completed in W-P19.1 first slice:

- shared release package inventory for resolver, registry checks and Trusted Publisher planning;
- npm registry status check for all six `0.1.0` DotNetDoc release packages;
- conservative prepublish check that fails when a current package version already exists;
- GitHub CLI Trusted Publisher command plan for the ordered package batch;
- README release-check instructions for registry and Trusted Publisher preparation.
- verified npm registry state: all six `0.1.0` DotNetDoc packages are currently missing;
- verified `release:registry:preflight`, `release:trusted-publish:plan`, and `release:gate`.

Current external release status:

- all six DotNetDoc `0.1.0` packages are published on npm;
- npm package-level Trusted Publisher records are configured for all six packages;
- `release:trusted-publish:check` can verify GitHub Actions publisher records for `mandolin/hia-dotnetdoc` and `npm-trusted-publish.yml` when an active npm WebAuthn/2FA session is available.

Completed in W-P19.3 first slice:

- `dotnetdoc-source-relation@0.1.0-draft` contract constants;
- runner emits `dotnetdoc.source-relation.json` when XML documentation and C# source artifacts share member ids;
- relation entries connect XML member id, HIA symbol id and C# source declaration range without embedding private source text.

Remaining release follow-up:

- a future patch release, for example `0.1.1`, should be used to verify end-to-end GitHub Actions Trusted Publisher provenance publishing;
- the already published `0.1.0` versions cannot be republished through the workflow.

Not yet implemented:

- DocFX metadata bridge;
- Roslyn semantic extraction over `.sln` / `.csproj`;
- SHFB project bridge;
- ASP.NET OpenAPI endpoint inventory;
- inherited docs, exact overload member ids and semantic cref resolution;
- end-to-end GitHub Actions Trusted Publisher provenance patch rehearsal.
