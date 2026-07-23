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
const HIA_TEXT_I18N_MODEL = "hia-text-i18n";
const HIA_TEXT_I18N_MODEL_VERSION = "0.2.0";
const DEFAULT_LOCALE = "en";
const XML_ATTRIBUTE_KEYS = new Set(["name", "cref", "href", "lang", "h_type", "h-type", "path", "key", "#text"]);
const LOCALE_TAG_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/u;

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
  const diagnostics = [];
  const defaultLocale = normalizeLocale(options.defaultLocale) || DEFAULT_LOCALE;
  const members = asArray(root.members.member).map((member) => normalizeMember(member, {
    sourcePath,
    defaultLocale,
    diagnostics
  }));
  const locales = collectLocales([defaultLocale, ...members.flatMap((member) => member.i18n?.locales ?? [])]);

  return {
    contract: DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT,
    contractVersion: DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION,
    producer: {
      name: "@hia-doc/dotnet-xml-doc-extractor",
      version: "0.1.3"
    },
    source: {
      kind: "dotnet-xml-doc",
      path: sourcePath
    },
    assembly: {
      name: textContent(root.assembly?.name) || null
    },
    defaultLocale,
    locales,
    members,
    diagnostics
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

function normalizeMember(member, context) {
  const memberName = String(member?.name ?? "");
  if (!memberName) {
    throw new Error("XML documentation member is missing a name attribute.");
  }
  const fields = [];
  const summary = normalizeDocumentationField(member.summary, "summary", {
    ...context,
    memberName,
    kind: "summary",
    source: "xml.summary"
  });
  const remarks = normalizeDocumentationField(member.remarks, "remarks", {
    ...context,
    memberName,
    kind: "remarks",
    source: "xml.remarks"
  });
  const parameters = asArray(member.param)
    .map((item) => normalizeNamedDocumentationItem(item, "params", {
      ...context,
      memberName,
      kind: "param",
      sourcePrefix: "xml.param"
    }))
    .filter((item) => item.name);
  const typeParameters = asArray(member.typeparam)
    .map((item) => normalizeNamedDocumentationItem(item, "typeParams", {
      ...context,
      memberName,
      kind: "typeparam",
      sourcePrefix: "xml.typeparam"
    }))
    .filter((item) => item.name);
  const returns = normalizeDocumentationField(member.returns, "returns.summary", {
    ...context,
    memberName,
    kind: "returns",
    source: "xml.returns"
  });
  const exceptions = asArray(member.exception)
    .map((item) => normalizeExceptionDocumentationItem(item, {
      ...context,
      memberName
    }))
    .filter((item) => item.cref || item.summary);

  fields.push(
    summary.field,
    remarks.field,
    ...parameters.map((item) => item.i18nField),
    ...typeParameters.map((item) => item.i18nField),
    returns.field,
    ...exceptions.map((item) => item.i18nField)
  );
  const i18n = buildI18nModel(fields, context.defaultLocale);

  return {
    id: createDotnetMemberId(memberName),
    memberName,
    kind: getDotnetDocMemberKind(memberName),
    name: displayName(memberName),
    summary: summary.text,
    remarks: remarks.text,
    parameters,
    typeParameters,
    returns: returns.text,
    exceptions,
    see: collectRefs(member.see),
    seeAlso: collectRefs(member.seealso),
    ...(i18n ? { i18n } : {}),
    source: {
      path: context.sourcePath,
      rangeSource: "compiler-xml-doc",
      confidence: "high"
    }
  };
}

function normalizeNamedDocumentationItem(item, groupPath, context) {
  const name = String(item?.name ?? "");
  const fieldPath = `${groupPath}.${safeFieldPathPart(name || "unnamed")}.summary`;
  const normalized = normalizeDocumentationField(item, fieldPath, {
    sourcePath: context.sourcePath,
    defaultLocale: context.defaultLocale,
    diagnostics: context.diagnostics,
    memberName: context.memberName,
    kind: context.kind,
    source: `${context.sourcePrefix}.${name || "unnamed"}`
  });
  return {
    name,
    summary: normalized.text,
    ...(normalized.field ? { i18nField: normalized.field } : {})
  };
}

function normalizeExceptionDocumentationItem(item, context) {
  const cref = item?.cref ? String(item.cref) : null;
  const fieldPath = `exceptions.${safeFieldPathPart(cref ?? "exception")}.summary`;
  const normalized = normalizeDocumentationField(item, fieldPath, {
    sourcePath: context.sourcePath,
    defaultLocale: context.defaultLocale,
    diagnostics: context.diagnostics,
    memberName: context.memberName,
    kind: "exception",
    source: `xml.exception.${cref ?? "exception"}`
  });
  return {
    cref,
    summary: normalized.text,
    ...(normalized.field ? { i18nField: normalized.field } : {})
  };
}

function normalizeDocumentationField(value, fieldPath, context) {
  const defaultText = plainTextContent(value);
  const collected = collectLocalizedContent(value, fieldPath, context);
  const localizedText = {};
  for (const block of collected.blocks) {
    localizedText[block.locale] = mergeLocalizedText(localizedText[block.locale], block.text);
  }
  for (const segment of collected.segments) {
    for (const [locale, text] of Object.entries(segment.localized)) {
      localizedText[locale] = mergeLocalizedText(localizedText[locale], text);
    }
  }
  if (defaultText) {
    localizedText[context.defaultLocale] = mergeLocalizedText(localizedText[context.defaultLocale], defaultText);
  }

  const displayText = localizedText[context.defaultLocale] ?? firstLocalizedText(localizedText) ?? defaultText;
  const field = Object.keys(localizedText).length > 0
    ? {
      fieldPath,
      kind: context.kind,
      defaultLocale: context.defaultLocale,
      defaultText: displayText,
      source: context.source,
      localizedText,
      ...(collected.blocks.length > 0 ? { blocks: collected.blocks } : {}),
      ...(collected.segments.length > 0 ? { segments: collected.segments } : {}),
      resolutions: Object.fromEntries(Object.keys(localizedText).map((locale) => [
        locale,
        {
          requestedLocale: locale,
          resolvedLocale: locale,
          fallbackChain: fallbackChain(locale, context.defaultLocale),
          usedFallback: false,
          missing: false,
          sourceKind: locale === context.defaultLocale && defaultText ? "default-text" : "lang-block",
          sourceLocale: locale,
          source: context.source
        }
      ])),
      missingLocales: []
    }
    : null;

  return {
    text: displayText ?? "",
    field
  };
}

function buildI18nModel(fields, defaultLocale) {
  const normalizedFields = Object.fromEntries(fields
    .filter(Boolean)
    .map((field) => [field.fieldPath, field]));
  if (Object.keys(normalizedFields).length === 0) {
    return null;
  }
  return {
    enabled: true,
    model: HIA_TEXT_I18N_MODEL,
    modelVersion: HIA_TEXT_I18N_MODEL_VERSION,
    defaultLocale,
    locales: collectLocales([defaultLocale, ...Object.values(normalizedFields).flatMap((field) => Object.keys(field.localizedText))]),
    fields: normalizedFields
  };
}

function collectLocalizedContent(value, fieldPath, context) {
  const blocks = [];
  const segments = [];
  visitDocumentationNodes(value, (key, item) => {
    if ((key === "lang" || key === "l") && isRecord(item)) {
      const localized = collectLocaleMap(item, {
        ...context,
        fieldPath,
        marker: key
      });
      if (Object.keys(localized).length === 0) {
        context.diagnostics.push(diagnostic(
          "DOTNETDOC_I18N_LOCALE_MARKER_EMPTY",
          `DotNetDoc ${key} marker does not contain locale child elements.`,
          "warning",
          context.sourcePath,
          { memberName: context.memberName, fieldPath, marker: key }
        ));
        return;
      }
      if (key === "l") {
        segments.push({
          kind: "lang-inline",
          id: `${fieldPath}:l:${segments.length + 1}`,
          fieldPath,
          raw: "<l>",
          localized
        });
        return;
      }
      for (const [locale, text] of Object.entries(localized)) {
        blocks.push({
          kind: "lang-block",
          locale,
          fieldPath,
          text,
          source: "xml.lang",
          rangeInComment: null
        });
      }
      return;
    }

    if (key === "div" && isRecord(item) && isDocumentationDiv(item)) {
      const localized = collectLegacyDivLocaleMap(item, {
        ...context,
        fieldPath
      });
      if (Object.keys(localized).length === 0) {
        context.diagnostics.push(diagnostic(
          "DOTNETDOC_I18N_LEGACY_DOC_BLOCK_EMPTY",
          "Legacy DotNetDoc div h_type=\"doc\" block does not contain para elements with valid lang attributes.",
          "warning",
          context.sourcePath,
          { memberName: context.memberName, fieldPath }
        ));
        return;
      }
      for (const [locale, text] of Object.entries(localized)) {
        blocks.push({
          kind: "lang-block",
          locale,
          fieldPath,
          text,
          source: "xml.div-para-lang",
          rangeInComment: null
        });
      }
    }
  });
  return { blocks, segments };
}

function collectLocaleMap(value, context) {
  const localized = {};
  for (const [localeName, item] of Object.entries(value)) {
    if (XML_ATTRIBUTE_KEYS.has(localeName)) {
      continue;
    }
    const locale = normalizeLocale(localeName);
    const text = textContent(item);
    if (!locale) {
      context.diagnostics.push(diagnostic(
        "DOTNETDOC_I18N_LOCALE_INVALID",
        `Invalid DotNetDoc locale tag: ${localeName}.`,
        "warning",
        context.sourcePath,
        { memberName: context.memberName, fieldPath: context.fieldPath, locale: localeName, marker: context.marker }
      ));
      continue;
    }
    if (!text) {
      continue;
    }
    if (localized[locale]) {
      context.diagnostics.push(diagnostic(
        "DOTNETDOC_I18N_LOCALE_DUPLICATED",
        `Duplicate DotNetDoc locale ${locale} in ${context.fieldPath}.`,
        "warning",
        context.sourcePath,
        { memberName: context.memberName, fieldPath: context.fieldPath, locale, marker: context.marker }
      ));
    }
    localized[locale] = mergeLocalizedText(localized[locale], text);
  }
  return localized;
}

function collectLegacyDivLocaleMap(value, context) {
  const localized = {};
  for (const item of asArray(value.para)) {
    const locale = normalizeLocale(item?.lang);
    const text = textContent(item);
    if (!locale) {
      context.diagnostics.push(diagnostic(
        "DOTNETDOC_I18N_LOCALE_INVALID",
        "Legacy DotNetDoc para element is missing a valid lang attribute.",
        "warning",
        context.sourcePath,
        { memberName: context.memberName, fieldPath: context.fieldPath, locale: item?.lang ?? null, marker: "div.para" }
      ));
      continue;
    }
    if (!text) {
      continue;
    }
    if (localized[locale]) {
      context.diagnostics.push(diagnostic(
        "DOTNETDOC_I18N_LOCALE_DUPLICATED",
        `Duplicate legacy DotNetDoc locale ${locale} in ${context.fieldPath}.`,
        "warning",
        context.sourcePath,
        { memberName: context.memberName, fieldPath: context.fieldPath, locale, marker: "div.para" }
      ));
    }
    localized[locale] = mergeLocalizedText(localized[locale], text);
  }
  return localized;
}

function visitDocumentationNodes(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitDocumentationNodes(item, visitor);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    visitor(key, item);
    if ((key === "lang" || key === "l") && isRecord(item)) {
      continue;
    }
    visitDocumentationNodes(item, visitor);
  }
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
      if (XML_ATTRIBUTE_KEYS.has(key)) {
        continue;
      }
      parts.push(textContent(item));
    }
    return compactWhitespace(parts.filter(Boolean).join(" "));
  }
  return "";
}

