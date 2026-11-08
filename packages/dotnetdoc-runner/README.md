# @hia-doc/dotnetdoc-runner

## Configuration Compatibility

Current configuration uses `schemaVersion: "1.0.0"`; exact `0.1.0-draft`
configuration remains readable. `readDotnetDocConfig(value)` returns the original
relative config, while `loadDotnetDocConfig(path)` reads a file and resolves its
runtime directories. `migrateDotnetDocConfig(value)` explicitly creates a new
current object without materializing omitted defaults or modifying input.

New config requires nonempty `inputs` with explicit supported `kind`. Omitted
directories retain `.` / `dist/dotnetdoc`; explicit null and wrong types are
rejected. Legacy omission/null runtime behavior remains readable despite its
original schema's required-directory fields; lossy null/coercion-dependent
migrations are refused. `getDotnetDocConfigSchema(identity)` selects an exact
version or matching ID, returning `undefined` otherwise. Both schemas ship under
`@hia-doc/dotnetdoc-runner/schemas/dotnetdoc-config-<version>.schema.json`.

新旧配置精确读取，不自动改号；新版本允许目录省略但拒绝null，旧默认按原运行语义保留。
显式迁移无法无损表示时拒绝；不填默认、删字段或执行抽取来凑通过。
主SDK结果使用1.0.0，领域wire与源码地图版本独立；失败结果/CLI不回显底层路径和堆栈。

