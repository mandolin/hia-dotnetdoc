/**
 * Contract name for compiler XML documentation extraction artifacts.
 *
 * @lang zh-CN 编译器 XML documentation comments 抽取产物的合同名称。
 */
export const DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT = "dotnetdoc-xml-doc-extraction";

/**
 * Draft contract version for compiler XML documentation extraction artifacts.
 *
 * @lang zh-CN 编译器 XML documentation comments 抽取产物的草案合同版本。
 */
export const DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION = "0.1.0-draft";

/**
 * Draft contract name reserved for ASP.NET endpoint extraction artifacts.
 *
 * @lang zh-CN 预留给 ASP.NET endpoint 抽取产物的草案合同名称。
 */
export const DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT = "dotnetdoc-aspnet-endpoint-extraction";

/**
 * Draft version reserved for ASP.NET endpoint extraction artifacts.
 *
 * @lang zh-CN 预留给 ASP.NET endpoint 抽取产物的草案版本。
 */
export const DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION = "0.1.0-draft";

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
  "seealso"
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

