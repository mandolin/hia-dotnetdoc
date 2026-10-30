# Third-Party Notices

## Runtime Dependencies

| Package | Version | License | Purpose |
| --- | --- | --- | --- |
| `fast-xml-parser` | `5.3.2` | MIT | Parse compiler-generated .NET XML documentation files. |
| `strnum` | `2.4.1` | MIT | Existing XML parser numeric-value normalization dependency. |
| `anynum` | `1.0.1` | MIT | Existing Unicode numeric normalization dependency. |
| `ajv` | `8.17.1` | MIT | Validate bundled current/legacy JSON Schemas without remote schema loading or data coercion. |
| `fast-deep-equal` | `3.1.3` | MIT | Ajv schema/value equality support. |
| `fast-uri` | `3.1.9` | BSD-3-Clause | Ajv local schema URI handling. |
| `json-schema-traverse` | `1.0.0` | MIT | Ajv schema traversal. |
| `require-from-string` | `2.0.2` | MIT | Ajv generated-validator loading support. |
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
原有三条npm依赖版本保持；补齐旧锁缺失的官方来源/SRI前，已逐归档与实装文件原字节
核对。Ajv新增五条闭包均为MIT/BSD宽松许可，不加载远端schema或修改待验证数据。
