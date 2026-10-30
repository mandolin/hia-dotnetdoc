/**
 * @file
 * @lang zh-CN 将.NET抽取结果投影为HIA符号、完整i18n与保守/精确显示签名，不读取源码或执行声明。
 * @lang en Projects .NET extraction into HIA symbols, complete i18n and conservative/exact display signatures without reading source or executing declarations.
 */
import {
  readDotnetDocArtifact,
  DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT,
  DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT,
  DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT,
  DOTNETDOC_PROJECT_DISCOVERY_CONTRACT,
  isDotnetDocMemberExtractionContract
} from "@hia-doc/dotnetdoc-spec";
import { createDotnetMemberSignature } from "./signature.mjs";

const HIA_CORE_SCHEMA_VERSION = "0.2.0";
const HIA_TEXT_I18N_MODEL = "hia-text-i18n";
const HIA_TEXT_I18N_MODEL_VERSION = "0.2.0";
const HIA_SOURCE_MODEL = "hia-source";
const HIA_SOURCE_MODEL_VERSION = "0.2.0";

/**
 * Convert a DotNetDoc XML documentation artifact to a HIA document shape.
 *
 * @param {object} artifact <lang><en>`dotnetdoc-xml-doc-extraction` artifact.</en><zh-CN>`dotnetdoc-xml-doc-extraction` 产物。</zh-CN></lang>
 * @param {object} [options] <lang><en>Adapter options.</en><zh-CN>适配选项。</zh-CN></lang>
 * @param {string} [options.id] <lang><en>HIA document id.</en><zh-CN>HIA document id。</zh-CN></lang>
 * @param {string} [options.title] <lang><en>HIA document title.</en><zh-CN>HIA document 标题。</zh-CN></lang>
 * @returns {object} <lang><en>HIA document artifact compatible with the current core shape.</en><zh-CN>兼容当前 core 形态的 HIA document 产物。</zh-CN></lang>
 * @throws {Error} <lang><en>When the input artifact is not a DotNetDoc XML documentation extraction.</en><zh-CN>当输入不是 DotNetDoc XML documentation extraction 时抛出。</zh-CN></lang>
 * @lang zh-CN 将 DotNetDoc XML documentation artifact 转换为 HIA document 形态。
 */
export function dotnetXmlDocsToHiaDocument(artifact, options = {}) {
  assertDotnetXmlDocArtifact(artifact);
  const title = options.title ?? `${artifact.assembly?.name ?? "DotNet"} API`;
  const semanticContext = createXmlMemberSemanticContext(artifact);
  const symbols = artifact.members.map((member) => mapMemberToSymbol(member, semanticContext));
  const defaultLocale = options.defaultLocale || artifact.defaultLocale || "en";

  return {
    schemaVersion: HIA_CORE_SCHEMA_VERSION,
    id: options.id ?? `dotnetdoc:${artifact.assembly?.name ?? artifact.source.path}`,
    title,
    defaultLocale,
    locales: collectDocumentLocales(options.locales, artifact.locales, symbols, defaultLocale),
    nodes: [
      {
        id: "root",
        kind: "root",
        title,
        symbolIds: symbols.map((symbol) => symbol.id)
      }
    ],
    symbols,
    diagnostics: artifact.diagnostics ?? [],
    metadata: {
      sourceContract: artifact.contract,
      sourceContractVersion: artifact.contractVersion,
      producer: artifact.producer,
      bridgeBoundary: "dotnetdoc-adapter",
      assembly: artifact.assembly ?? null
    }
  };
}

/**
 * Convert an ASP.NET endpoint extraction artifact to a HIA document shape.
 *
 * @param {object} artifact <lang><en>`dotnetdoc-aspnet-endpoint-extraction` artifact.</en><zh-CN>`dotnetdoc-aspnet-endpoint-extraction` 产物。</zh-CN></lang>
 * @param {object} [options] <lang><en>Adapter options.</en><zh-CN>适配选项。</zh-CN></lang>
 * @param {string} [options.id] <lang><en>HIA document id.</en><zh-CN>HIA document id。</zh-CN></lang>
 * @param {string} [options.title] <lang><en>HIA document title.</en><zh-CN>HIA document 标题。</zh-CN></lang>
 * @returns {object} <lang><en>HIA document artifact for ASP.NET endpoint surfaces.</en><zh-CN>ASP.NET endpoint surface 的 HIA document 产物。</zh-CN></lang>
 * @throws {Error} <lang><en>When the input artifact is not an ASP.NET endpoint extraction.</en><zh-CN>当输入不是 ASP.NET endpoint 抽取产物时抛出。</zh-CN></lang>
 * @lang zh-CN 将 ASP.NET endpoint 抽取产物转换为 HIA document。
 */
