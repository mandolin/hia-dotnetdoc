import { XMLParser } from "fast-xml-parser";

import {
  DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT,
  DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION,
  getDotnetDocMemberKind
} from "@hia-doc/dotnetdoc-spec";

const XML_PARSER = new XMLParser({
  allowBooleanAttributes: true,
  attributeNamePrefix: "",
  ignoreAttributes: false,
  ignoreDeclaration: true,
  isArray: (name) => ["member", "param", "typeparam", "exception", "see", "seealso"].includes(name),
  preserveOrder: false,
  processEntities: true,
  textNodeName: "#text",
  trimValues: true
});

/**
 * Parse a compiler-generated XML documentation file into a DotNetDoc artifact.
 *
 * @param {string} xmlText <lang><en>Compiler XML documentation content.</en><zh-CN>编译器 XML documentation 文件内容。</zh-CN></lang>
 * @param {object} [options] <lang><en>Extraction options.</en><zh-CN>抽取选项。</zh-CN></lang>
 * @param {string} [options.path] <lang><en>Workspace-relative XML documentation path.</en><zh-CN>相对工作区的 XML documentation 路径。</zh-CN></lang>
 * @returns {object} <lang><en>`dotnetdoc-xml-doc-extraction` artifact.</en><zh-CN>`dotnetdoc-xml-doc-extraction` 产物。</zh-CN></lang>
 * @throws {Error} <lang><en>When the XML document does not contain a `doc` root or member list.</en><zh-CN>当 XML 文档不包含 `doc` 根节点或 member 列表时抛出。</zh-CN></lang>
 * @lang zh-CN 将编译器生成的 XML documentation 文件解析为 DotNetDoc artifact。
 */
export function extractDotnetXmlDocs(xmlText, options = {}) {
  const parsed = XML_PARSER.parse(xmlText);
  const root = parsed?.doc;
  if (!root || !root.members) {
    throw new Error("Expected compiler XML documentation with doc.members.");
  }

  const sourcePath = normalizePath(options.path ?? "documentation.xml");
  const members = asArray(root.members.member).map((member) => normalizeMember(member, sourcePath));

  return {
    contract: DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT,
    contractVersion: DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION,
    producer: {
      name: "@hia-doc/dotnet-xml-doc-extractor",
      version: "0.1.1"
    },
    source: {
      kind: "dotnet-xml-doc",
      path: sourcePath
    },
    assembly: {
      name: textContent(root.assembly?.name) || null
    },
    members,
    diagnostics: []
  };
}

/**
 * Normalize a compiler XML documentation member id to a stable artifact id.
 *
 * @param {string} memberName <lang><en>Compiler XML documentation member id.</en><zh-CN>编译器 XML documentation member id。</zh-CN></lang>
 * @returns {string} <lang><en>Stable DotNetDoc member artifact id.</en><zh-CN>稳定的 DotNetDoc member artifact id。</zh-CN></lang>
 * @lang zh-CN 将编译器 XML documentation member id 规范化为稳定 artifact id。
 */
export function createDotnetMemberId(memberName) {
  return `dotnet:${slug(memberName)}`;
}

function normalizeMember(member, sourcePath) {
  const memberName = String(member?.name ?? "");
  if (!memberName) {
    throw new Error("XML documentation member is missing a name attribute.");
  }

  return {
    id: createDotnetMemberId(memberName),
    memberName,
    kind: getDotnetDocMemberKind(memberName),
    name: displayName(memberName),
    summary: textContent(member.summary),
    remarks: textContent(member.remarks),
    parameters: asArray(member.param)
      .map((item) => ({
        name: String(item?.name ?? ""),
        summary: textContent(item)
      }))
      .filter((item) => item.name),
    typeParameters: asArray(member.typeparam)
      .map((item) => ({
        name: String(item?.name ?? ""),
        summary: textContent(item)
      }))
      .filter((item) => item.name),
    returns: textContent(member.returns),
    exceptions: asArray(member.exception)
      .map((item) => ({
        cref: item?.cref ? String(item.cref) : null,
        summary: textContent(item)
      }))
      .filter((item) => item.cref || item.summary),
    see: collectRefs(member.see),
    seeAlso: collectRefs(member.seealso),
    source: {
      path: sourcePath,
      rangeSource: "compiler-xml-doc",
      confidence: "high"
    }
  };
}

function collectRefs(value) {
  return asArray(value)
    .map((item) => ({
      cref: item?.cref ? String(item.cref) : null,
      href: item?.href ? String(item.href) : null,
      label: textContent(item)
    }))
    .filter((item) => item.cref || item.href || item.label);
}

function textContent(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return compactWhitespace(String(value));
  }
  if (Array.isArray(value)) {
    return compactWhitespace(value.map((item) => textContent(item)).filter(Boolean).join(" "));
  }
  if (typeof value === "object") {
    const parts = [];
    if (value["#text"]) {
      parts.push(String(value["#text"]));
    }
    for (const [key, item] of Object.entries(value)) {
      if (key === "#text" || key === "name" || key === "cref" || key === "href") {
        continue;
      }
      parts.push(textContent(item));
    }
    return compactWhitespace(parts.filter(Boolean).join(" "));
  }
  return "";
}

function displayName(memberName) {
  const withoutPrefix = memberName.replace(/^[A-Z]:/, "");
  const withoutParameters = withoutPrefix.replace(/\(.+\)$/, "");
  return withoutParameters.split(".").at(-1) ?? withoutParameters;
}

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function compactWhitespace(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizePath(value) {
  const normalized = String(value).replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe DotNetDoc path: ${value}`);
  }
  return normalized;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-|-$/g, "") || "member";
}
