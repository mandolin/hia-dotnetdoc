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

Both `hia-dotnetdoc` and `dotnetdoc` run the same CLI. Use `--config/-c`, `--out-dir/-o`, `--workspace-root`, `--title`, `--help/-h`, or `--version/-v`; positional XML paths are also supported. Success exits 0; partial/failed/request errors exit 1. Errors use controlled text without host paths/stacks.

中文。配置模式和直接 XML 模式按下表处理参数。配置文件相对于调用目录定位，其 workspaceRoot 相对于配置目录解析，outputDirectory 相对于工作区解析。输出默认 `dist/dotnetdoc`。命令会写出产物，partial/failed 也可能已写出部分文件。

English. Config and direct XML modes apply the options below. Resolve the config path from the invocation directory, its workspaceRoot from the config directory, and outputDirectory from the workspace. The default output is `dist/dotnetdoc`. Execution writes artifacts, and partial/failed runs may have written files.

| Input | With `--config` / 配置模式 | Without `--config` / 直接模式 |
| --- | --- | --- |
| `--workspace-root` | Ignored; use configured root / 忽略，采用配置值 | Relative to cwd, default `.` / 相对调用目录，默认 `.` |
| `--out-dir/-o` | Overrides output, relative to configured workspace / 覆盖输出，相对配置工作区 | Relative to selected workspace / 相对选定工作区 |
| `--title` | Ignored; use each configured input title / 忽略，采用各输入配置标题 | Applies to every XML input / 应用于各 XML 输入 |
| Positional XML paths / 位置参数 | Ignored; use configured inputs / 忽略，采用配置输入 | XML inputs relative to workspace / 相对工作区的 XML 输入 |

例如在调用目录执行 `hia-dotnetdoc --config settings/config.json --out-dir reports --workspace-root ignored --title ignored extra.xml`，若配置的 workspaceRoot 为 `workspace`，则只读取配置输入，写入 `settings/workspace/reports`，标题保持配置值。

For that command, a configured workspaceRoot of `workspace` selects configured inputs and titles and writes to `settings/workspace/reports`. The other three supplied values have no effect in config mode.

## Boundaries

Node.js 22/24; source helper requires stable .NET SDK/runtime 10 and uses its bundled SDK policy. Target projects are read as static inputs, including older target frameworks; full MSBuild project compilation/runtime endpoint discovery is outside this API. Source ranges are provenance unless the dedicated map declares and validates their precision. Documentation text and arbitrary metadata still require host publication permission. Progress cancellation does not kill active helpers or roll back files already written.

See [README](README.md) for examples and [migration](MIGRATION.md) for compatibility.

## Pure metadata entry

Subpath `./metadata` exports `DOTNETDOC_RUNNER_VERSION`, `DOTNETDOC_INPUT_KINDS` and `DOTNETDOC_OUTPUT_KINDS` from pure definitions. The arrays are frozen, and the root API exposes the same references. This entry performs no runner operations.

中文说明。metadata子入口提供同一版本与冻结输入/输出种类，适用于发现和文档工具。声明分支与运行分支分别提供，构建使用原运行API。

## Type-only declarations

The declaration entry also exports these types. Their source comments retain
English and Simplified Chinese descriptions for roots and explicit members.
The [declaration source](src/api-types.d.mts) defines optionality, unions and generic defaults.

| Type | Meaning |
| --- | --- |
| `DotnetDocConfig` | Dual-generation reading union; explicit migration separately returns the current version. |
| `DotnetDocContext` | Optional cancellation checks the aborted state without killing helpers or rolling back written files. |
| `DotnetDocCurrentConfig` | Current config identity, with directory safety enforced by schema and loader. |
| `DotnetDocDiagnostic` | Controlled runner diagnostics; arbitrary metadata still requires host publication review. |
| `DotnetDocInput` | At least one locator; paths are relative expressions whose actual safety still requires runtime checks. |
| `DotnetDocInputKind` | Five explicit inputs, with unknown kinds rejected at runtime. |
| `DotnetDocLegacyConfig` | Legacy config retains null-default compatibility while still refusing behavioral inputs. |
| `DotnetDocOptions` | Output controls default the first two to true and maps to false, without implicit source-body publication. |
| `DotnetDocOutputArtifact` | Output-file declaration without content; path is relative to the output directory. |
| `DotnetDocProgress` | Progress numbers count input items rather than percentages; callbacks may throw. |
| `DotnetDocRequest` | In-memory requests may omit directories for cwd/dist defaults; host context paths must not be directly serialized as public wire data. |
| `DotnetDocResult` | SDK 1.0.0 result; partial failures retain successful outputs without automatic rollback. |

中文说明。以上类型通过声明入口公开，根及显式成员的双语说明随源码维护。
类型签名保留联合、交叉和可选性，具体运行时输入仍由相应reader及schema检查。
