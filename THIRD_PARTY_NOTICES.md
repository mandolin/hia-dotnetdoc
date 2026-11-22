# Third-Party Notices

## Runtime Dependencies

| Package | Version | License | Purpose |
| --- | --- | --- | --- |
| `@nodable/entities` | `3.1.0` | MIT | Entity lookup used by the XML dependency. [Upstream MIT license](https://github.com/nodable/val-parsers/blob/ac48e7ea591da372be023a481875c747535812b3/LICENSE). |
| `ajv` | `8.20.0` | MIT | Validate local JSON Schema 2020-12 contracts without loading remote schemas. |
| `anynum` | `1.0.1` | MIT | Normalize Unicode numeric values used by the XML dependency. |
| `fast-deep-equal` | `3.1.3` | MIT | Support Ajv schema and value equality checks. |
| `fast-uri` | `3.1.9` | BSD-3-Clause | Resolve schema identifiers for Ajv. |
| `fast-xml-builder` | `1.3.2` | MIT | XML serialization support bundled with the parser dependency. |
| `fast-xml-parser` | `5.12.1` | MIT | Parse compiler-generated .NET XML documentation. |
| `is-unsafe` | `2.0.3` | MIT | Validate unsafe keys in the XML dependency. |
| `json-schema-traverse` | `1.0.0` | MIT | Traverse JSON Schemas for Ajv. |
| `path-expression-matcher` | `1.6.2` | MIT | Match XML path expressions in the parser dependency. |
| `require-from-string` | `2.0.2` | MIT | Load Ajv-generated validators. |
| `strnum` | `2.5.1` | MIT | Normalize XML numeric values. |
| `xml-naming` | `0.3.0` | MIT | Validate names in the XML dependency. |
| `Microsoft.CodeAnalysis.CSharp` | `5.6.0` | MIT | Parse C# source files and XML documentation trivia through Roslyn syntax APIs. |

The source extractor uses Roslyn parsing and a lightweight compilation with
available declared metadata references; it does not load an MSBuild workspace
or build the input project. DocFX/SHFB import, complete target-project semantic
compilation and ASP.NET runtime/OpenAPI discovery remain outside its scope.

源码抽取器使用Roslyn语法和有界轻量语义编译，不加载完整MSBuild工作区或构建输入项目；
Roslyn版本与许可保持不变，静态能力不等于目标项目完整编译或运行时端点发现。

The npm closure is recorded in `third-party-lock-allowlist.json`, with exact
official registry URLs and SHA-512 integrity values. Ajv uses bundled schemas
only: no remote schema downloads, coercion, defaults or silent field removal.
升级后的依赖按精确官方来源、SHA-512、许可和实装原字节复核。Ajv 仅加载随包本地 Schema，保留原验证语义。
