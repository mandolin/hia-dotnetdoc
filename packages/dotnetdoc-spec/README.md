# @hia-doc/dotnetdoc-spec

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

## Install

```sh
npm install @hia-doc/dotnetdoc-spec
```

## License

MIT.
