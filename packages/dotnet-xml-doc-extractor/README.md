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

const artifact = extractDotnetXmlDocs(xmlText, {
  path: "bin/Debug/Portal.Components.xml"
});
```

The extractor preserves compiler member ids such as `T:`, `M:`, `P:` and
`F:` and keeps common XML documentation fields including `summary`, `remarks`,
`param`, `returns` and `exception`.

It also recognizes locale markers inside those fields:

```xml
<summary>
  <lang>
    <en>Represents a portal navigation menu.</en>
    <zh-CN>表示一个门户导航菜单。</zh-CN>
  </lang>
</summary>
```

`<l>` is accepted as a short inline marker, and legacy
`div h_type="doc" > para[lang]` blocks are accepted as compatible input. The
artifact keeps plain text fields for compatibility and adds `member.i18n.fields`
for HIA field-level localization.

## License

MIT.
