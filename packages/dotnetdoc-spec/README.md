# @hia-doc/dotnetdoc-spec

Shared DotNetDoc constants for member kinds, contract names and contract
versions.

This package is intentionally small. It is used by DotNetDoc extractors,
adapters and runners to keep artifact naming stable across the .NET
documentation line.

The first contract set includes compiler XML documentation extraction,
Roslyn-backed C# source extraction and a source relation artifact that joins XML
member ids, C# declaration ranges and HIA symbol ids without embedding source
text.

## Install

```sh
npm install @hia-doc/dotnetdoc-spec
```

## License

MIT.
