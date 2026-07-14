# hia-dotnetdoc

`hia-dotnetdoc` is the HIA documentation line for .NET and ASP.NET projects.

It starts with C# XML documentation comments and a small HIA adapter. Later
stages are expected to add DocFX metadata, Roslyn semantic extraction, ASP.NET
OpenAPI endpoint intake, source-linkage, and a documentation producer adapter.

## Packages

| Package | Purpose |
| --- | --- |
| `@hia-doc/dotnetdoc-spec` | Shared constants for DotNetDoc contracts and member kinds. |
| `@hia-doc/dotnet-xml-doc-extractor` | Parses compiler XML documentation files into `dotnetdoc-xml-doc-extraction`. |
| `@hia-doc/dotnetdoc-adapter` | Converts DotNetDoc extraction artifacts to HIA document shapes. |

## Current Scope

The first milestone is intentionally narrow:

- consume compiler-generated XML documentation files;
- preserve .NET member ids such as `T:`, `M:`, `P:`, `F:`, and `E:`;
- keep XML documentation tags such as `summary`, `remarks`, `param`, `returns`, and `exception`;
- emit a HIA-compatible document artifact without embedding private source text.

DocFX, Roslyn, ASP.NET OpenAPI, and full producer integration are planned
follow-up layers, not assumptions hidden inside this first package set.

## Development

```bash
npm install
npm run release:gate
```

Generated fixture artifacts are written to `fixtures/out/` and are ignored.

## License

MIT.