export function dotnetAspNetEndpointsToHiaDocument(artifact, options = {}) {
  assertDotnetAspNetEndpointArtifact(artifact);
  const title = options.title ?? "ASP.NET Endpoint Surface";
  const symbols = artifact.endpoints.map((endpoint) => mapEndpointToSymbol(endpoint));

  return {
    schemaVersion: HIA_CORE_SCHEMA_VERSION,
    id: options.id ?? "dotnetdoc:aspnet:endpoints",
    title,
    defaultLocale: options.defaultLocale || "en",
    locales: options.locales ?? ["en"],
    nodes: [
      {
        id: "root",
        kind: "root",
        title,
        symbolIds: symbols.map((symbol) => symbol.id)
      }
    ],
    symbols,
    diagnostics: artifact.diagnostics ?? [],
    metadata: {
      sourceContract: artifact.contract,
      sourceContractVersion: artifact.contractVersion,
      producer: artifact.producer,
      bridgeBoundary: "dotnetdoc-adapter",
      summary: artifact.summary ?? null
    }
  };
}

/**
 * Convert a DotNetDoc markup comment artifact to a HIA document shape.
 *
 * @param {object} artifact <lang><en>`dotnetdoc-markup-comment-extraction` artifact.</en><zh-CN>`dotnetdoc-markup-comment-extraction` 产物。</zh-CN></lang>
 * @param {object} [options] <lang><en>Adapter options.</en><zh-CN>适配选项。</zh-CN></lang>
 * @param {string} [options.id] <lang><en>HIA document id.</en><zh-CN>HIA document id。</zh-CN></lang>
 * @param {string} [options.title] <lang><en>HIA document title.</en><zh-CN>HIA document 标题。</zh-CN></lang>
 * @returns {object} <lang><en>HIA document artifact for ASP.NET and Razor markup comments.</en><zh-CN>ASP.NET 与 Razor 标记层注释的 HIA document 产物。</zh-CN></lang>
 * @throws {Error} <lang><en>When the input artifact is not a DotNetDoc markup comment extraction.</en><zh-CN>当输入不是 DotNetDoc markup comment extraction 时抛出。</zh-CN></lang>
 * @lang zh-CN 将 DotNetDoc markup comment 抽取产物转换为 HIA document。
 */
export function dotnetMarkupCommentsToHiaDocument(artifact, options = {}) {
  assertDotnetMarkupCommentArtifact(artifact);
  const title = options.title ?? "ASP.NET Markup Comments";
  const symbols = artifact.comments.map((comment) => mapMarkupCommentToSymbol(comment));
  const defaultLocale = options.defaultLocale || artifact.defaultLocale || "en";

  return {
    schemaVersion: HIA_CORE_SCHEMA_VERSION,
    id: options.id ?? "dotnetdoc:markup:comments",
    title,
    defaultLocale,
    locales: collectDocumentLocales(options.locales, artifact.locales, symbols, defaultLocale),
    nodes: [
      {
        id: "root",
        kind: "root",
        title,
        symbolIds: symbols.map((symbol) => symbol.id)
      }
    ],
    symbols,
    diagnostics: artifact.diagnostics ?? [],
    metadata: {
      sourceContract: artifact.contract,
      sourceContractVersion: artifact.contractVersion,
      producer: artifact.producer,
      bridgeBoundary: "dotnetdoc-adapter",
      summary: artifact.summary ?? null,
      privacy: artifact.privacy ?? null
    }
  };
}

