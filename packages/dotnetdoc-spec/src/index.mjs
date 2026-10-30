/**
 * Contract name for compiler XML documentation extraction artifacts.
 *
 * @lang zh-CN 编译器 XML documentation comments 抽取产物的合同名称。
 */
export const DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT = "dotnetdoc-xml-doc-extraction";

/**
 * Stable current contract version for compiler XML documentation extraction artifacts.
 *
 * @lang zh-CN 编译器XML文档提取的稳定新版本，旧身份读取另保留。
 */
export const DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION = "1.0.0";

/**
 * Contract name for Roslyn-backed C# source extraction artifacts.
 *
 * @lang zh-CN Roslyn 驱动的 C# 源码抽取产物合同名称。
 */
export const DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT = "dotnetdoc-csharp-source-extraction";

/**
 * Stable current contract version for Roslyn-backed C# source extraction artifacts.
 *
 * @lang zh-CN Roslyn驱动C#源码提取的稳定新版本，精确旧读保留。
 */
export const DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION = "1.0.0";

/**
 * Contract name for relation artifacts that connect XML docs, C# declarations and HIA symbols.
 *
 * @lang zh-CN 连接 XML documentation、C# declaration 与 HIA symbol 的关系产物合同名称。
 */
export const DOTNETDOC_SOURCE_RELATION_CONTRACT = "dotnetdoc-source-relation";

/**
 * Stable current contract version for DotNetDoc source relation artifacts.
 *
 * @lang zh-CN DotNetDoc源码关系的稳定新版本，不重写历史引用。
 */
export const DOTNETDOC_SOURCE_RELATION_CONTRACT_VERSION = "1.0.0";

/**
 * Contract name for static ASP.NET endpoint extraction artifacts.
 *
 * @lang zh-CN ASP.NET静态端点提取合同，不等于运行时端点发现。
 */
export const DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT = "dotnetdoc-aspnet-endpoint-extraction";

/**
 * Stable current version for static ASP.NET endpoint extraction artifacts.
 *
 * @lang zh-CN ASP.NET静态端点提取的稳定新版本，精确旧读保留。
 */
export const DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION = "1.0.0";

/**
 * Contract name for ASP.NET and Razor markup comment extraction artifacts.
 *
 * @lang zh-CN ASP.NET 与 Razor 标记层非 XML 注释抽取产物的合同名称。
 */
export const DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT = "dotnetdoc-markup-comment-extraction";

/**
 * Stable current contract version for ASP.NET and Razor markup comment extraction artifacts.
 *
 * @lang zh-CN ASP.NET与Razor标记注释提取的稳定新版本，精确旧读保留。
 */
export const DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT_VERSION = "1.0.0";

/**
 * Contract name for static .NET solution and project discovery artifacts.
 *
 * @lang zh-CN .NET解决方案与项目静态发现合同名称。
 */
export const DOTNETDOC_PROJECT_DISCOVERY_CONTRACT = "dotnetdoc-project-discovery";

/**
 * Stable current version for static .NET solution and project discovery artifacts.
 *
 * @lang zh-CN .NET解决方案与项目静态发现的稳定新版本，不引入项目执行。
 */
export const DOTNETDOC_PROJECT_DISCOVERY_CONTRACT_VERSION = "1.0.0";

/**
 * Stable identity policy shared by DotNetDoc project discovery and source relations.
 *
 * @lang zh-CN DotNetDoc project discovery 与 source relation 共享的稳定 identity policy；identity 只使用工作区相对 project path。
 */
export const DOTNETDOC_PROJECT_IDENTITY_POLICY = "project-relative-owner-resolved";

/**
 * Source-content privacy policy for metadata-only DotNetDoc discovery and relation artifacts.
 *
 * @lang zh-CN metadata-only DotNetDoc discovery 与 relation 产物的源码内容隐私策略；产物不得嵌入 source body。
 */
export const DOTNETDOC_SOURCES_CONTENT_POLICY = "none";

/**
 * XML documentation tags accepted by the first DotNetDoc intake layer.
 *
 * @lang zh-CN 第一层 DotNetDoc intake 接受的 XML documentation tag。
 */
