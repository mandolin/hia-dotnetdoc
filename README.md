# hia-dotnetdoc

`hia-dotnetdoc` is the HIA documentation line for .NET and ASP.NET projects.

It starts with C# XML documentation comments and a small HIA adapter. Later
stages are expected to add DocFX metadata, Roslyn semantic extraction, ASP.NET
OpenAPI endpoint intake, and richer source-linkage.

## Packages

| Package | Purpose |
| --- | --- |
| `@hia-doc/dotnetdoc-spec` | Shared constants for DotNetDoc contracts and member kinds. |
| `@hia-doc/dotnet-xml-doc-extractor` | Parses compiler XML documentation files into `dotnetdoc-xml-doc-extraction`. |
| `@hia-doc/dotnet-source-extractor` | Uses a Roslyn helper to parse C# source files into `dotnetdoc-csharp-source-extraction`. |
| `@hia-doc/dotnetdoc-adapter` | Converts DotNetDoc extraction artifacts to HIA document shapes. |
| `@hia-doc/dotnetdoc-runner` | Runs XML documentation inputs from JSON config or CLI and emits producer result manifests. |
| `@hia-doc/dotnetdoc-producer` | Exposes the runner through the HIA documentation producer contract. |

## Current Scope

The first milestone is intentionally narrow:

- consume compiler-generated XML documentation files and explicit C# source inputs;
- preserve .NET member ids such as `T:`, `M:`, `P:`, `F:`, and `E:`;
- keep XML documentation tags such as `summary`, `remarks`, `param`, `returns`, and `exception`;
- emit HIA-compatible document artifacts and producer result manifests without embedding private source text.

The first Roslyn source extractor is syntax-only: it extracts documented/public
declarations, XML documentation trivia and source ranges from explicit `.cs`
files. Full semantic compilation, `.sln`/`.csproj` discovery, inherited docs,
DocFX, SHFB project import, ASP.NET OpenAPI, and richer source-linkage are
planned follow-up layers.

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
    }
  ],
  "options": {
    "writeResultManifest": true
  }
}
```

Then run:

```bash
hia-dotnetdoc --config dotnetdoc.config.json
```

## License

MIT.