/**
 * Convert a .NET project discovery artifact to a HIA document shape.
 *
 * @param {object} artifact <lang><en>`dotnetdoc-project-discovery` artifact.</en><zh-CN>`dotnetdoc-project-discovery` 产物。</zh-CN></lang>
 * @param {object} [options] <lang><en>Adapter options.</en><zh-CN>适配选项。</zh-CN></lang>
 * @param {string} [options.id] <lang><en>HIA document id.</en><zh-CN>HIA document id。</zh-CN></lang>
 * @param {string} [options.title] <lang><en>HIA document title.</en><zh-CN>HIA document 标题。</zh-CN></lang>
 * @returns {object} <lang><en>HIA document artifact for .NET solution/project structure.</en><zh-CN>.NET solution/project 结构的 HIA document 产物。</zh-CN></lang>
 * @throws {Error} <lang><en>When the input artifact is not a project discovery extraction.</en><zh-CN>当输入不是 project discovery 抽取产物时抛出。</zh-CN></lang>
 * @lang zh-CN 将 .NET project discovery 产物转换为 HIA document。
 */
export function dotnetProjectDiscoveryToHiaDocument(artifact, options = {}) {
  assertDotnetProjectDiscoveryArtifact(artifact);
  const title = options.title ?? ".NET Project Structure";
  const symbols = [
    ...artifact.solutions.map((solution) => mapSolutionToSymbol(solution)),
    ...artifact.projects.map((project) => mapProjectToSymbol(project))
  ];

  return {
    schemaVersion: HIA_CORE_SCHEMA_VERSION,
    id: options.id ?? "dotnetdoc:projects",
    title,
    defaultLocale: options.defaultLocale || "en",
    locales: options.locales ?? ["en"],
    nodes: [
      {
        id: "root",
        kind: "root",
        title,
        symbolIds: symbols.map((symbol) => symbol.id)
      }
    ],
    symbols,
    diagnostics: artifact.diagnostics ?? [],
    metadata: {
      sourceContract: artifact.contract,
      sourceContractVersion: artifact.contractVersion,
      producer: artifact.producer,
      bridgeBoundary: "dotnetdoc-adapter",
      summary: artifact.summary ?? null
    }
  };
}

/**
 * Assert that a value is a DotNetDoc XML documentation extraction artifact.
 *
 * @param {object} artifact <lang><en>Candidate artifact.</en><zh-CN>候选产物。</zh-CN></lang>
 * @returns {void} <lang><en>No return value.</en><zh-CN>无返回值。</zh-CN></lang>
 * @throws {Error} <lang><en>When the artifact contract or member list is invalid.</en><zh-CN>当产物合同或 member 列表无效时抛出。</zh-CN></lang>
 * @lang zh-CN 断言某个值是 DotNetDoc XML documentation extraction artifact。
 */
export function assertDotnetXmlDocArtifact(artifact) {
  // <lang><zh-CN>精确新旧身份先核验，members数组不能授权未来版本。</zh-CN><en>Validate exact current/legacy identities first; a members array cannot authorize future versions.</en></lang>
  readDotnetDocArtifact(artifact);
  if (!artifact || !isDotnetDocMemberExtractionContract(artifact.contract)) {
    throw new Error("Expected a DotNetDoc member extraction artifact.");
  }
  if (!Array.isArray(artifact.members)) {
    throw new Error("DotNetDoc member extraction must contain members array.");
  }
}

/**
 * Assert that a value is an ASP.NET endpoint extraction artifact.
 *
 * @param {object} artifact <lang><en>Candidate artifact.</en><zh-CN>候选产物。</zh-CN></lang>
 * @returns {void} <lang><en>No return value.</en><zh-CN>无返回值。</zh-CN></lang>
 * @throws {Error} <lang><en>When the artifact contract or endpoint list is invalid.</en><zh-CN>当产物合同或 endpoint 列表无效时抛出。</zh-CN></lang>
 * @lang zh-CN 断言某个值是 ASP.NET endpoint 抽取产物。
 */
export function assertDotnetAspNetEndpointArtifact(artifact) {
  // <lang><zh-CN>先核静态端点的合同/版本/JSON结构，不在adapter内迁移。</zh-CN><en>Validate static-endpoint contract/version/JSON shape without migration inside the adapter.</en></lang>
  readDotnetDocArtifact(artifact);
  if (!artifact || artifact.contract !== DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT) {
    throw new Error("Expected a DotNetDoc ASP.NET endpoint extraction artifact.");
  }
  if (!Array.isArray(artifact.endpoints)) {
    throw new Error("DotNetDoc ASP.NET endpoint extraction must contain endpoints array.");
  }
}

