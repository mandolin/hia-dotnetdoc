# @hia-doc/dotnetdoc-adapter

Convert DotNetDoc extraction artifacts into HIA document shapes.

## Install

```sh
npm install @hia-doc/dotnetdoc-adapter
```

## Usage

```js
import { dotnetXmlDocsToHiaDocument } from "@hia-doc/dotnetdoc-adapter";

const document = dotnetXmlDocsToHiaDocument(artifact, {
  documentId: "dotnetdoc:Portal.Components",
  title: "Portal.Components API"
});
```

The adapter keeps .NET member ids and source metadata while avoiding embedded
private source text.

## License

MIT.
