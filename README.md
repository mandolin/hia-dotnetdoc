# hia-dotnetdoc

`hia-dotnetdoc` is the HIA documentation line for .NET and ASP.NET projects.

It consumes compiler XML documentation, explicit C# source files, first-pass
ASP.NET endpoint surfaces and ASP.NET/Razor markup comments, then converts
those artifacts into HIA-compatible documents. Later layers are expected to
deepen Roslyn semantic extraction, DocFX/SHFB intake, OpenAPI metadata and
richer source-linkage.

## Packages

| Package | Purpose |
| --- | --- |
| `@hia-doc/dotnetdoc-spec` | Shared constants for DotNetDoc contracts and member kinds. |
| `@hia-doc/dotnet-xml-doc-extractor` | Parses compiler XML documentation files into `dotnetdoc-xml-doc-extraction`. |
| `@hia-doc/dotnet-source-extractor` | Parses C# source files into `dotnetdoc-csharp-source-extraction`, ASP.NET surfaces into `dotnetdoc-aspnet-endpoint-extraction`, and markup comments into `dotnetdoc-markup-comment-extraction`. |
| `@hia-doc/dotnetdoc-adapter` | Converts DotNetDoc extraction artifacts to HIA document shapes. |
| `@hia-doc/dotnetdoc-runner` | Runs XML documentation inputs from JSON config or CLI and emits producer result manifests. |
| `@hia-doc/dotnetdoc-producer` | Exposes the runner through the HIA documentation producer contract. |

## Current Scope

The first milestone is intentionally narrow:

- consume compiler-generated XML documentation files, explicit C# source inputs, ASP.NET surface inputs and markup comment inputs;
- preserve .NET member ids such as `T:`, `M:`, `P:`, `F:`, and `E:`;
- keep XML documentation tags such as `summary`, `remarks`, `param`, `returns`, and `exception`;
- map XML documentation `<lang>` / `<l>` and legacy `div h_type="doc" > para[lang]` locale blocks into HIA field-level `i18n`;
- emit `dotnetdoc-source-relation` when XML documentation and C# source inputs share member ids;
- emit `dotnetdoc-aspnet-endpoint-extraction` for Web Forms pages/controls, controller attribute routes and Minimal API `Map{Verb}` calls;
- emit `dotnetdoc-markup-comment-extraction` for Web Forms `<%-- --%>`, Razor `@* *@` and HTML `<!-- -->` comments in `.aspx`, `.ascx`, `.cshtml` and `.razor` files;
- emit HIA-compatible document artifacts and producer result manifests without embedding private source text.

The first Roslyn source extractor is syntax-only: it extracts documented/public
declarations, XML documentation trivia and source ranges from explicit `.cs`
files. The first ASP.NET endpoint extractor is source-scan based: it records
Web Forms file-system surfaces and common ASP.NET Core route declarations, but
does not yet perform full project compilation, endpoint discovery through the
runtime pipeline, route constraint expansion or OpenAPI generation. Full
semantic compilation, `.sln`/`.csproj` discovery, inherited docs, DocFX, SHFB
project import and richer source-linkage are planned follow-up layers.

The first markup comment extractor is also source-scan based. It treats
server-side comments (`<%-- --%>` and `@* *@`) as documentation-only source and
HTML comments (`<!-- -->`) as client-visible source metadata. It preserves
comment text, syntax kind, visibility, `<lang>` / `<l>` locale markers and
source ranges, but never embeds whole source files.

标记层注释第一轮采用轻量源码扫描：Web Forms 的 `<%-- --%>` 与 Razor 的
`@* *@` 视为服务端隐藏的文档化注释，HTML `<!-- -->` 视为客户端可见的
标记注释。产物会保留注释正文、语法类型、可见性、`<lang>` / `<l>` 语言标记与
位置范围，但不会嵌入完整源码。

## XML Locale Markers

DotNetDoc accepts structured locale markers inside ordinary C# XML
documentation comments and compiler-generated XML documentation files:

```xml
/// <summary>
/// <lang>
///   <en>Represents a portal navigation menu.</en>
///   <zh-CN>表示一个门户导航菜单。</zh-CN>
/// </lang>
/// </summary>
```

`<l>` is accepted as a short inline marker for field text such as `param`,
`returns` or `exception`. Legacy Sandcastle-oriented blocks in the form
`<div h_type="doc"><para lang="en">...</para></div>` are accepted as compatible
input. All forms are normalized into `HiaI18nModel.fields`; plain `summary` and
related fields remain as compatibility render caches.

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
    },
    {
      "kind": "dotnet-markup-comments",
      "path": "src/Web/Views/Home/Index.cshtml",
      "artifactBasePath": "web/Home.Index.comments",
      "title": "Home View Markup Comments"
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
