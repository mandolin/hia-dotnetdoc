/** @file 运行器公开ESM入口，配置读取与执行严格分开。 @lang en Public runner ESM entry separating config reading from execution. */
export type * from './api-types.mjs';
import type { DotnetDocRecord, DotnetDocArtifact, DotnetDocWarningArtifact, DotnetDocHiaDocument } from '@hia-doc/dotnetdoc-spec';
import type { DotnetDocRequest, DotnetDocConfig, DotnetDocCurrentConfig, DotnetDocContext, DotnetDocResult } from './api-types.mjs';
/** 领域合同名称，用于精确读写身份匹配（DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT）。 @lang en Exact DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT: "dotnetdoc-build-warning-classification";
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT_VERSION）。 @lang en Exact DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT_VERSION: "1.0.0";
/** 本地schema资源，不代表在线发布或授权执行（DOTNETDOC_CONFIG_JSON_SCHEMA）。 @lang en Exact DOTNETDOC_CONFIG_JSON_SCHEMA registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_CONFIG_JSON_SCHEMA: Readonly<Record<string, unknown>>;
/** 本地schema资源，不代表在线发布或授权执行（DOTNETDOC_CONFIG_SCHEMA_ID）。 @lang en Exact DOTNETDOC_CONFIG_SCHEMA_ID registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_CONFIG_SCHEMA_ID: "https://mandolin.github.io/HIA-Documentation/schemas/dotnetdoc-config-1.0.0.schema.json";
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_CONFIG_SCHEMA_VERSION）。 @lang en Exact DOTNETDOC_CONFIG_SCHEMA_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_CONFIG_SCHEMA_VERSION: "1.0.0";
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION）。 @lang en Exact DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION: "1.1.0";
/** 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_INPUT_KINDS）。 @lang en Exact DOTNETDOC_INPUT_KINDS registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_INPUT_KINDS: readonly ["dotnet-xml-doc","dotnet-csharp-source","dotnet-aspnet-surface","dotnet-markup-comments","dotnet-project"];
/** 保留旧身份或schema，不原位更新历史（DOTNETDOC_LEGACY_CONFIG_JSON_SCHEMA）。 @lang en Exact DOTNETDOC_LEGACY_CONFIG_JSON_SCHEMA registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_LEGACY_CONFIG_JSON_SCHEMA: Readonly<Record<string, unknown>>;
/** 保留旧身份或schema，不原位更新历史（DOTNETDOC_LEGACY_CONFIG_SCHEMA_ID）。 @lang en Exact DOTNETDOC_LEGACY_CONFIG_SCHEMA_ID registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_LEGACY_CONFIG_SCHEMA_ID: "https://mandolin.github.io/HIA-Documentation/schemas/dotnetdoc-config-0.1.0-draft.schema.json";
/** 保留旧身份或schema，不原位更新历史（DOTNETDOC_LEGACY_CONFIG_SCHEMA_VERSION）。 @lang en Exact DOTNETDOC_LEGACY_CONFIG_SCHEMA_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_LEGACY_CONFIG_SCHEMA_VERSION: "0.1.0-draft";
/** 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_OUTPUT_KINDS）。 @lang en Exact DOTNETDOC_OUTPUT_KINDS registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_OUTPUT_KINDS: readonly ["dotnetdoc-extraction","hia-document","doc-source-map","dotnetdoc-source-relation","dotnetdoc-aspnet-endpoint-extraction","dotnetdoc-markup-comment-extraction","dotnetdoc-project-discovery"];
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_RUNNER_VERSION）。 @lang en Exact DOTNETDOC_RUNNER_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_RUNNER_VERSION: "1.0.0";
/** 显式请求执行；默认cwd/dist目录，写结果/关系默认true、地图false；读输入/写输出与helper缓存；前置拒绝/I/O可reject，单项错误归partial/failed。 @lang en Executes explicit requests with cwd/dist defaults, result/relation writes true and maps false; reads inputs and writes outputs/helper caches, may reject preflight/I/O errors, and reports per-input failures as partial/failed. */
export function runDotnetDoc(request: DotnetDocRequest, context?: DotnetDocContext): Promise<DotnetDocResult>;
/** 同步纯诊断分类，无构建/源码I/O，不是门禁通过认证；非数组TypeError。 @lang en Synchronous pure diagnostic classification without builds/source I/O or gate-pass certification; nonarrays throw TypeError. */
export function classifyDotnetBuildDiagnostics(diagnostics: Array<string | DotnetDocRecord>): DotnetDocWarningArtifact<'1.0.0'>;
/** 读取JSON并相对配置目录解析workspace，输出相对workspace；默认cwd为进程cwd，不执行输入项目；I/O/身份/结构错误reject。 @lang en Reads JSON and resolves workspace relative to the config directory and output relative to workspace; defaults cwd to process cwd without input-project execution, rejecting I/O/identity/shape errors. */
export function loadDotnetDocConfig(configPath: string, options?: { cwd?: string }): Promise<DotnetDocRequest & { workspaceRoot: string; outputDirectory: string }>;
/** 纯读取返回原对象，旧版保留默认规则，新版拒绝null/错型；未知身份TypeError，不填目录或执行。 @lang en Purely reads and returns the original, retaining legacy defaults while current config rejects null/wrong types; unknown identities throw TypeError without filling directories or executing. */
export function readDotnetDocConfig(value: unknown): DotnetDocConfig;
/** 仅精确旧配置显式迁移，新对象只改根身份，不能无损表达则TypeError。 @lang en Explicitly migrates exact legacy configs into a new object with root-only identity changes, throwing TypeError when lossless representation is impossible. */
export function migrateDotnetDocConfig(value: unknown): DotnetDocCurrentConfig;
/** 按精确版本/schemaID选择本地schema，未知undefined，无网络I/O。 @lang en Selects a local schema by exact version/schema ID, returning undefined for unknown values without network I/O. */
export function getDotnetDocConfigSchema(identity: string): Readonly<Record<string, unknown>> | undefined;
/** 纯构造1.1.0文档源码地图，调用方必须先realpath核验verifiedSourcePaths；非法身份/路径/错配TypeError，不读取源码或推断XML位置。 @lang en Purely builds a 1.1.0 documentation source map; callers must realpath-verify verifiedSourcePaths first; invalid identities/paths/mismatches throw TypeError without source reads or XML-position inference. */
export function createDotnetDocSourceMap(options: { record: { artifact: DotnetDocArtifact; hiaDocument: DotnetDocHiaDocument; artifactPath: string; hiaPath: string }; verifiedSourcePaths: Set<string>; producerVersion: string }): DotnetDocRecord & { contract: 'doc-source-map'; contractVersion: '1.1.0' };
