# Runtime Compatibility and Migration

## Tooling

- Node.js 22 and 24 are supported tool runtimes.
- C# extraction builds and executes the bundled Roslyn helper using a stable,
  serviced .NET 10 SDK/runtime. A runtime-only installation cannot build it.
- The repository and installed source-extractor package use the same
  `global.json`: SDK baseline `10.0.100`, `rollForward: latestFeature`, and
  `allowPrerelease: false`. This allows installed stable .NET 10 feature bands
  and patches, without selecting .NET 11 or preview SDKs.
- SDK selection begins at the extractor package directory when it runs the
  helper. A different `global.json` in the input directory does not select its SDK.

工具运行环境采用 Node.js 22/24 与 .NET 10 稳定受支持补丁。C# helper 运行前会构建，
需安装 SDK 而非只有 runtime。包内 SDK 规则允许 10.0 的稳定 feature band/补丁，
不选 11 或预览版本；SDK 选择从提取包目录开始，与输入目录规则分离。

## Migrating from .NET 8 Tooling

1. Install the current stable .NET 10 SDK and servicing updates.
2. Confirm `dotnet --list-sdks` and `dotnet --list-runtimes` contain .NET 10.
3. Use Node.js 22 or 24 and install the packages normally.
4. Rerun documentation extraction. The helper compiles for `net10.0`; it does not
   rely on a .NET 8 runtime or modify an input project's framework.

从旧工具环境迁移时先安装 .NET 10 SDK/补丁并核 SDK/runtime 列表，再用 Node.js 22/24
重跑文档抽取。仅安装 .NET 8 不能运行新 helper；无需升级业务项目目标框架。
XML-only and static scans do not need the helper, but XML runs that request
source resolution through C# project context do need .NET 10.
纯 XML/静态扫描不需 helper；XML 通过 C# 项目上下文解析源码位置时仍需 .NET 10。

## Input Compatibility and Limits

Legacy .NET Framework, .NET 8, and newer source/XML are inputs, not executable
projects. Project discovery scans project/solution metadata. Endpoint discovery
is a static scan; it does not execute the ASP.NET pipeline, discover runtime-only
endpoints, restore target dependencies, or promise complete semantic compilation.
Metadata references already present under an authorized workspace may be read;
missing references remain diagnostics rather than permission to build a target.

旧框架源码/XML与新工具环境分开管理。项目发现和端点识别为静态读取，不执行目标
MSBuild/ASP.NET 管线，不恢复业务依赖；缺失引用继续报告诊断，不转为目标构建授权。

## Reference

See the official [.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
and [SDK selection rules](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json).
