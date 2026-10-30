# Contract APIs

## Artifact APIs: `@hia-doc/dotnetdoc-spec`

| API | Behavior |
| --- | --- |
| `readDotnetDocArtifact(value)` | Checks one of seven exact old/current identities and ordinary JSON structure, returning the original object. Throws a fixed `TypeError` for invalid input. |
| `migrateDotnetDocArtifact(value)` | Accepts exact `0.1.0-draft`, returns an independent current object and preserves content/provenance/referenced old versions. Rejects current or lossy input. |
| `getDotnetDocArtifactSchema(contract, identity)` | Selects an exact version or matching schema ID. Unknown/mismatched identities return `undefined`. No URL lookup. |
| `getDotnetDocArtifactProfile(contract, identity)` | Returns a read-only static-analysis profile, without input-project builds or runtime discovery. Unknown identity returns `undefined`. |
| `cloneDotnetDocJson(value)` | Creates an independent ordinary JSON copy without getters/proxy traps or input mutation. Rejects values that cannot be copied losslessly. |

The readers do not traverse artifact references or verify files. They do not
authorize source disclosure, compile target projects or certify arbitrary
extension text as public-safe. Known field types and required collections are
checked; cross-object domain consistency remains a separate producer/host check.

阅读器不沿引用读取文件或验证源码权限，不构建目标项目；schema检查已知字段类型和必要集合，
跨对象语义、源码可访问性与任意扩展文本的公开性由生产者/宿主另核。

```js
import {
  readDotnetDocArtifact,
  migrateDotnetDocArtifact
} from "@hia-doc/dotnetdoc-spec";

// <lang><zh-CN>artifact是调用方已读取的精确旧版普通JSON；此处只验证，不执行或写盘。</zh-CN><en>The caller has already read artifact as exact legacy ordinary JSON; this validates without execution or writes.</en></lang>
const original = readDotnetDocArtifact(artifact);
// <lang><zh-CN>仅在明确选择迁移时创建新对象，旧artifact保持原版本。</zh-CN><en>Create a new object only when migration is explicitly selected; the old artifact retains its version.</en></lang>
const current = migrateDotnetDocArtifact(original);
```

## Config APIs: `@hia-doc/dotnetdoc-runner`

| API | Behavior |
| --- | --- |
| `readDotnetDocConfig(value)` | Pure exact reading with legacy runtime defaults/current strict schema; returns the original relative config. |
| `migrateDotnetDocConfig(value)` | Explicit legacy-to-current copy; changes identity only and rejects legacy values that would require coercion/default substitution. |
| `getDotnetDocConfigSchema(identity)` | Returns the exact old/current bundled schema or `undefined`; does not fetch schema URLs. |
| `loadDotnetDocConfig(path, { cwd }?)` | Reads the file and resolves runtime directories relative to it; does not run extraction. |
| `runDotnetDoc(request, context?)` | Runs explicit inputs and writes configured output. Uses the current shared SDK result contract; input I/O failures become controlled failed/partial diagnostics. |

`read`/`migrate` failures expose fixed messages without raw input values.
CLI argument/config/execution failures also use a controlled message rather than
echoing private filenames, raw option values or stack traces. Native artifacts
retain their domain diagnostics; producers remain responsible for public-safe
message content from authorized inputs.

read/migrate与CLI失败不回显输入、文件名或原始堆栈。实际运行仍写显式输出目录；
原生领域诊断保持其语义，生产者必须确保所选输入及消息内容允许公开。

See [compatibility and migration](../COMPATIBILITY.md) for exact identities,
original-schema preservation, null/default behavior and source precision limits.
