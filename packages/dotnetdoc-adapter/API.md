# @hia-doc/dotnetdoc-adapter API

Version: 1.0.0. Previous package line: 0.1.12.

中文：本页列出全部真实运行时根导出。类型为保守的ESM结构声明，未知扩展须缩窄；公开权限、schema、源码精度仍由对应运行时验证负责，不能仅凭类型或metadata认定安全。

## Entry points and types

Import from `@hia-doc/dotnetdoc-adapter`; [ESM declarations](src/index.d.mts) provide exact root versions and conservative structures. The JavaScript runtime is unchanged by the declaration entry. TypeScript NodeNext resolves the explicit `types` export condition; no CommonJS entry is promised. Optional metadata and nested domain records remain `unknown` until validated.

| Export | Input / output / errors / effects |
| --- | --- |
| `assertDotnetAspNetEndpointArtifact` | unknown → void assertion; narrows the matching exact legacy/current artifact; wrong identity/shape throws, no mutation/I/O or automatic migration. |
| `assertDotnetMarkupCommentArtifact` | unknown → void assertion; narrows the matching exact legacy/current artifact; wrong identity/shape throws, no mutation/I/O or automatic migration. |
| `assertDotnetProjectDiscoveryArtifact` | unknown → void assertion; narrows the matching exact legacy/current artifact; wrong identity/shape throws, no mutation/I/O or automatic migration. |
| `assertDotnetXmlDocArtifact` | unknown → void assertion; narrows the matching exact legacy/current artifact; wrong identity/shape throws, no mutation/I/O or automatic migration. |
| `dotnetAspNetEndpointsToHiaDocument` | Exact static endpoint artifact + optional adapter options → HIA0.2 projection; pure, validation failure throws; does not discover runtime endpoints. |
| `dotnetMarkupCommentsToHiaDocument` | Exact markup artifact + optional adapter options → HIA0.2 projection; pure, validation failure throws; comments still need publication permission. |
| `dotnetProjectDiscoveryToHiaDocument` | Exact project artifact + optional adapter options → HIA0.2 metadata projection; pure, validation failure throws; no project execution. |
| `dotnetXmlDocsToHiaDocument` | Exact XML/C# artifact + optional id/title/defaultLocale/locales → HIA0.2 projection; retains complete i18n and conservative/exact signatures; pure, validation failure throws. |

## Boundaries

Node.js 22/24; source helper requires stable .NET SDK/runtime 10 and uses its bundled SDK policy. Target projects are read as static inputs, including older target frameworks; full MSBuild project compilation/runtime endpoint discovery is outside this API. Source ranges are provenance unless the dedicated map declares and validates their precision. Documentation text and arbitrary metadata still require host publication permission. Progress cancellation does not kill active helpers or roll back files already written.

See [README](README.md) for examples and [migration](MIGRATION.md) for compatibility.
