/**
 * @file
 * @lang zh-CN 领域合同公开ESM入口，导出保守类型与精确身份。
 * @lang en Public domain-contract ESM entry exporting conservative types and exact identities.
 */
export type * from './contracts.mjs';
import type { DotnetDocJson, DotnetDocArtifact, DotnetDocArtifactProfile } from './contracts.mjs';
/**
 * @lang zh-CN 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_ARTIFACT_CONTRACTS）。
 * @lang en Exact DOTNETDOC_ARTIFACT_CONTRACTS registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_ARTIFACT_CONTRACTS: readonly ["dotnetdoc-xml-doc-extraction","dotnetdoc-csharp-source-extraction","dotnetdoc-source-relation","dotnetdoc-aspnet-endpoint-extraction","dotnetdoc-markup-comment-extraction","dotnetdoc-project-discovery","dotnetdoc-build-warning-classification"];
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_ARTIFACT_VERSION）。
 * @lang en Exact DOTNETDOC_ARTIFACT_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_ARTIFACT_VERSION: "1.0.0";
/**
 * @lang zh-CN 领域合同名称，用于精确读写身份匹配（DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT）。
 * @lang en Exact DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT: "dotnetdoc-aspnet-endpoint-extraction";
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION）。
 * @lang en Exact DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION: "1.0.0";
/**
 * @lang zh-CN 领域合同名称，用于精确读写身份匹配（DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT）。
 * @lang en Exact DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT: "dotnetdoc-csharp-source-extraction";
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION）。
 * @lang en Exact DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION: "1.0.0";
/**
 * @lang zh-CN 保留旧身份或schema，不原位更新历史（DOTNETDOC_LEGACY_ARTIFACT_VERSION）。
 * @lang en Exact DOTNETDOC_LEGACY_ARTIFACT_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_LEGACY_ARTIFACT_VERSION: "0.1.0-draft";
/**
 * @lang zh-CN 领域合同名称，用于精确读写身份匹配（DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT）。
 * @lang en Exact DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT: "dotnetdoc-markup-comment-extraction";
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT_VERSION）。
 * @lang en Exact DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT_VERSION: "1.0.0";
/**
 * @lang zh-CN 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_MARKUP_COMMENT_KINDS）。
 * @lang en Exact DOTNETDOC_MARKUP_COMMENT_KINDS registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_MARKUP_COMMENT_KINDS: readonly ["webforms-server-comment","razor-comment","html-comment"];
/**
 * @lang zh-CN 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_MEMBER_PREFIXES）。
 * @lang en Exact DOTNETDOC_MEMBER_PREFIXES registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_MEMBER_PREFIXES: Readonly<{"event":"E:","field":"F:","method":"M:","namespace":"N:","property":"P:","type":"T:"}>;
/**
 * @lang zh-CN 领域合同名称，用于精确读写身份匹配（DOTNETDOC_PROJECT_DISCOVERY_CONTRACT）。
 * @lang en Exact DOTNETDOC_PROJECT_DISCOVERY_CONTRACT registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_PROJECT_DISCOVERY_CONTRACT: "dotnetdoc-project-discovery";
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_PROJECT_DISCOVERY_CONTRACT_VERSION）。
 * @lang en Exact DOTNETDOC_PROJECT_DISCOVERY_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_PROJECT_DISCOVERY_CONTRACT_VERSION: "1.0.0";
/**
 * @lang zh-CN 来源隐私或静态身份策略，不授予源码公开权限（DOTNETDOC_PROJECT_IDENTITY_POLICY）。
 * @lang en Exact DOTNETDOC_PROJECT_IDENTITY_POLICY registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_PROJECT_IDENTITY_POLICY: "project-relative-owner-resolved";
/**
 * @lang zh-CN 来源隐私或静态身份策略，不授予源码公开权限（DOTNETDOC_SOURCES_CONTENT_POLICY）。
 * @lang en Exact DOTNETDOC_SOURCES_CONTENT_POLICY registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_SOURCES_CONTENT_POLICY: "none";
/**
 * @lang zh-CN 领域合同名称，用于精确读写身份匹配（DOTNETDOC_SOURCE_RELATION_CONTRACT）。
 * @lang en Exact DOTNETDOC_SOURCE_RELATION_CONTRACT registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_SOURCE_RELATION_CONTRACT: "dotnetdoc-source-relation";
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_SOURCE_RELATION_CONTRACT_VERSION）。
 * @lang en Exact DOTNETDOC_SOURCE_RELATION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_SOURCE_RELATION_CONTRACT_VERSION: "1.0.0";
/**
 * @lang zh-CN 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_XML_DOCUMENTATION_TAGS）。
 * @lang en Exact DOTNETDOC_XML_DOCUMENTATION_TAGS registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_XML_DOCUMENTATION_TAGS: readonly ["summary","remarks","param","typeparam","returns","exception","see","seealso","lang","l","div","para"];
/**
 * @lang zh-CN 领域合同名称，用于精确读写身份匹配（DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT）。
 * @lang en Exact DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT: "dotnetdoc-xml-doc-extraction";
/**
 * @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION）。
 * @lang en Exact DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions.
 */
