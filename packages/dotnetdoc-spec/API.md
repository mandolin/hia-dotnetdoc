# @hia-doc/dotnetdoc-spec API

Version: 1.0.0. Previous package line: 0.1.12.

中文：本页列出全部真实运行时根导出。类型为保守的ESM结构声明，未知扩展须缩窄；公开权限、schema、源码精度仍由对应运行时验证负责，不能仅凭类型或metadata认定安全。

## Entry points and types

Import from `@hia-doc/dotnetdoc-spec`; [ESM declarations](src/index.d.mts) provide exact root versions and conservative structures. The JavaScript runtime is unchanged by the declaration entry. TypeScript NodeNext resolves the explicit `types` export condition; no CommonJS entry is promised. Optional metadata and nested domain records remain `unknown` until validated.

| Export | Input / output / errors / effects |
| --- | --- |
| `DOTNETDOC_ARTIFACT_CONTRACTS` | Exact exported registry/schema; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_ARTIFACT_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_LEGACY_ARTIFACT_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_MARKUP_COMMENT_KINDS` | Exact exported registry/schema; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_MEMBER_PREFIXES` | Exact exported registry/schema; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_PROJECT_DISCOVERY_CONTRACT` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_PROJECT_DISCOVERY_CONTRACT_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_PROJECT_IDENTITY_POLICY` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_SOURCES_CONTENT_POLICY` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_SOURCE_RELATION_CONTRACT` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_SOURCE_RELATION_CONTRACT_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_XML_DOCUMENTATION_TAGS` | Exact exported registry/schema; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `cloneDotnetDocJson` | unknown → independent ordinary JSON; refuses getters/proxies/cycles/hidden fields; preserves -0, no I/O. |
| `getDotnetDocArtifactProfile` | (contract, exact version or schema id) → readonly static profile or undefined; no execution permission. |
| `getDotnetDocArtifactSchema` | (contract, exact version or schema id) → bundled schema or undefined; no remote schema lookup. |
| `getDotnetDocMemberKind` | Member name → kind by prefix; unknown prefix yields dotnet-member; pure. |
| `isDotnetDocMemberExtractionContract` | Contract string → boolean for XML/C# names; does not validate payload/version. |
| `isDotnetDocXmlDocumentationTag` | Tag string → boolean for exact supported XML tags; pure. |
| `migrateDotnetDocArtifact` | exact legacy artifact → new current copy; root identity only, nested provenance retained; non-lossless/already-current rejected. |
| `readDotnetDocArtifact` | unknown → exact legacy/current artifact; returns original, rejects unknown identity/non-JSON with TypeError, no mutation/I/O. |

## Bundled schemas

The existing `./schemas/*` subpath exposes local JSON resources: seven artifacts × two exact versions in the spec package; two config schemas in the runner. Schema IDs do not assert online availability. Unknown identities are not coerced or downloaded. Legacy config schema bytes remain unchanged; its old required-directory rules differ from the preserved runtime defaults.

## Boundaries

Node.js 22/24; source helper requires stable .NET SDK/runtime 10 and uses its bundled SDK policy. Target projects are read as static inputs, including older target frameworks; full MSBuild project compilation/runtime endpoint discovery is outside this API. Source ranges are provenance unless the dedicated map declares and validates their precision. Documentation text and arbitrary metadata still require host publication permission. Progress cancellation does not kill active helpers or roll back files already written.

See [README](README.md) for examples and [migration](MIGRATION.md) for compatibility.
