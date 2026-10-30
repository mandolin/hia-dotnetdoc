# @hia-doc/dotnetdoc-producer API

Version: 1.0.0. Previous package line: 0.1.12.

中文：本页列出全部真实运行时根导出。类型为保守的ESM结构声明，未知扩展须缩窄；公开权限、schema、源码精度仍由对应运行时验证负责，不能仅凭类型或metadata认定安全。

## Entry points and types

Import from `@hia-doc/dotnetdoc-producer`; [ESM declarations](src/index.d.mts) provide exact root versions and conservative structures. The JavaScript runtime is unchanged by the declaration entry. TypeScript NodeNext resolves the explicit `types` export condition; no CommonJS entry is promised. Optional metadata and nested domain records remain `unknown` until validated.

| Export | Input / output / errors / effects |
| --- | --- |
| `default` | Same object as dotnetdocProducer, without extra initialization or I/O. |
| `dotnetdocProducer` | Readonly producer root; produce(request, context?) delegates to the runner and returns Promise<SDK1.0 result>; host owns execution authority. |
| `dotnetdocProducerDescriptor` | documentation-producer 1.0.0; version 1.0.0; sourceLinkage true, watch/incremental false; not a source-precision or execution grant. |

## Boundaries

Node.js 22/24; source helper requires stable .NET SDK/runtime 10 and uses its bundled SDK policy. Target projects are read as static inputs, including older target frameworks; full MSBuild project compilation/runtime endpoint discovery is outside this API. Source ranges are provenance unless the dedicated map declares and validates their precision. Documentation text and arbitrary metadata still require host publication permission. Progress cancellation does not kill active helpers or roll back files already written.

See [README](README.md) for examples and [migration](MIGRATION.md) for compatibility.