/**
 * Assert that a value is a DotNetDoc markup comment extraction artifact.
 *
 * @param {object} artifact <lang><en>Candidate artifact.</en><zh-CN>候选产物。</zh-CN></lang>
 * @returns {void} <lang><en>No return value.</en><zh-CN>无返回值。</zh-CN></lang>
 * @throws {Error} <lang><en>When the artifact contract or comment list is invalid.</en><zh-CN>当产物合同或 comment 列表无效时抛出。</zh-CN></lang>
 * @lang zh-CN 断言某个值是 DotNetDoc markup comment extraction artifact。
 */
export function assertDotnetMarkupCommentArtifact(artifact) {
  // <lang><zh-CN>标记内容属于文档，精确读取不授予整份源码公开权限。</zh-CN><en>Markup content is documentation; exact reading does not grant whole-source publication rights.</en></lang>
  readDotnetDocArtifact(artifact);
  if (!artifact || artifact.contract !== DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT) {
    throw new Error("Expected a DotNetDoc markup comment extraction artifact.");
  }
  if (!Array.isArray(artifact.comments)) {
    throw new Error("DotNetDoc markup comment extraction must contain comments array.");
  }
}

/**
 * Assert that a value is a .NET project discovery extraction artifact.
 *
 * @param {object} artifact <lang><en>Candidate artifact.</en><zh-CN>候选产物。</zh-CN></lang>
 * @returns {void} <lang><en>No return value.</en><zh-CN>无返回值。</zh-CN></lang>
 * @throws {Error} <lang><en>When the artifact contract or project list is invalid.</en><zh-CN>当产物合同或 project 列表无效时抛出。</zh-CN></lang>
 * @lang zh-CN 断言某个值是 .NET project discovery 抽取产物。
 */
export function assertDotnetProjectDiscoveryArtifact(artifact) {
  // <lang><zh-CN>核项目元数据结构，不执行项目或读取其路径。</zh-CN><en>Validate project metadata without executing projects or reading their paths.</en></lang>
  readDotnetDocArtifact(artifact);
  if (!artifact || artifact.contract !== DOTNETDOC_PROJECT_DISCOVERY_CONTRACT) {
    throw new Error("Expected a DotNetDoc project discovery artifact.");
  }
  if (!Array.isArray(artifact.projects) || !Array.isArray(artifact.solutions)) {
    throw new Error("DotNetDoc project discovery must contain projects and solutions arrays.");
  }
}

/**
 * @lang zh-CN 将抽取成员映射为HIA符号，精确签名优先，保留文档内容与来源边界。
 * @lang en Maps an extracted member into an HIA symbol, preferring exact signatures while retaining documentation and source boundaries.
 * @param {object} member <lang><zh-CN>不修改的XML/Roslyn成员。</zh-CN><en>XML/Roslyn member, never modified.</en></lang>
 * @param {object} semanticContext <lang><zh-CN>本批次程序集和类型身份上下文。</zh-CN><en>Batch assembly/type identity context.</en></lang>
 * @returns {object} <lang><zh-CN>新符号，signature为显示文本，不是可执行源码。</zh-CN><en>New symbol whose signature is display text, not executable source.</en></lang>
 */
function mapMemberToSymbol(member, semanticContext) {
  // <lang><zh-CN>签名缺失信息单独保留，不能以自然语言returns正文猜测返回类型。</zh-CN><en>Keep missing signature information explicit rather than deriving return types from returns prose.</en></lang>
  const signature = createDotnetMemberSignature(member);
  // <lang><zh-CN>XML出处不是代码定义；只有显式的安全C#路径及有效范围可以进入source。</zh-CN><en>An XML origin is not a code definition; only explicit safe C# paths and valid ranges may enter source.</en></lang>
  const codeSource = selectCodeSource(member.source);
  // <lang><zh-CN>HIA外壳保持原0.2契约及内容投影；新增可读签名不改变成员identity。</zh-CN><en>Retain the existing 0.2 HIA envelope/content projection; readable signatures never change member identities.</en></lang>
  const symbol = {
    id: member.id,
    name: member.name,
    kind: member.kind,
    summary: normalizeSummary(member.summary, member.remarks, member.name),
    signature: signature.text,
    ...(codeSource ? { source: {
      model: HIA_SOURCE_MODEL,
      modelVersion: HIA_SOURCE_MODEL_VERSION,
      mode: "link",
      definedIn: {
        kind: "defined-in",
        relativePath: codeSource.path,
        language: "csharp",
        ...(codeSource.range ? { position: { line: codeSource.range.start.line, column: codeSource.range.start.column ?? 1 }, range: codeSource.range } : {}),
        link: {
          enabled: false,
          openMode: "same-tab"
        }
      },
      primaryBlock: null,
      references: [],
      fragments: [],
      diagnostics: []
    } } : {}),
    diagnostics: [],
    metadata: {
      dotnetdoc: {
        memberName: member.memberName,
        ...(semanticContext.documentationSource ? { documentationSource: semanticContext.documentationSource } : {}),
        signature: { source: signature.source, missingInformation: signature.missingInformation },
        remarks: member.remarks,
        parameters: member.parameters,
        typeParameters: member.typeParameters,
        returns: member.returns,
        exceptions: member.exceptions,
        see: member.see,
        seeAlso: member.seeAlso,
        semantic: createXmlMemberSemantic(member, semanticContext)
      }
    }
  };
  if (member.i18n) {
    symbol.i18n = normalizeI18nModel(member.i18n);
  }
  return symbol;
}

