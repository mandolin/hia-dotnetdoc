/**
 * @file
 * @lang zh-CN 运行器公开ESM入口，配置读取与执行严格分开。
 * @lang en Public runner ESM entry separating config reading from execution.
 */
export type * from './api-types.mjs';
import type { DotnetDocRecord, DotnetDocArtifact, DotnetDocWarningArtifact, DotnetDocHiaDocument } from '@hia-doc/dotnetdoc-spec';
import type { DotnetDocRequest, DotnetDocConfig, DotnetDocCurrentConfig, DotnetDocContext, DotnetDocResult } from './api-types.mjs';
/**
 * @lang zh-CN 领域合同名称，用于精确读写身份匹配（DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT）。
 * @lang en Exact DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT: "dotnetdoc-build-warning-classification";
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT_VERSION）。
 * @lang en Exact DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_BUILD_WARNING_CLASSIFICATION_CONTRACT_VERSION: "1.0.0";
/**
 * @lang zh-CN 本地schema资源，不代表在线发布或授权执行（DOTNETDOC_CONFIG_JSON_SCHEMA）。
 * @lang en Exact DOTNETDOC_CONFIG_JSON_SCHEMA registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_CONFIG_JSON_SCHEMA: Readonly<Record<string, unknown>>;
/**
 * @lang zh-CN 本地schema资源，不代表在线发布或授权执行（DOTNETDOC_CONFIG_SCHEMA_ID）。
 * @lang en Exact DOTNETDOC_CONFIG_SCHEMA_ID registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_CONFIG_SCHEMA_ID: "https://mandolin.github.io/HIA-Documentation/schemas/dotnetdoc-config-1.0.0.schema.json";
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_CONFIG_SCHEMA_VERSION）。
 * @lang en Exact DOTNETDOC_CONFIG_SCHEMA_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_CONFIG_SCHEMA_VERSION: "1.0.0";
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION）。
 * @lang en Exact DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION: "1.1.0";
/**
 * @lang zh-CN 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_INPUT_KINDS）。
 * @lang en Exact DOTNETDOC_INPUT_KINDS registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_INPUT_KINDS: readonly ["dotnet-xml-doc","dotnet-csharp-source","dotnet-aspnet-surface","dotnet-markup-comments","dotnet-project"];
/**
 * @lang zh-CN 保留旧身份或schema，不原位更新历史（DOTNETDOC_LEGACY_CONFIG_JSON_SCHEMA）。
 * @lang en Exact DOTNETDOC_LEGACY_CONFIG_JSON_SCHEMA registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_LEGACY_CONFIG_JSON_SCHEMA: Readonly<Record<string, unknown>>;
/**
 * @lang zh-CN 保留旧身份或schema，不原位更新历史（DOTNETDOC_LEGACY_CONFIG_SCHEMA_ID）。
 * @lang en Exact DOTNETDOC_LEGACY_CONFIG_SCHEMA_ID registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_LEGACY_CONFIG_SCHEMA_ID: "https://mandolin.github.io/HIA-Documentation/schemas/dotnetdoc-config-0.1.0-draft.schema.json";
/**
 * @lang zh-CN 保留旧身份或schema，不原位更新历史（DOTNETDOC_LEGACY_CONFIG_SCHEMA_VERSION）。
 * @lang en Exact DOTNETDOC_LEGACY_CONFIG_SCHEMA_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_LEGACY_CONFIG_SCHEMA_VERSION: "0.1.0-draft";
/**
 * @lang zh-CN 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_OUTPUT_KINDS）。
 * @lang en Exact DOTNETDOC_OUTPUT_KINDS registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_OUTPUT_KINDS: readonly ["dotnetdoc-extraction","hia-document","doc-source-map","dotnetdoc-source-relation","dotnetdoc-aspnet-endpoint-extraction","dotnetdoc-markup-comment-extraction","dotnetdoc-project-discovery"];
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_RUNNER_VERSION）。
 * @lang en Exact DOTNETDOC_RUNNER_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_RUNNER_VERSION: "1.0.0";
/**
 * @lang zh-CN 显式请求执行；默认cwd/dist目录，写结果/关系默认true、地图false；读输入/写输出与helper缓存；前置拒绝/I/O可reject，单项错误归partial/failed。
 * @lang en Executes explicit requests with cwd/dist defaults, result/relation writes true and maps false; reads inputs and writes outputs/helper caches, may reject preflight/I/O errors, and reports per-input failures as partial/failed.
 * @param request <lang><zh-CN>调用方明确提供的请求，路径与输入范围由对应运行入口继续校验。</zh-CN><en>The explicit caller request, with paths and input scope checked by the corresponding runtime entry.</en></lang>
 * @param context <lang><zh-CN>可选宿主服务上下文，宿主仍负责执行及公开权限。</zh-CN><en>Optional host-service context, with execution and publication authority retained by the host.</en></lang>
 * @returns <lang><zh-CN>每项输入的状态、输出工件与诊断汇总。</zh-CN><en>Aggregated per-input statuses, output artifacts and diagnostics.</en></lang>
 * @throws <lang><zh-CN>请求、源读取或所需工具不满足此入口已声明边界时，Promise拒绝。</zh-CN><en>The promise rejects when requests, source reads or required tools violate this entry's declared boundaries.</en></lang>
 */
