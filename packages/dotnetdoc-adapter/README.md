# @hia-doc/dotnetdoc-adapter

Convert DotNetDoc extraction artifacts into HIA document shapes.

将 DotNetDoc 抽取产物转换为 HIA document 形态。

## Install

```sh
npm install @hia-doc/dotnetdoc-adapter
```

## Usage

```js
import {
  dotnetMarkupCommentsToHiaDocument,
  dotnetXmlDocsToHiaDocument
} from "@hia-doc/dotnetdoc-adapter";

const document = dotnetXmlDocsToHiaDocument(artifact, {
  documentId: "dotnetdoc:Portal.Components",
  title: "Portal.Components API"
});

const markupDocument = dotnetMarkupCommentsToHiaDocument(markupArtifact, {
  documentId: "dotnetdoc:markup:Home",
  title: "Home Markup Comments"
});
```

The adapter keeps .NET member ids and source metadata while avoiding embedded
private source text.

Adapter 会保留 .NET member id、标记层注释位置和 source metadata，同时避免嵌入
私有源码正文。

## License

MIT.