/**
 * Build the shared semantic context used while adapting compiler XML members.
 *
 * @param {object} artifact <lang><en>DotNetDoc XML extraction artifact.</en><zh-CN>DotNetDoc XML 抽取产物。</zh-CN></lang>
 * @returns {{assemblyName: string | null, typeDocumentationIds: string[]}} <lang><en>Assembly and known type documentation ids.</en><zh-CN>程序集与已知类型 documentation id。</zh-CN></lang>
 * @lang zh-CN 为 compiler XML 成员建立共享语义上下文，使没有 source-probe 的条目也能进入程序集/命名空间/类型层级。
 */
function createXmlMemberSemanticContext(artifact) {
  return {
    // <lang><zh-CN>保留原XML输入的出处；不会随成员代码定位补全而改成.cs路径。</zh-CN><en>Retain the original XML input origin independently of member code-location enrichment.</en></lang>
    ...(artifact.contract === DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT ? { documentationSource: { path: artifact.source.path, language: "xml", rangeSource: "compiler-xml-doc" } } : {}),
    assemblyName: typeof artifact.assembly?.name === "string" && artifact.assembly.name
      ? artifact.assembly.name
      : null,
    typeDocumentationIds: artifact.members
      .filter((member) => member.kind === "dotnet-type" && typeof member.memberName === "string")
      .map((member) => member.memberName)
      .sort((left, right) => right.length - left.length)
  };
}

/**
 * @lang zh-CN 只选择安全C#代码定位，拒绝XML出处、越根路径和无效范围；不读取文件或猜测位置。
 * @lang en Selects safe C# code locators only, rejecting XML origins, escaping paths and invalid ranges without file reads or guessed positions.
 * @param {object} source <lang><zh-CN>候选成员来源。</zh-CN><en>Candidate member source.</en></lang>
 * @returns {object|null} <lang><zh-CN>安全定位或null；无范围时不虚构第一行。</zh-CN><en>Safe locator or null; no first line is invented when a range is absent.</en></lang>
 */
function selectCodeSource(source) {
  // <lang><zh-CN>兼容Windows分隔符，但不接受绝对路径/URI/父级跳转，也不按文件名推断成员。</zh-CN><en>Accept Windows separators while refusing absolute paths, URIs and parent traversal, without inferring members from filenames.</en></lang>
  const locator = typeof source?.path === "string" ? source.path.replaceAll("\\", "/") : "";
  if (!locator || /^(?:\/|[a-z][a-z0-9+.-]*:)/iu.test(locator) || locator.split("/").includes("..") || !/\.cs$/iu.test(locator) || source.rangeSource === "compiler-xml-doc") return null;
  // <lang><zh-CN>范围是一基且有序；非法运行时位置不能转成HTML定位事实。</zh-CN><en>Ranges must be one-based and ordered; invalid runtime positions cannot become HTML-location facts.</en></lang>
  const range = source.range;
  if (range && (!Number.isSafeInteger(range.start?.line) || range.start.line < 1 || (range.start.column !== undefined && (!Number.isSafeInteger(range.start.column) || range.start.column < 1)) || (range.end && (!Number.isSafeInteger(range.end.line) || range.end.line < range.start.line || (range.end.column !== undefined && (!Number.isSafeInteger(range.end.column) || range.end.column < 1)))))) return null;
  if (range?.end && range.end.line === range.start.line && range.end.column !== undefined && range.start.column !== undefined && range.end.column < range.start.column) return null;
  return { ...source, path: locator };
}