export function runDotnetDoc(request: DotnetDocRequest, context?: DotnetDocContext): Promise<DotnetDocResult>;
/**
 * @lang zh-CN 同步纯诊断分类，无构建/源码I/O，不是门禁通过认证；非数组TypeError。
 * @lang en Synchronous pure diagnostic classification without builds/source I/O or gate-pass certification; nonarrays throw TypeError.
 * @param diagnostics <lang><zh-CN>待纯分类的构建诊断字符串或记录数组。</zh-CN><en>Array of build-diagnostic strings or records for pure classification.</en></lang>
 * @returns <lang><zh-CN>当前版本的纯构建警告分类工件。</zh-CN><en>A current-version pure build-warning classification artifact.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function classifyDotnetBuildDiagnostics(diagnostics: Array<string | DotnetDocRecord>): DotnetDocWarningArtifact<'1.0.0'>;
/**
 * @lang zh-CN 读取JSON并相对配置目录解析workspace，输出相对workspace；默认cwd为进程cwd，不执行输入项目；I/O/身份/结构错误reject。
 * @lang en Reads JSON and resolves workspace relative to the config directory and output relative to workspace; defaults cwd to process cwd without input-project execution, rejecting I/O/identity/shape errors.
 * @param configPath <lang><zh-CN>相对于可选cwd解析的JSON配置文件定位器。</zh-CN><en>JSON config file locator resolved relative to the optional cwd.</en></lang>
 * @param options <lang><zh-CN>可选cwd，省略使用当前进程目录。</zh-CN><en>Optional cwd, defaulting to the current process directory.</en></lang>
 * @returns <lang><zh-CN>相对目录已解析的显式运行请求。</zh-CN><en>An explicit run request with relative directories resolved.</en></lang>
 * @throws <lang><zh-CN>请求、源读取或所需工具不满足此入口已声明边界时，Promise拒绝。</zh-CN><en>The promise rejects when requests, source reads or required tools violate this entry's declared boundaries.</en></lang>
 */
export function loadDotnetDocConfig(configPath: string, options?: { cwd?: string }): Promise<DotnetDocRequest & { workspaceRoot: string; outputDirectory: string }>;
/**
 * @lang zh-CN 纯读取返回原对象，旧版保留默认规则，新版拒绝null/错型；未知身份TypeError，不填目录或执行。
 * @lang en Purely reads and returns the original, retaining legacy defaults while current config rejects null/wrong types; unknown identities throw TypeError without filling directories or executing.
 * @param value <lang><zh-CN>需按对应读取、复制或迁移入口校验的外部数据。</zh-CN><en>External data validated by the corresponding read, clone or migration entry.</en></lang>
 * @returns <lang><zh-CN>已通过精确身份和结构读取的原配置对象。</zh-CN><en>The original config after exact identity and structural reading.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function readDotnetDocConfig(value: unknown): DotnetDocConfig;
/**
 * @lang zh-CN 仅精确旧配置显式迁移，新对象只改根身份，不能无损表达则TypeError。
 * @lang en Explicitly migrates exact legacy configs into a new object with root-only identity changes, throwing TypeError when lossless representation is impossible.
 * @param value <lang><zh-CN>需按对应读取、复制或迁移入口校验的外部数据。</zh-CN><en>External data validated by the corresponding read, clone or migration entry.</en></lang>
 * @returns <lang><zh-CN>显式迁移后的独立当前配置。</zh-CN><en>An independent current config produced by explicit migration.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function migrateDotnetDocConfig(value: unknown): DotnetDocCurrentConfig;
/**
 * @lang zh-CN 按精确版本/schemaID选择本地schema，未知undefined，无网络I/O。
 * @lang en Selects a local schema by exact version/schema ID, returning undefined for unknown values without network I/O.
 * @param identity <lang><zh-CN>精确版本或Schema身份，不执行模糊版本选择。</zh-CN><en>Exact version or schema identity, without fuzzy version selection.</en></lang>
 * @returns <lang><zh-CN>匹配的只读本地Schema，未知身份为undefined。</zh-CN><en>The matching readonly local schema, or undefined for an unknown identity.</en></lang>
 */
export function getDotnetDocConfigSchema(identity: string): Readonly<Record<string, unknown>> | undefined;
/**
 * @lang zh-CN 纯构造1.1.0文档源码地图，调用方必须先realpath核验verifiedSourcePaths；非法身份/路径/错配TypeError，不读取源码或推断XML位置。
 * @lang en Purely builds a 1.1.0 documentation source map; callers must realpath-verify verifiedSourcePaths first; invalid identities/paths/mismatches throw TypeError without source reads or XML-position inference.
 * @param options <lang><zh-CN>本次工件与文档定位、预先核验的源码路径集合及生产器版本。</zh-CN><en>Current artifact/document locators, previously verified source paths and producer version.</en></lang>
 * @returns <lang><zh-CN>声明与文档来源分别登记的1.1.0地图工件。</zh-CN><en>A 1.1.0 map artifact recording declaration and documentation provenance separately.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function createDotnetDocSourceMap(options: { record: { artifact: DotnetDocArtifact; hiaDocument: DotnetDocHiaDocument; artifactPath: string; hiaPath: string }; verifiedSourcePaths: Set<string>; producerVersion: string }): DotnetDocRecord & { contract: 'doc-source-map'; contractVersion: '1.1.0' };
