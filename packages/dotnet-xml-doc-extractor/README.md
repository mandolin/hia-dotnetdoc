# @hia-doc/dotnet-xml-doc-extractor

Parse compiler-generated .NET XML documentation files into
`dotnetdoc-xml-doc-extraction` artifacts.

## Install

```sh
npm install @hia-doc/dotnet-xml-doc-extractor
```

## Usage

```js
import { extractDotnetXmlDocs } from "@hia-doc/dotnet-xml-doc-extractor";

const artifact = extractDotnetXmlDocs({
  xml: xmlText,
  assemblyName: "Portal.Components",
  sourcePath: "bin/Debug/Portal.Components.xml"
});
```

The extractor preserves compiler member ids such as `T:`, `M:`, `P:` and
`F:` and keeps common XML documentation fields including `summary`, `remarks`,
`param`, `returns` and `exception`.

## License

MIT.
