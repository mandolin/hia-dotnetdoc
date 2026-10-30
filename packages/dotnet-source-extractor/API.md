# @hia-doc/dotnet-source-extractor API

Version: 1.0.0. Previous package line: 0.1.12.

中文：本页列出全部真实运行时根导出。类型为保守的ESM结构声明，未知扩展须缩窄；公开权限、schema、源码精度仍由对应运行时验证负责，不能仅凭类型或metadata认定安全。

## Entry points and types

Import from `@hia-doc/dotnet-source-extractor`; [ESM declarations](src/index.d.mts) provide exact root versions and conservative structures. The JavaScript runtime is unchanged by the declaration entry. TypeScript NodeNext resolves the explicit `types` export condition; no CommonJS entry is promised. Optional metadata and nested domain records remain `unknown` until validated.

| Export | Input / output / errors / effects |
| --- | --- |
| `extractAspNetEndpoints` | workspaceRoot/paths + optional applicationRoot → Promise<static endpoint artifact>; reads files without running the app. |
| `extractDotnetMarkupComments` | workspaceRoot/paths + optional defaultLocale → Promise<markup artifact>; documentation comments require host publication review. |
| `extractDotnetProjectDiscovery` | workspaceRoot + path or paths → Promise<project artifact>; reads sln/csproj metadata without restore/build. |
| `extractDotnetSourceFiles` | workspaceRoot/paths + optional projectPath/referenceDirectory → Promise<C# artifact>; reads source/references and builds/runs owned .NET10 helper; never builds the input project. |

## Boundaries

Node.js 22/24; source helper requires stable .NET SDK/runtime 10 and uses its bundled SDK policy. Target projects are read as static inputs, including older target frameworks; full MSBuild project compilation/runtime endpoint discovery is outside this API. Source ranges are provenance unless the dedicated map declares and validates their precision. Documentation text and arbitrary metadata still require host publication permission. Progress cancellation does not kill active helpers or roll back files already written.

See [README](README.md) for examples and [migration](MIGRATION.md) for compatibility.