export const DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION: "1.0.0";
/**
 * @lang zh-CN 纯函数按成员前缀返回kind，未知返回dotnet-member，不查源码。
 * @lang en Purely maps member prefixes to kinds, returning dotnet-member for unknown prefixes without source lookup.
 * @param memberName <lang><zh-CN>原始XML文档成员名或带种类前缀的成员身份。</zh-CN><en>Original XML documentation member name or kind-prefixed member identity.</en></lang>
 * @returns <lang><zh-CN>匹配的成员种类，未知前缀为dotnet-member。</zh-CN><en>The matching member kind, or dotnet-member for unknown prefixes.</en></lang>
 */
export function getDotnetDocMemberKind(memberName: string): string;
/**
 * @lang zh-CN 精确检查受支持XML标签，无副作用。
 * @lang en Exactly checks supported XML tags without side effects.
 * @param tag <lang><zh-CN>需精确检查的XML文档标签名。</zh-CN><en>XML documentation tag name to check exactly.</en></lang>
 * @returns <lang><zh-CN>输入是否为当前支持的XML文档标签。</zh-CN><en>Whether the input is a currently supported XML documentation tag.</en></lang>
 */
export function isDotnetDocXmlDocumentationTag(tag: string): boolean;
/**
 * @lang zh-CN 只检查XML/C#合同名，不代表工件已校验。
 * @lang en Checks XML/C# contract names only, without claiming artifact validation.
 * @param contract <lang><zh-CN>需精确匹配的领域契约名称。</zh-CN><en>Domain contract name to match exactly.</en></lang>
 * @returns <lang><zh-CN>输入是否为受支持的XML或C#成员提取契约名。</zh-CN><en>Whether the input names a supported XML or C# member extraction contract.</en></lang>
 */
export function isDotnetDocMemberExtractionContract(contract: string): boolean;
/**
 * @lang zh-CN 独立复制普通JSON，保持-0与扩展值；非JSON、代理/访问器/循环抛TypeError，不执行I/O。
 * @lang en Independently clones ordinary JSON, retaining -0 and extensions; non-JSON, proxies/accessors/cycles throw TypeError without I/O.
 * @param value <lang><zh-CN>需按对应读取、复制或迁移入口校验的外部数据。</zh-CN><en>External data validated by the corresponding read, clone or migration entry.</en></lang>
 * @returns <lang><zh-CN>按既有JSON规则创建的独立数据副本。</zh-CN><en>An independent data copy created under the existing JSON rules.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function cloneDotnetDocJson(value: unknown): DotnetDocJson;
/**
 * @lang zh-CN 精确合同名及版本/schemaID选择，未知返回undefined，不联网。
 * @lang en Selects an exact contract and version/schema ID, returning undefined for unknown values without network access.
 * @param contract <lang><zh-CN>需精确匹配的领域契约名称。</zh-CN><en>Domain contract name to match exactly.</en></lang>
 * @param identity <lang><zh-CN>精确版本或Schema身份，不执行模糊版本选择。</zh-CN><en>Exact version or schema identity, without fuzzy version selection.</en></lang>
 * @returns <lang><zh-CN>按精确契约和身份选择的Schema，未知为undefined。</zh-CN><en>The schema selected by exact contract and identity, or undefined when unknown.</en></lang>
 */
export function getDotnetDocArtifactSchema(contract: string, identity: string): Readonly<Record<string, unknown>> | undefined;
/**
 * @lang zh-CN 同一精确规则选择只读静态profile，未知undefined，不代表执行许可。
 * @lang en Selects a readonly static profile under the same exact rules, returning undefined for unknown identities without granting execution permission.
 * @param contract <lang><zh-CN>需精确匹配的领域契约名称。</zh-CN><en>Domain contract name to match exactly.</en></lang>
 * @param identity <lang><zh-CN>精确版本或Schema身份，不执行模糊版本选择。</zh-CN><en>Exact version or schema identity, without fuzzy version selection.</en></lang>
 * @returns <lang><zh-CN>按精确契约和身份选择的只读规范，未知为undefined。</zh-CN><en>The readonly profile selected by exact contract and identity, or undefined when unknown.</en></lang>
 */
export function getDotnetDocArtifactProfile(contract: string, identity: string): Readonly<DotnetDocArtifactProfile> | undefined;
/**
 * @lang zh-CN 校验两代七类工件并返回原对象，错误TypeError；不认证metadata公开安全。
 * @lang en Validates seven artifacts across two generations and returns the original, throwing TypeError on errors without certifying metadata publication safety.
 * @param value <lang><zh-CN>需按对应读取、复制或迁移入口校验的外部数据。</zh-CN><en>External data validated by the corresponding read, clone or migration entry.</en></lang>
 * @returns <lang><zh-CN>已通过受支持契约读取的原工件对象。</zh-CN><en>The original artifact after reading its supported contract.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function readDotnetDocArtifact(value: unknown): DotnetDocArtifact;
/**
 * @lang zh-CN 只接受精确旧件并返回新副本，仅根身份更新；未知/已迁移/无法无损则TypeError，无I/O。
 * @lang en Accepts only exact legacy data and returns a new copy with root identity changes; unknown/already-migrated/non-lossless values throw TypeError without I/O.
 * @param value <lang><zh-CN>需按对应读取、复制或迁移入口校验的外部数据。</zh-CN><en>External data validated by the corresponding read, clone or migration entry.</en></lang>
 * @returns <lang><zh-CN>保持原数据语义的当前版本独立工件。</zh-CN><en>An independent current-version artifact retaining the original data semantics.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function migrateDotnetDocArtifact(value: unknown): DotnetDocArtifact<'1.0.0'>;
