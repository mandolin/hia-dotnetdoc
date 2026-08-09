# 变更日志 / Changelog

本文件记录 DotNetDoc 用户可见变化。标记为 Unreleased 的版本尚未发布到 npm registry。

This file records user-visible DotNetDoc changes. Versions marked Unreleased have not been published to the npm registry.

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
