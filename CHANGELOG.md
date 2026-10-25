# 变更日志 / Changelog

## Unreleased — 0.1.12 source coverage and diagnostics

- 真实partial类型记录主声明选择（非生成优先，再按路径/行）；重复输入与真实冲突保留歧义诊断。
- 只读已声明HintPath/ProjectReference与同次XML构建引用副本；使用已安装目标.NET Framework reference pack补齐完整参数身份，不按简称/参数数猜测，不执行目标构建/程序集或下载依赖。
- 每个未定位成员新增原因诊断；计数稳定保留在`metadata.sourceLocationResolution`，新增partial计数/引用诊断代码，HIA根诊断保持有界。原XML文本/i18n/身份及源码公开授权不变。
- Selects and records primary declarations for proven partial types, resolves full overload/constructor identities using declared read-only metadata, and reports unresolved members individually with bounded root summaries. No target execution, source guessing or implicit publication.
## 0.1.11 — 2026-10-25

- XML文档出处保留在抽取wire和HIA documentationSource元数据，停止将其当成代码definedIn。runner从配置的项目/解决方案或显式源码按程序集与完整成员ID补全唯一C#声明，保留完整范围、注释、i18n与身份，独立于relation文件输出。
- XML documentation origins remain in extraction wire data and HIA documentationSource metadata instead of code definedIn. The runner resolves unique C# declarations by assembly and full documentation ID from configured projects/solutions or explicit sources, retaining ranges, comments, i18n and identity independently of relation-file emission.
- 歧义、缺失源码、不可用工具或越根symlink保留未定位；无文件名猜测、PDB解析、业务构建、网络源码抓取或源码正文默认公开。
- Ambiguity, missing source, unavailable tools and escaping symlinks stay unresolved. No filename guessing, PDB parsing, target builds, network source downloads or implicit source publication.

本文件记录 DotNetDoc 用户可见变化。标记为 Unreleased 的版本尚未发布到 npm registry。

This file records user-visible DotNetDoc changes. Versions marked Unreleased have not been published to the npm registry.

## 0.1.10 — 2026-10-24

- XML与Roslyn成员的HIA符号增加显示用`signature`，保留重载参数类型；Roslyn精确声明包含返回类型、参数名与修饰符。
- runner仅为唯一且文档ID完全一致的XML成员补充Roslyn声明，即使关闭relation文件也生效；模糊/重复匹配不升级精度。
- 纯XML缺少的返回类型、参数名和by-ref修饰信息明确保留未知，不根据自然语言注释或参数注释顺序猜测。
- Adds display signatures to XML/Roslyn HIA symbols. Exact unique source matches enrich XML-derived HIA even without a relation file. XML-only gaps remain explicit; localized comments and member identities are retained.

## 0.1.9 — 2026-08-09

### 变化 / Changes

- 六个公开包统一到 `0.1.9`，并保持所有 `@hia-doc/dotnetdoc-*` 内部依赖使用同一 exact patch line。
- 增加 project-relative project discovery 与 XML documentation → C# declaration source relation metadata。
- relation 分别报告 resolution、confidence 与 provenance，并把稳定 project identity 投影给 HIA document consumer。
- producer、runner、XML 与 Roslyn extraction artifact 报告新的 package version，但既有 `0.1.0-draft` wire contract
  identity 不变。
- 六个包已通过 GitHub Actions OIDC Trusted Publishing 发布，registry SHA-512 integrity、SLSA provenance v1 与
  registry-only producer/consumer smoke 均已验证。

- Aligns all six public packages on `0.1.9` with one exact internal `@hia-doc/dotnetdoc-*` patch line.
- Adds project-relative project discovery and XML-documentation-to-C#-declaration source-relation metadata.
- Reports resolution, confidence, and provenance independently and projects stable project identity to HIA document consumers.
- Updates producer, runner, XML, and Roslyn extraction package versions without changing existing `0.1.0-draft` wire identities.
- Publishes all six packages through GitHub Actions OIDC Trusted Publishing, with registry SHA-512 integrity, SLSA provenance
  v1, and registry-only producer/consumer smoke verified.

### 隐私、兼容性与限制 / Privacy, compatibility, and limits

- 本版本为 additive patch，不删除公开 API；默认保持 `sourcesContentPolicy: none`，不在 relation/discovery artifact 中嵌入
  source body 或绝对 workspace path。
- project-file 解析是轻量、non-executing discovery，不等同于完整 MSBuildWorkspace/restore 语义。
- 目标项目接入、配置与采用不属于本版本发布事实。

- This additive patch removes no public API and keeps `sourcesContentPolicy: none`; relation/discovery artifacts embed neither
  source bodies nor absolute workspace paths.
- Project-file parsing remains lightweight, non-executing discovery rather than full MSBuildWorkspace/restore semantics.
- Target-project integration, configuration, and adoption are separate from this package release.
