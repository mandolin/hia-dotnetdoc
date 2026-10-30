# @hia-doc/dotnetdoc-runner API

Version: 1.0.0. Previous package line: 0.1.12.

中文：本页列出全部真实运行时根导出。类型为保守的ESM结构声明，未知扩展须缩窄；公开权限、schema、源码精度仍由对应运行时验证负责，不能仅凭类型或metadata认定安全。

## Entry points and types

Import from `@hia-doc/dotnetdoc-runner`; [ESM declarations](src/index.d.mts) provide exact root versions and conservative structures. The JavaScript runtime is unchanged by the declaration entry. TypeScript NodeNext resolves the explicit `types` export condition; no CommonJS entry is promised. Optional metadata and nested domain records remain `unknown` until validated.

| Export | Input / output / errors / effects |
| --- | --- |
| `DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_CONFIG_JSON_SCHEMA` | Exact exported registry/schema; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_CONFIG_SCHEMA_ID` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_CONFIG_SCHEMA_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_INPUT_KINDS` | Exact exported registry/schema; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_LEGACY_CONFIG_JSON_SCHEMA` | Exact exported registry/schema; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_LEGACY_CONFIG_SCHEMA_ID` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_LEGACY_CONFIG_SCHEMA_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_OUTPUT_KINDS` | Exact exported registry/schema; independent contract/package identities, see declaration literal and migration rules. |
| `DOTNETDOC_RUNNER_VERSION` | Exact exported constant; independent contract/package identities, see declaration literal and migration rules. |
| `classifyDotnetBuildDiagnostics` | String/object diagnostic array → current warning classification; pure metadata classification, not a release gate decision. |
| `createDotnetDocSourceMap` | record + caller realpath-verified path set + producerVersion → doc-source-map 1.1.0; pure lexical checks, no source reads or XML-to-code guesses. |
| `getDotnetDocConfigSchema` | Exact version or schema id → bundled config schema or undefined; no network lookup. |
| `loadDotnetDocConfig` | Config path + optional cwd → Promise<resolved request>; reads JSON; workspace relative to config, output relative to workspace; does not execute the request. |
| `migrateDotnetDocConfig` | Exact legacy config → independent current config; root identity only; non-lossless null/coercion-dependent values rejected. |
| `readDotnetDocConfig` | unknown → original exact config; legacy omission/null defaults retained, current null/wrong types rejected; pure/no I/O. |
| `runDotnetDoc` | Request + optional abort/progress context → Promise<SDK result>; reads inputs, writes output/helper caches; per-input errors yield failed/partial, invalid preflight may reject. |

## Bundled schemas

The existing `./schemas/*` subpath exposes local JSON resources: seven artifacts × two exact versions in the spec package; two config schemas in the runner. Schema IDs do not assert online availability. Unknown identities are not coerced or downloaded. Legacy config schema bytes remain unchanged; its old required-directory rules differ from the preserved runtime defaults.

## Command line

Both `hia-dotnetdoc` and `dotnetdoc` run the same CLI. Use `--config/-c`, `--out-dir/-o`, `--workspace-root`, `--title`, `--help/-h`, or `--version/-v`; positional XML paths are also supported. Success exits 0; partial/failed/request errors exit 1. Errors use controlled text without host paths/stacks. Config output defaults to `dist/dotnetdoc`; CLI options override loaded workspace/output/title as implemented.

## Boundaries

Node.js 22/24; source helper requires stable .NET SDK/runtime 10 and uses its bundled SDK policy. Target projects are read as static inputs, including older target frameworks; full MSBuild project compilation/runtime endpoint discovery is outside this API. Source ranges are provenance unless the dedicated map declares and validates their precision. Documentation text and arbitrary metadata still require host publication permission. Progress cancellation does not kill active helpers or roll back files already written.

See [README](README.md) for examples and [migration](MIGRATION.md) for compatibility.
