# Migrating @hia-doc/dotnet-xml-doc-extractor to 1.0.0

Previous package release: 0.1.12.

中文：六个包与其内部精确依赖协调升级为1.0.0；这是源码候选版本，实际registry可用性应另行核验。不要仅改旧工件版本号，或把类型检查当隐私/导航精度验收。

## Package and runtime changes

Upgrade the six-package cohort together. Internal dependencies use exact 1.0.0, with MIT packages and the existing permissive dependency review retained. Node.js 22/24 and .NET SDK/runtime 10 are the supported tool environment. The bundled helper SDK policy is selected independently from an input project's `global.json`. Reading an old project does not execute it or require changing its target framework.

## Wire compatibility

Package version, domain contract, configuration, SDK producer/result, HIA document, i18n and source-map identities are independent. New config and seven domain artifacts use 1.0.0; exact 0.1.0-draft data remains readable. SDK producer/result use 1.0.0; HIA document/i18n remain 0.2.0; documentation source maps remain 1.1.0. Unknown or mismatched identities are rejected.

Use `readDotnetDocArtifact` / `migrateDotnetDocArtifact` from `@hia-doc/dotnetdoc-spec` for seven domain artifacts, and `readDotnetDocConfig` / `migrateDotnetDocConfig` from `@hia-doc/dotnetdoc-runner` for configs. Reading returns the original; explicit migration returns an independent object and changes only root identity plus an existing root schema reference. Nested provenance still identifies the real old producer/artifact. Already-current or non-lossless input is rejected by migration. No automatic migration occurs in adapters or loaders.

Current config may omit directories for existing defaults but refuses explicit null and wrong types. Legacy reading retains omission/null defaults; legacy values that depend on coercion/null and cannot be represented losslessly are not migrated. Input kind remains explicit; no new syntax or analyzer scope is implied.

## TypeScript and callers

The new `.d.mts` entry models actual ESM root exports. Compile with NodeNext and strict checking. Callers formerly relying on implicit JS types must narrow unknown metadata/nested domain fields and handle the exact legacy/current union. No deep private-module imports or CommonJS declaration promise is added. Types do not replace JSON validation.

## Verification before adoption

Install original cohort archives with ordinary npm resolution, run your real config through the owned helper, validate SDK output through the SDK, and compare bilingual content and source-map reading. Do not treat XML file locations as code definitions; hosts still authorize source previews separately. See [API](API.md) and [README](README.md).