export const DOTNETDOC_XML_DOCUMENTATION_TAGS = Object.freeze([
  "summary",
  "remarks",
  "param",
  "typeparam",
  "returns",
  "exception",
  "see",
  "seealso",
  "lang",
  "l",
  "div",
  "para"
]);

/**
 * Markup comment syntax kinds recognized by the first DotNetDoc markup intake layer.
 *
 * @lang zh-CN 第一层 DotNetDoc markup intake 识别的标记层注释语法类型。
 */
export const DOTNETDOC_MARKUP_COMMENT_KINDS = Object.freeze([
  "webforms-server-comment",
  "razor-comment",
  "html-comment"
]);

/**
 * Known .NET documentation member id prefixes.
 *
 * @lang zh-CN 已知的 .NET documentation member id 前缀。
 */
export const DOTNETDOC_MEMBER_PREFIXES = Object.freeze({
  event: "E:",
  field: "F:",
  method: "M:",
  namespace: "N:",
  property: "P:",
  type: "T:"
});

const PREFIX_TO_KIND = Object.freeze({
  "E:": "dotnet-event",
  "F:": "dotnet-field",
  "M:": "dotnet-method",
  "N:": "dotnet-namespace",
  "P:": "dotnet-property",
  "T:": "dotnet-type"
});

/**
 * Resolve a .NET XML documentation member id to a DotNetDoc symbol kind.
 *
 * @param {string} memberName <lang><en>Compiler XML documentation member id.</en><zh-CN>编译器 XML documentation member id。</zh-CN></lang>
 * @returns {string} <lang><en>DotNetDoc symbol kind.</en><zh-CN>DotNetDoc 符号类型。</zh-CN></lang>
 * @lang zh-CN 将 .NET XML documentation member id 解析为 DotNetDoc symbol kind。
 */
export function getDotnetDocMemberKind(memberName) {
  const prefix = String(memberName).slice(0, 2);
  return PREFIX_TO_KIND[prefix] ?? "dotnet-member";
}

/**
 * Check whether a tag is part of the first DotNetDoc XML documentation intake.
 *
 * @param {string} tag <lang><en>XML documentation tag name.</en><zh-CN>XML documentation tag 名称。</zh-CN></lang>
 * @returns {boolean} <lang><en>Whether the tag is recognized.</en><zh-CN>该 tag 是否被识别。</zh-CN></lang>
 * @lang zh-CN 检查 tag 是否属于第一层 DotNetDoc XML documentation intake。
 */
export function isDotnetDocXmlDocumentationTag(tag) {
  return DOTNETDOC_XML_DOCUMENTATION_TAGS.includes(tag);
}

/**
 * Check whether a contract is a DotNetDoc member extraction artifact.
 *
 * @param {string} contract <lang><en>Artifact contract name.</en><zh-CN>产物合同名称。</zh-CN></lang>
 * @returns {boolean} <lang><en>Whether the contract exposes DotNetDoc members.</en><zh-CN>该合同是否暴露 DotNetDoc member。</zh-CN></lang>
 * @lang zh-CN 检查合同是否属于 DotNetDoc member 抽取产物。
 */
export function isDotnetDocMemberExtractionContract(contract) {
  return [
    DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT,
    DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT
  ].includes(contract);
}

/** 精确两代领域工件的schema/profile读取与无损迁移；不执行宿主动作。 @lang en Exact dual-generation artifact schema/profile reading and lossless migration without host actions. */
export {
  DOTNETDOC_ARTIFACT_CONTRACTS,
  DOTNETDOC_LEGACY_ARTIFACT_VERSION,
  DOTNETDOC_ARTIFACT_VERSION,
  getDotnetDocArtifactSchema,
  getDotnetDocArtifactProfile,
  readDotnetDocArtifact,
  migrateDotnetDocArtifact
} from './artifact-contracts.mjs';
/** 无副作用的普通JSON复制，用于跨包配置迁移且不执行getter。 @lang en Side-effect-free ordinary-JSON copying for cross-package config migration without invoking getters. */
export { cloneDotnetDocJson } from './json-value.mjs';
