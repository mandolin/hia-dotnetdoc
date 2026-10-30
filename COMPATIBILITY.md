# Compatibility and Migration

## Independent Version Boundaries

| Boundary | Current writer | Exact legacy reader |
| --- | --- | --- |
| DotNetDoc configuration | `1.0.0` | `0.1.0-draft` |
| XML documentation extraction | `dotnetdoc-xml-doc-extraction@1.0.0` | `0.1.0-draft` |
| C# source extraction | `dotnetdoc-csharp-source-extraction@1.0.0` | `0.1.0-draft` |
| XML/source relations | `dotnetdoc-source-relation@1.0.0` | `0.1.0-draft` |
| Static ASP.NET endpoint scan | `dotnetdoc-aspnet-endpoint-extraction@1.0.0` | `0.1.0-draft` |
| ASP.NET/Razor markup comments | `dotnetdoc-markup-comment-extraction@1.0.0` | `0.1.0-draft` |
| Static project/solution discovery | `dotnetdoc-project-discovery@1.0.0` | `0.1.0-draft` |
| Build warning classification | `dotnetdoc-build-warning-classification@1.0.0` | `0.1.0-draft` |
| Shared producer descriptor/result | `documentation-producer@1.0.0` / `documentation-producer-result@1.0.0` | Host SDK compatibility applies |
| Document source map | `doc-source-map@1.1.0` | Independent host source-map compatibility applies |

Package versions, domain wires, shared SDK identities, source-map precision and
tool runtimes evolve independently. Unknown versions are rejected rather than
treated as future-compatible. Schema resource IDs do not imply online hosting.

npm包版本、领域工件、共享SDK、源码地图精度与运行工具环境相互独立。仅接纳明确列出的
精确版本，不猜测未来兼容；schema ID是稳定标识，不表示已部署到公网。

## Reading and Migrating Artifacts

Use `readDotnetDocArtifact(value)` from `@hia-doc/dotnetdoc-spec` to validate an
exact supported identity and JSON structure. It returns the original object,
performs no source reads or execution, and does not silently migrate data.
`getDotnetDocArtifactSchema(contract, versionOrId)` and
`getDotnetDocArtifactProfile(contract, versionOrId)` return the corresponding
bundled schema/profile, or `undefined` for unknown or mismatched identities.

Use `migrateDotnetDocArtifact(value)` explicitly for an exact legacy artifact.
It creates a new object and changes only the root `contractVersion` and an
existing `$schema`. Documentation, locale fields, omitted fields, provenance
and referenced legacy artifact versions remain unchanged. Migration neither
rebuilds files nor rewrites an artifact graph. Already-current inputs are rejected.

工件读取保留原对象与旧版本，不执行或自动改号；显式迁移返回新对象，仅更新根身份。
嵌套引用和生成来源继续真实指向旧产物/规则，不因根迁移而伪称重新生成。各生产者新输出
才使用新领域身份。JSON扩展可保留，但读取不证明任意metadata可以公开。

## Reading and Migrating Configuration

`readDotnetDocConfig(value)` and `migrateDotnetDocConfig(value)` are exported by
`@hia-doc/dotnetdoc-runner`. The reader retains the original object and relative
paths. `loadDotnetDocConfig(path)` additionally resolves directories relative to
the config file; extraction is still a separate operation.

Current configuration requires `schemaVersion` and nonempty `inputs`; each input
requires an explicit supported `kind`. Omitted directories keep the existing
`.` / `dist/dotnetdoc` runtime defaults. Explicit `null`, wrong types and unknown
current options are rejected. No new input-kind inference is introduced.

The original legacy schema remains byte-preserved, including its historical
required-directory fields. The legacy runtime already accepted omitted or
`null` directories; exact reading preserves that behavior without claiming old
schema conformance. Migration refuses a legacy `null` or coercion-dependent value
that current configuration cannot represent without loss. It never substitutes
defaults or silently drops fields to make migration pass.

新配置允许目录省略，保持既有默认；显式null/错误类型拒绝，input.kind不推断。原旧schema
完整保留，其required与旧loader默认行为的历史差异不回写。旧null可以按原运行语义读取，
但若不能无损表示为新配置，迁移明确拒绝，不偷偷填默认或删字段。

## Data and Precision Limits

Reading and migration accept ordinary JSON data. Cycles, accessors, proxies,
functions, nonfinite numbers, special objects, sparse arrays, symbols and hidden
properties are rejected. Negative zero and repeated acyclic values are preserved
in independent copies. User getters/proxy traps are not invoked.

Domain schemas validate transport structure. Partial or unverified XML provenance
coordinates remain data; they do not become code definitions. Source-map writers
and host readers separately validate real paths, complete ranges, endpoint rules
and column units before exact navigation. No generic schema check grants source
access, runtime execution or public disclosure rights.

普通JSON无损复制不执行用户行为；不能无损保留的特殊数据拒绝。领域schema只验证传输结构，
不把不完整XML出处升级成代码定义；精确导航继续由文档源码地图及宿主核真实路径、范围和
列单位。静态端点扫描不等于运行时发现，轻量Roslyn编译不等于完整目标项目构建。

## Runtime and Resources

Use Node.js 22/24 and a serviced stable .NET 10 SDK/runtime for C# extraction.
Legacy input frameworks are unchanged. See [runtime migration](docs/runtime-compatibility.md).
Schemas ship under `@hia-doc/dotnetdoc-spec/schemas/*.schema.json` and
`@hia-doc/dotnetdoc-runner/schemas/*.schema.json`; no remote schema downloads are performed.
See [contract APIs](docs/contracts.md) for examples and failure semantics.