function plainTextContent(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return compactWhitespace(String(value));
  }
  if (Array.isArray(value)) {
    return compactWhitespace(value.map((item) => plainTextContent(item)).filter(Boolean).join(" "));
  }
  if (typeof value === "object") {
    if (isDocumentationDiv(value)) {
      return "";
    }
    const parts = [];
    if (value["#text"]) {
      parts.push(String(value["#text"]));
    }
    for (const [key, item] of Object.entries(value)) {
      if (key === "lang" || key === "l" || XML_ATTRIBUTE_KEYS.has(key)) {
        continue;
      }
      parts.push(plainTextContent(item));
    }
    return compactWhitespace(parts.filter(Boolean).join(" "));
  }
  return "";
}

function diagnostic(code, message, severity, sourcePath, metadata = {}) {
  return {
    code,
    message,
    severity,
    source: sourcePath ? { path: sourcePath } : null,
    metadata
  };
}

function fallbackChain(locale, defaultLocale) {
  const chain = [locale];
  if (locale.includes("-")) {
    chain.push(locale.split("-")[0]);
  }
  if (!chain.includes(defaultLocale)) {
    chain.push(defaultLocale);
  }
  return chain;
}

function firstLocalizedText(localizedText) {
  return Object.values(localizedText).find((text) => typeof text === "string" && text.length > 0) ?? "";
}

function mergeLocalizedText(left, right) {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return compactWhitespace(`${left} ${right}`);
}

function isDocumentationDiv(value) {
  if (!isRecord(value)) {
    return false;
  }
  return String(value.h_type ?? value["h-type"] ?? "").toLowerCase() === "doc";
}

function collectLocales(values) {
  return [...new Set(values.map(normalizeLocale).filter(Boolean))];
}

function normalizeLocale(value) {
  const locale = typeof value === "string" ? value.trim() : "";
  return LOCALE_TAG_PATTERN.test(locale) ? locale : "";
}

function safeFieldPathPart(value) {
  return String(value).trim().replace(/[^a-zA-Z0-9_.:-]+/g, "-") || "item";
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