See the [compatibility guide](https://github.com/mandolin/hia-dotnetdoc/blob/main/COMPATIBILITY.md)
for all seven domain artifacts, original-schema preservation and runtime requirements.

Standalone runner and CLI for compiler-generated .NET XML documentation files,
C# source inputs, ASP.NET endpoint surface inputs, ASP.NET/Razor markup comment
inputs and `.sln`/`.csproj` structure discovery.

DotNetDoc 独立 runner 与 CLI，支持编译器 XML documentation、C# 源码、
ASP.NET endpoint surface、ASP.NET/Razor 标记层注释，以及 `.sln`/`.csproj`
结构发现。

```sh
hia-dotnetdoc --config dotnetdoc.config.json
```

This package emits DotNetDoc extraction artifacts, HIA document artifacts,
optional source relation artifacts, ASP.NET endpoint extraction artifacts and a
documentation producer result manifest without embedding private source text.

## Documentation source map (opt in)

Set `options.writeDocSourceMapArtifact: true` in `dotnetdoc.config.json` to emit
an independent `doc-source-map@1.1.0` file alongside each XML or C# member
document. The default is `false`. The runner exports the pure
`createDotnetDocSourceMap()` writer from its existing package; this does not add
a separately published npm package. The result manifest and
`document.metadata.docSourceMaps` reference the emitted file and its actual
contract version only while the option is enabled.

```json
{
  "schemaVersion": "1.0.0",
  "workspaceRoot": ".",
  "outputDirectory": "dist/dotnetdoc",
  "inputs": [
    { "kind": "dotnet-xml-doc", "path": "bin/Sample.xml", "projectPath": "Sample.csproj" }
  ],
  "options": { "writeDocSourceMapArtifact": true }
}
```

Only uniquely matched XML members and native C# members with verified Roslyn
declaration ranges can carry C# source references. Valid declarations use an
exclusive end and UTF-16 code-unit columns; recovered syntax or incomplete
range precision remains explicitly unknown. XML-only inputs without a matching
project keep symbol entries with no code source reference. The map embeds no
source text, XML comments or arbitrary producer diagnostics. ASP.NET surface,
markup comment and project-discovery inputs remain outside this first map
scope. The older source-relation artifact remains independent and may be
disabled while source-map emission is enabled.

中文：在配置的 `options` 中显式设置 `writeDocSourceMapArtifact: true` 才生成
`doc-source-map@1.1.0`。纯数据 writer 从现有 runner 包导出，本轮不增加 npm 包。
XML 注释来源不会伪装成代码位置；只有唯一匹配的 Roslyn 声明和原生 C# 成员可引用
已核工作区内 `.cs` 文件。有效声明逐条写明排除终点及 UTF-16 列单位；恢复解析或
列精度不足时标记未知，不能精确查询。映射不包含源码正文或 XML 注释；关系工件与
源码映射各有独立用途，关闭映射时结果清单与 HIA 文档也不保留悬空引用。

It also exposes `classifyDotnetBuildDiagnostics()` for target scripts that need
to turn compiler XML documentation warnings such as `CS1591` into a
generated/designer/manual-source evidence summary.

它也导出 `classifyDotnetBuildDiagnostics()`，供目标项目脚本把 `CS1591` 等
编译器 XML documentation warning 分类为 generated / designer / manual source
边界 evidence。

`dotnet-markup-comments` inputs emit `dotnetdoc-markup-comment-extraction` and
matching HIA document artifacts for `.aspx`, `.ascx`, `.cshtml` and `.razor`
files.

`dotnet-markup-comments` input 会为 `.aspx`、`.ascx`、`.cshtml`、`.razor`
文件输出 `dotnetdoc-markup-comment-extraction` 与对应 HIA document。

Config inputs support the original single `path`, explicit `paths`, and
workspace-relative `glob` / `globs` patterns. Glob expansion is performed inside
the workspace and never accepts absolute paths or `..` traversal.

配置输入支持原有单个 `path`、显式 `paths`，以及工作区相对的 `glob` /
`globs`。glob 展开只在工作区内执行，不接受绝对路径或 `..` 路径穿越。

For `dotnet-csharp-source`, config inputs can also provide `projectPath` to let
the runner resolve `.cs` files from a `.csproj` before invoking the lightweight
Roslyn source extractor.

对 `dotnet-csharp-source`，配置也可以提供 `projectPath`，由 runner 先从
`.csproj` 推导源码文件集合，再调用轻量 Roslyn source extractor。

当同一请求同时包含 XML documentation 与带 `projectPath` 的 C# source 时，
`dotnetdoc-source-relation` 会携带同一 project-relative identity，并把
resolution、confidence、provenance 分开输出。relation 仍是 metadata-only：
`sourcesContentPolicy: none`，不嵌入源码正文，也不授予 source reader 能力。

```json
{
  "kind": "dotnet-csharp-source",
  "projectPath": "src/Portal.Components/Portal.Components.csproj",
  "artifactBasePath": "source/Portal.Components",
  "title": "Portal Components Source API"
}
```

```json
{
  "kind": "dotnet-markup-comments",
  "globs": ["src/Web/**/*.{aspx,ascx,master,cshtml,razor}"],
  "excludeGlobs": ["src/Web/**/bin/**", "src/Web/**/obj/**"],
  "artifactBasePath": "web/markup-comments",
  "title": "Web Markup Comments"
}
```

## Code source locations

Compiler XML paths are documentation origins. They stay in extraction `member.source`
and HIA `metadata.dotnetdoc.documentationSource`; they are not exposed as code definitions.
For real C# locations, use a configured `dotnet-project` solution/project input or set
`projectPath` on an XML input. The runner reuses its Roslyn extractor and requires a
unique assembly and complete documentation-comment ID match. It does not add duplicate
C# documentation pages and works with `writeSourceRelationArtifact: false`.

Unresolved or ambiguous members have no code locator. Conflicting declarations, missing
references, unavailable .NET tooling and sources outside the workspace are never repaired
by choosing an arbitrary filename. Extraction reads configured source only; it does not
execute the target build, download source, parse Windows/Portable PDBs or grant publication
permission. Existing source preview settings still require explicit publication consent.

中文：XML是文档出处；代码定位来自已配置项目中的唯一真实Roslyn声明。缺失/歧义保持未定位，
不会回退XML或按名称猜文件。C# 提取及 XML 的项目源码解析需要稳定的 .NET 10 SDK/runtime 和随包
Roslyn helper（net10.0，SDK 基线 10.0.100、latestFeature、禁止预览版）；仅安装 runtime 无法构建 helper。
纯 XML 提取及不调用 helper 的静态扫描无需该 SDK。输入项目可以使用更早的目标框架。
不读取 PDB；范围与语言随真实声明输出，所有 XML 注释/本地化字段保持。

English. C# extraction and XML project-source resolution require the bundled net10.0 Roslyn helper and a stable
.NET 10 SDK/runtime (10.0.100 baseline, latestFeature roll-forward, prereleases disabled). A runtime-only install
cannot build the helper. Plain XML extraction and static scans that do not invoke the helper need no SDK.
Input projects may target older frameworks. PDB reading is unsupported.

### Coverage diagnostics (0.1.12)

Read `document.metadata.sourceLocationResolution` for coverage counts and reference-warning codes, and each `symbol.diagnostics` for `data.symbolId`, `memberName`, `reason` (`missing`/`ambiguous`) and detail. Proven partial types prefer a non-generated declaration, then stable path/start position; the selected rule and candidate count appear in `symbol.metadata.dotnetdoc.sourceLocationResolution`. Duplicate inputs are not silently collapsed. Re-extract artifacts after upgrading; source publication still requires the existing explicit authorization.

中文：计数在metadata层；未定位成员逐项带诊断，合法partial记录主声明选择。升级后重新抽取，不改变公开授权。

## API and migration

See the [API reference](API.md), [migration guide](MIGRATION.md), and bundled ESM declarations for 1.0.0.

中文：API、精确新旧读取和迁移规则随包提供；类型不替代运行时校验或公开权限。

## Pure metadata

```js
import { DOTNETDOC_RUNNER_VERSION, DOTNETDOC_INPUT_KINDS, DOTNETDOC_OUTPUT_KINDS } from "@hia-doc/dotnetdoc-runner/metadata";
```

This entry exposes the runner version and frozen input/output kind arrays from the same definitions used by the root API. It contains pure data definitions, with no runner execution dependencies.

中文说明。metadata子入口提供版本及冻结的输入/输出种类，根入口与该入口引用同一定义。执行构建继续使用原运行API。

## Command reference

中文。本包同时提供hia-dotnetdoc和dotnetdoc，两者选项、输出和退出码相同。在本地npm脚本调用，或 `npm exec --offline -- hia-dotnetdoc --help`。帮助退出0，version输出运行器版本；构建仅success退出0，partial/failed或参数/配置错误退出1。未知参数拒绝，错误文本受控。

English. The package provides hia-dotnetdoc and dotnetdoc with identical options, output, and exit codes. Invoke from a local npm script or `npm exec --offline -- hia-dotnetdoc --help`. Help exits 0 and version prints the runner version. Only successful builds exit 0; partial/failed builds and argument/config errors exit 1. Unknown options are rejected with controlled errors.

| Option | 中文 | English |
| --- | --- | --- |
| `--config/-c <file>` | 调用目录下的JSON配置 | JSON config resolved from cwd |
| `--workspace-root <dir>` | 仅直接XML模式，相对调用目录，默认`.` | Direct XML only, cwd-relative, default `.` |
| `--out-dir/-o <dir>` | 两模式覆盖，相对有效工作区 | Override in both modes, relative to effective workspace |
| `--title <text>` | 仅直接模式，应用于各XML输入 | Direct mode only, applies to every XML input |
| `--help/-h` | 帮助，退出0 | Help, exit 0 |
| `--version/-v` | 运行器实现版本 | Runner implementation version |
| 位置XML / positional XML | 无配置时必填，相对工作区 | Required without config, workspace-relative |

### Config and direct modes

中文。配置模式仅out-dir可覆盖，workspace-root、title与位置输入均忽略。配置workspaceRoot相对配置目录，outputDirectory相对工作区，默认dist/dotnetdoc。详细矩阵与示例见API。以下配置保存为项目根dotnetdoc.config.json并准备获准sample.xml。

English. Only out-dir overrides config mode; workspace-root, title, and positionals are ignored. Config workspaceRoot uses the config directory and outputDirectory the workspace, defaulting to dist/dotnetdoc. See the API matrix for detail. Save this as dotnetdoc.config.json at the project root and prepare authorized sample.xml.

```json
{"schemaVersion":"1.0.0","workspaceRoot":".","outputDirectory":"dist/dotnetdoc","inputs":[{"kind":"dotnet-xml-doc","path":"sample.xml","title":"Sample API"}]}
```

```sh
npm exec --offline -- hia-dotnetdoc --config dotnetdoc.config.json
npm exec --offline -- dotnetdoc --workspace-root . --out-dir dist/dotnet-direct --title "Sample API" sample.xml
```

中文。两条命令均会写出工件与结果清单，可能覆盖旧文件，失败或partial可留有写入。此纯XML示例无需Roslyn helper。C#提取与XML项目源码解析按前文要求稳定.NET10 SDK/helper，输入项目目标框架单独管理。

English. Both commands write artifacts and a result manifest, may replace old files, and may leave writes after failure or partial success. This XML-only example needs no Roslyn helper. C# extraction and XML project-source resolution require the stable .NET10 SDK/helper described above, independently of the input project's target framework.

### Installation and version routing

中文。本页为1.0.0源码候选。候选归档须与配套内部依赖一起安装，离线安装另需第三方依赖缓存。注册表路线先用 `npm view @hia-doc/dotnetdoc-runner@1.0.0 version` 并核配套版本，再安装。`npm list @hia-doc/dotnetdoc-runner --depth=0` 核本地包。旧0.1.x快速指南及draft配置按旧包阅读，新配置身份1.0.0与源码地图等产物身份独立。

English. This is the 1.0.0 source candidate. Install its archive with matching internal dependencies and prepare a third-party cache for offline installs. For registry installation, check `npm view @hia-doc/dotnetdoc-runner@1.0.0 version` and matching dependencies first. Use `npm list @hia-doc/dotnetdoc-runner --depth=0` for the installed package. Older 0.1.x quickstarts and draft configs retain their scope. Current config identity 1.0.0 is independent from source-map and other artifact versions.