/**
 * Normalize compiler XML metadata into the same semantic envelope emitted by the Roslyn source extractor.
 *
 * @param {object} member <lang><en>Extracted compiler XML member.</en><zh-CN>抽取后的 compiler XML 成员。</zh-CN></lang>
 * @param {{assemblyName: string | null, typeDocumentationIds: string[]}} context <lang><en>Shared semantic context.</en><zh-CN>共享语义上下文。</zh-CN></lang>
 * @returns {object} <lang><en>Renderer-neutral semantic metadata.</en><zh-CN>供 renderer 消费的中立语义元数据。</zh-CN></lang>
 * @lang zh-CN 补齐 assembly、documentation id 与类型归属；Roslyn 已给出的精确语义始终优先。
 */
function createXmlMemberSemantic(member, context) {
  const documentationCommentId = member.semantic?.documentationCommentId ?? member.memberName;
  const typeDocumentationId = resolveContainingTypeDocumentationId(member, context.typeDocumentationIds);
  const typeName = typeDocumentationId?.replace(/^T:/u, "") ?? null;
  const namespaceName = typeName?.includes(".")
    ? typeName.slice(0, typeName.lastIndexOf("."))
    : null;
  const derived = {
    documentationCommentId,
    symbolKind: member.semantic?.symbolKind ?? member.kind,
    containingAssembly: context.assemblyName,
    containingNamespace: namespaceName,
    containingType: member.kind === "dotnet-type" ? null : typeName,
    parentDocumentationCommentId: member.kind === "dotnet-type" ? null : typeDocumentationId,
    baseTypeIds: [],
    interfaceIds: [],
    displayName: member.name
  };

  return {
    ...derived,
    ...(member.semantic ?? {})
  };
}

