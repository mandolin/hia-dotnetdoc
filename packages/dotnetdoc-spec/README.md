# @hia-doc/dotnetdoc-spec

## Contract Reading and Migration

Current constants identify seven domain artifacts at `1.0.0`. Exact
`0.1.0-draft` artifacts remain readable. Package versions and domain wire
versions are independent; document source maps keep their separate `1.1.0` identity.

- `readDotnetDocArtifact(value)` validates a supported exact contract/version and
  ordinary JSON shape, returning the original object without mutation or I/O.
- `migrateDotnetDocArtifact(value)` accepts an exact legacy artifact and returns
  an independent current object. Only root identity and an existing `$schema`
  change; provenance and referenced legacy artifact versions are preserved.
- `getDotnetDocArtifactSchema(contract, identity)` and
  `getDotnetDocArtifactProfile(contract, identity)` select an exact version or
  matching schema ID. Unknown/mismatched identities return `undefined`.
- `cloneDotnetDocJson(value)` copies ordinary data without getters/proxy traps.
  Cycles, special objects, sparse arrays and non-JSON values are rejected.

读取只接纳已知精确新/旧身份并保留原对象；迁移需显式调用，不改输入或重写引用图。
任意扩展文本的公开性、源码访问权与精确导航仍由生产者/宿主检查；schema验证不授予权限。

Sixteen config/domain schemas ship across the spec and runner packages. This
package exports its fourteen domain schemas through
`@hia-doc/dotnetdoc-spec/schemas/<contract>-<version>.schema.json`, without
fetching remote schema URLs. Legacy wire schemas are compatibility models;
the original config schema is preserved by the runner.

For exact identities, defaults and precision limits, see the
[compatibility guide](https://github.com/mandolin/hia-dotnetdoc/blob/main/COMPATIBILITY.md).

Shared DotNetDoc constants for member kinds, contract names and contract
versions.

共享 DotNetDoc member kind、contract name 与 contract version 常量。

This package is intentionally small. It is used by DotNetDoc extractors,
adapters and runners to keep artifact naming stable across the .NET
documentation line.

The first contract set includes compiler XML documentation extraction,
Roslyn-backed C# source extraction, ASP.NET endpoint extraction, ASP.NET/Razor
markup comment extraction, project discovery and a source relation artifact
that joins XML member ids, C# declaration ranges and HIA symbol ids without
embedding source text.

第一组合同覆盖编译器 XML documentation、Roslyn C# 源码抽取、ASP.NET endpoint、
ASP.NET/Razor 标记层注释、项目结构发现，以及连接 XML member id、C# 声明范围与
HIA symbol id 的 source relation 产物。

Project discovery 与 source relation 共享 `project-relative-owner-resolved`
identity policy；稳定 project ID 只从工作区相对 `.csproj` path 生成。两个
metadata-only 产物都采用 `sourcesContentPolicy: none`，并分别表达 resolution、
confidence 与 provenance。

## Install

```sh
npm install @hia-doc/dotnetdoc-spec
```

## License

MIT.
