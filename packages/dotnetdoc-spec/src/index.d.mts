/** @file 领域合同公开ESM入口，导出保守类型与精确身份。 @lang en Public domain-contract ESM entry exporting conservative types and exact identities. */
export type * from './contracts.mjs';
import type { DotnetDocJson, DotnetDocArtifact, DotnetDocArtifactProfile } from './contracts.mjs';
/** 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_ARTIFACT_CONTRACTS）。 @lang en Exact DOTNETDOC_ARTIFACT_CONTRACTS registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_ARTIFACT_CONTRACTS: readonly ["dotnetdoc-xml-doc-extraction","dotnetdoc-csharp-source-extraction","dotnetdoc-source-relation","dotnetdoc-aspnet-endpoint-extraction","dotnetdoc-markup-comment-extraction","dotnetdoc-project-discovery","dotnetdoc-build-warning-classification"];
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_ARTIFACT_VERSION）。 @lang en Exact DOTNETDOC_ARTIFACT_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_ARTIFACT_VERSION: "1.0.0";
/** 领域合同名称，用于精确读写身份匹配（DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT）。 @lang en Exact DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT: "dotnetdoc-aspnet-endpoint-extraction";
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION）。 @lang en Exact DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION: "1.0.0";
/** 领域合同名称，用于精确读写身份匹配（DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT）。 @lang en Exact DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT: "dotnetdoc-csharp-source-extraction";
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION）。 @lang en Exact DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION: "1.0.0";
/** 保留旧身份或schema，不原位更新历史（DOTNETDOC_LEGACY_ARTIFACT_VERSION）。 @lang en Exact DOTNETDOC_LEGACY_ARTIFACT_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_LEGACY_ARTIFACT_VERSION: "0.1.0-draft";
/** 领域合同名称，用于精确读写身份匹配（DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT）。 @lang en Exact DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT: "dotnetdoc-markup-comment-extraction";
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT_VERSION）。 @lang en Exact DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT_VERSION: "1.0.0";
/** 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_MARKUP_COMMENT_KINDS）。 @lang en Exact DOTNETDOC_MARKUP_COMMENT_KINDS registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_MARKUP_COMMENT_KINDS: readonly ["webforms-server-comment","razor-comment","html-comment"];
/** 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_MEMBER_PREFIXES）。 @lang en Exact DOTNETDOC_MEMBER_PREFIXES registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_MEMBER_PREFIXES: Readonly<{"event":"E:","field":"F:","method":"M:","namespace":"N:","property":"P:","type":"T:"}>;
/** 领域合同名称，用于精确读写身份匹配（DOTNETDOC_PROJECT_DISCOVERY_CONTRACT）。 @lang en Exact DOTNETDOC_PROJECT_DISCOVERY_CONTRACT registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_PROJECT_DISCOVERY_CONTRACT: "dotnetdoc-project-discovery";
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_PROJECT_DISCOVERY_CONTRACT_VERSION）。 @lang en Exact DOTNETDOC_PROJECT_DISCOVERY_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_PROJECT_DISCOVERY_CONTRACT_VERSION: "1.0.0";
/** 来源隐私或静态身份策略，不授予源码公开权限（DOTNETDOC_PROJECT_IDENTITY_POLICY）。 @lang en Exact DOTNETDOC_PROJECT_IDENTITY_POLICY registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_PROJECT_IDENTITY_POLICY: "project-relative-owner-resolved";
/** 来源隐私或静态身份策略，不授予源码公开权限（DOTNETDOC_SOURCES_CONTENT_POLICY）。 @lang en Exact DOTNETDOC_SOURCES_CONTENT_POLICY registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_SOURCES_CONTENT_POLICY: "none";
/** 领域合同名称，用于精确读写身份匹配（DOTNETDOC_SOURCE_RELATION_CONTRACT）。 @lang en Exact DOTNETDOC_SOURCE_RELATION_CONTRACT registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_SOURCE_RELATION_CONTRACT: "dotnetdoc-source-relation";
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_SOURCE_RELATION_CONTRACT_VERSION）。 @lang en Exact DOTNETDOC_SOURCE_RELATION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_SOURCE_RELATION_CONTRACT_VERSION: "1.0.0";
/** 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_XML_DOCUMENTATION_TAGS）。 @lang en Exact DOTNETDOC_XML_DOCUMENTATION_TAGS registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_XML_DOCUMENTATION_TAGS: readonly ["summary","remarks","param","typeparam","returns","exception","see","seealso","lang","l","div","para"];
/** 领域合同名称，用于精确读写身份匹配（DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT）。 @lang en Exact DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT: "dotnetdoc-xml-doc-extraction";
/** 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION）。 @lang en Exact DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION: "1.0.0";
/** 纯函数按成员前缀返回kind，未知返回dotnet-member，不查源码。 @lang en Purely maps member prefixes to kinds, returning dotnet-member for unknown prefixes without source lookup. */
export function getDotnetDocMemberKind(memberName: string): string;
/** 精确检查受支持XML标签，无副作用。 @lang en Exactly checks supported XML tags without side effects. */
export function isDotnetDocXmlDocumentationTag(tag: string): boolean;
/** 只检查XML/C#合同名，不代表工件已校验。 @lang en Checks XML/C# contract names only, without claiming artifact validation. */
export function isDotnetDocMemberExtractionContract(contract: string): boolean;
/** 独立复制普通JSON，保持-0与扩展值；非JSON、代理/访问器/循环抛TypeError，不执行I/O。 @lang en Independently clones ordinary JSON, retaining -0 and extensions; non-JSON, proxies/accessors/cycles throw TypeError without I/O. */
export function cloneDotnetDocJson(value: unknown): DotnetDocJson;
/** 精确合同名及版本/schemaID选择，未知返回undefined，不联网。 @lang en Selects an exact contract and version/schema ID, returning undefined for unknown values without network access. */
export function getDotnetDocArtifactSchema(contract: string, identity: string): Readonly<Record<string, unknown>> | undefined;
/** 同一精确规则选择只读静态profile，未知undefined，不代表执行许可。 @lang en Selects a readonly static profile under the same exact rules, returning undefined for unknown identities without granting execution permission. */
export function getDotnetDocArtifactProfile(contract: string, identity: string): Readonly<DotnetDocArtifactProfile> | undefined;
/** 校验两代七类工件并返回原对象，错误TypeError；不认证metadata公开安全。 @lang en Validates seven artifacts across two generations and returns the original, throwing TypeError on errors without certifying metadata publication safety. */
export function readDotnetDocArtifact(value: unknown): DotnetDocArtifact;
/** 只接受精确旧件并返回新副本，仅根身份更新；未知/已迁移/无法无损则TypeError，无I/O。 @lang en Accepts only exact legacy data and returns a new copy with root identity changes; unknown/already-migrated/non-lossless values throw TypeError without I/O. */
export function migrateDotnetDocArtifact(value: unknown): DotnetDocArtifact<'1.0.0'>;