function resolveContainingTypeDocumentationId(member, typeDocumentationIds) {
  if (member.kind === "dotnet-type") {
    return member.memberName;
  }

  const memberBody = String(member.memberName ?? "").replace(/^[A-Z]:/u, "").replace(/\(.+$/u, "");
  const knownType = typeDocumentationIds.find((typeId) => {
    const typeBody = typeId.replace(/^T:/u, "");
    return memberBody.startsWith(`${typeBody}.`);
  });
  if (knownType) {
    return knownType;
  }

  const separatorIndex = memberBody.lastIndexOf(".");
  return separatorIndex > 0 ? `T:${memberBody.slice(0, separatorIndex)}` : null;
}

function mapEndpointToSymbol(endpoint) {
  return {
    id: endpoint.id,
    name: endpoint.displayName ?? endpoint.name,
    kind: "aspnet-endpoint",
    summary: `${endpoint.kind} ${endpoint.route?.template ?? endpoint.name}`,
    source: {
      model: HIA_SOURCE_MODEL,
      modelVersion: HIA_SOURCE_MODEL_VERSION,
      mode: "link",
      definedIn: {
        kind: "defined-in",
        relativePath: endpoint.source?.path ?? "aspnet",
        language: endpoint.source?.language ?? "aspnet",
        position: {
          line: endpoint.source?.range?.start?.line ?? 1,
          column: endpoint.source?.range?.start?.column ?? 1
        },
        ...(endpoint.source?.range ? { range: endpoint.source.range } : {}),
        link: {
          enabled: false,
          openMode: "same-tab"
        }
      },
      primaryBlock: null,
      references: [],
      fragments: [],
      diagnostics: []
    },
    diagnostics: [],
    metadata: {
      dotnetdoc: {
        aspnetEndpoint: endpoint
      }
    }
  };
}

function mapMarkupCommentToSymbol(comment) {
  const symbol = {
    id: comment.id,
    name: comment.name,
    kind: "dotnet-markup-comment",
    summary: normalizeSummary(comment.summary, comment.content, comment.name),
    source: {
      model: HIA_SOURCE_MODEL,
      modelVersion: HIA_SOURCE_MODEL_VERSION,
      mode: "link",
      definedIn: {
        kind: "defined-in",
        relativePath: comment.source?.path ?? "aspnet-markup",
        language: comment.source?.language ?? comment.language ?? "aspnet-markup",
        position: {
          line: comment.source?.range?.start?.line ?? 1,
          column: comment.source?.range?.start?.column ?? 1
        },
        ...(comment.source?.range ? { range: comment.source.range } : {}),
        link: {
          enabled: false,
          openMode: "same-tab"
        }
      },
      primaryBlock: null,
      references: [],
      fragments: [],
      diagnostics: []
    },
    diagnostics: [],
    metadata: {
      dotnetdoc: {
        markupComment: comment
      }
    }
  };
  if (comment.i18n) {
    symbol.i18n = normalizeI18nModel(comment.i18n);
  }
  return symbol;
}

function mapSolutionToSymbol(solution) {
  return {
    id: solution.id,
    name: solution.name,
    kind: "dotnet-solution",
    summary: `${solution.projectCount} project(s) in ${solution.path}`,
    source: sourceForFile(solution.path, "sln"),
    diagnostics: [],
    metadata: {
      dotnetdoc: {
        projectDiscoverySolution: solution
      }
    }
  };
}

function mapProjectToSymbol(project) {
  const frameworkSummary = project.targetFrameworks.length > 0
    ? ` (${project.targetFrameworks.join(", ")})`
    : "";
  return {
    id: project.id,
    name: project.name,
    kind: "dotnet-project",
    summary: `${project.kind} ${project.path}${frameworkSummary}`,
    source: sourceForFile(project.path, project.source?.language ?? "xml"),
    diagnostics: project.diagnostics ?? [],
    metadata: {
      dotnetdoc: {
        projectDiscoveryProject: project
      }
    }
  };
}

function sourceForFile(relativePath, language) {
  return {
    model: HIA_SOURCE_MODEL,
    modelVersion: HIA_SOURCE_MODEL_VERSION,
    mode: "link",
    definedIn: {
      kind: "defined-in",
      relativePath,
      language,
      position: {
        line: 1,
        column: 1
      },
      link: {
        enabled: false,
        openMode: "same-tab"
      }
    },
    primaryBlock: null,
    references: [],
    fragments: [],
    diagnostics: []
  };
}

function collectDocumentLocales(optionLocales, artifactLocales, symbols, defaultLocale) {
  const locales = [
    ...(Array.isArray(optionLocales) ? optionLocales : []),
    ...(Array.isArray(artifactLocales) ? artifactLocales : []),
    defaultLocale
  ];
  for (const symbol of symbols) {
    locales.push(...(Array.isArray(symbol.i18n?.locales) ? symbol.i18n.locales : []));
  }
  return [...new Set(locales.filter((locale) => typeof locale === "string" && locale.trim().length > 0))];
}

function normalizeSummary(...candidates) {
  for (const candidate of candidates) {
    const text = typeof candidate === "string" ? candidate.trim() : "";
    if (text.length > 0) {
      return text;
    }
  }
  return "DotNetDoc symbol";
}

function normalizeI18nModel(model) {
  if (!model || typeof model !== "object") {
    return model;
  }
  const defaultLocale = typeof model.defaultLocale === "string" && model.defaultLocale.trim()
    ? model.defaultLocale
    : "en";
  const fields = {};
  for (const [fieldPath, field] of Object.entries(model.fields ?? {})) {
    if (!field || typeof field !== "object") {
      continue;
    }
    fields[fieldPath] = {
      fieldPath,
      kind: field.kind ?? "plain-text",
      defaultLocale: field.defaultLocale ?? defaultLocale,
      ...(typeof field.defaultText === "string" ? { defaultText: field.defaultText } : {}),
      localizedText: field.localizedText ?? {},
      ...(field.source ? { source: field.source } : {}),
      ...(Array.isArray(field.blocks) ? { blocks: field.blocks } : {}),
      ...(Array.isArray(field.segments) ? { segments: field.segments } : {}),
      ...(field.resolutions ? { resolutions: field.resolutions } : {})
    };
  }
  return {
    enabled: model.enabled ?? true,
    model: model.model ?? HIA_TEXT_I18N_MODEL,
    modelVersion: model.modelVersion ?? HIA_TEXT_I18N_MODEL_VERSION,
    defaultLocale,
    locales: Array.isArray(model.locales) ? model.locales : [defaultLocale],
    fields,
    ...(Array.isArray(model.resources) ? { resources: model.resources } : {})
  };
}
