# hia-dotnetdoc

`hia-dotnetdoc` is the HIA documentation line for .NET and ASP.NET projects.

It consumes compiler XML documentation, explicit C# source files and first-pass
ASP.NET endpoint surfaces, then converts those artifacts into HIA-compatible
documents. Later layers are expected to deepen Roslyn semantic extraction,
DocFX/SHFB intake, OpenAPI metadata and richer source-linkage.

## Packages

| Package | Purpose |
| --- | --- |
| `@hia-doc/dotnetdoc-spec` | Shared constants for DotNetDoc contracts and member kinds. |
| `@hia-doc/dotnet-xml-doc-extractor` | Parses compiler XML documentation files into `dotnetdoc-xml-doc-extraction`. |
| `@hia-doc/dotnet-source-extractor` | Parses C# source files into `dotnetdoc-csharp-source-extraction` and ASP.NET surfaces into `dotnetdoc-aspnet-endpoint-extraction`. |
| `@hia-doc/dotnetdoc-adapter` | Converts DotNetDoc extraction artifacts to HIA document shapes. |
| `@hia-doc/dotnetdoc-runner` | Runs XML documentation inputs from JSON config or CLI and emits producer result manifests. |
| `@hia-doc/dotnetdoc-producer` | Exposes the runner through the HIA documentation producer contract. |

## Current Scope

The first milestone is intentionally narrow:

- consume compiler-generated XML documentation files, explicit C# source inputs and ASP.NET surface inputs;
- preserve .NET member ids such as `T:`, `M:`, `P:`, `F:`, and `E:`;
- keep XML documentation tags such as `summary`, `remarks`, `param`, `returns`, and `exception`;
- emit `dotnetdoc-source-relation` when XML documentation and C# source inputs share member ids;
- emit `dotnetdoc-aspnet-endpoint-extraction` for Web Forms pages/controls, controller attribute routes and Minimal API `Map{Verb}` calls;
- emit HIA-compatible document artifacts and producer result manifests without embedding private source text.

The first Roslyn source extractor is syntax-only: it extracts documented/public
declarations, XML documentation trivia and source ranges from explicit `.cs`
files. The first ASP.NET endpoint extractor is source-scan based: it records
Web Forms file-system surfaces and common ASP.NET Core route declarations, but
does not yet perform full project compilation, endpoint discovery through the
runtime pipeline, route constraint expansion or OpenAPI generation. Full
semantic compilation, `.sln`/`.csproj` discovery, inherited docs, DocFX, SHFB
project import and richer source-linkage are planned follow-up layers.

## Development

```bash
npm install
npm run release:gate
```

Generated fixture artifacts are written to `fixtures/out/` and are ignored.

Run the standalone CLI against the bundled fixture:

```bash
npm run smoke:standalone
```

## Release Checks

Before publishing the package set, check the npm registry state:

```bash
npm run release:registry:check
npm run release:registry:preflight
```

`release:registry:preflight` is intentionally conservative. It fails if any
current package version is already present on npm, so a first publish cannot
silently overwrite or duplicate an existing release.

To print the GitHub CLI commands for the manual Trusted Publisher workflow:

```bash
npm run release:trusted-publish:plan
```

To configure npm Trusted Publishers through npm CLI after logging in:

```bash
npm run release:trusted-publish:configure -- --dry-run
npm run release:trusted-publish:configure -- --otp=123456
```

The configure command uses npm 11 through `npx` because Trusted Publisher
management is newer than the minimum npm used by many local Node installs.

After configuration, verify the package-level Trusted Publisher records:

```bash
npm run release:trusted-publish:check
```

This check reads npm package trust records and may require an active npm
WebAuthn/2FA session.

For a normal project, create a `dotnetdoc.config.json`:

```json
{
  "$schema": "https://mandolin.github.io/HIA-Documentation/schemas/dotnetdoc-config-0.1.0-draft.schema.json",
  "schemaVersion": "0.1.0-draft",
  "workspaceRoot": ".",
  "outputDirectory": "dist/dotnetdoc",
  "inputs": [
    {
      "kind": "dotnet-xml-doc",
      "path": "bin/Debug/Your.Assembly.xml",
      "artifactBasePath": "Your.Assembly",
      "title": "Your.Assembly API"
    },
    {
      "kind": "dotnet-csharp-source",
      "path": "src/YourType.cs",
      "artifactBasePath": "YourType.source",
      "title": "YourType Source API"
    },
    {
      "kind": "dotnet-aspnet-surface",
      "path": "src/Web/Default.aspx",
      "applicationRoot": "src/Web",
      "artifactBasePath": "web/Default",
      "title": "Default Page Endpoint"
    }
  ],
  "options": {
    "writeResultManifest": true,
    "writeSourceRelationArtifact": true
  }
}
```

Then run:

```bash
hia-dotnetdoc --config dotnetdoc.config.json
```

## License

MIT.
