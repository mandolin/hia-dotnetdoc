import {
  DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT,
  isDotnetDocMemberExtractionContract
} from "@hia-doc/dotnetdoc-spec";

const HIA_CORE_SCHEMA_VERSION = "0.2.0";
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
  const symbols = artifact.members.map((member) => mapMemberToSymbol(member));

  return {
    schemaVersion: HIA_CORE_SCHEMA_VERSION,
    id: options.id ?? `dotnetdoc:${artifact.assembly?.name ?? artifact.source.path}`,
    title,
    defaultLocale: options.defaultLocale ?? "en",
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
    defaultLocale: options.defaultLocale ?? "en",
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
  if (!artifact || artifact.contract !== DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT) {
    throw new Error("Expected a DotNetDoc ASP.NET endpoint extraction artifact.");
  }
  if (!Array.isArray(artifact.endpoints)) {
    throw new Error("DotNetDoc ASP.NET endpoint extraction must contain endpoints array.");
  }
}

function mapMemberToSymbol(member) {
  return {
    id: member.id,
    name: member.name,
    kind: member.kind,
    summary: member.summary,
    source: {
      model: HIA_SOURCE_MODEL,
      modelVersion: HIA_SOURCE_MODEL_VERSION,
      mode: "link",
      definedIn: {
        kind: "defined-in",
        relativePath: member.source?.path ?? "documentation.xml",
        language: member.source?.language ?? "xml",
        position: {
          line: member.source?.range?.start?.line ?? 1,
          column: member.source?.range?.start?.column ?? 1
        },
        range: member.source?.range ?? null,
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
        memberName: member.memberName,
        remarks: member.remarks,
        parameters: member.parameters,
        typeParameters: member.typeParameters,
        returns: member.returns,
        exceptions: member.exceptions,
        see: member.see,
        seeAlso: member.seeAlso
      }
    }
  };
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
        range: endpoint.source?.range ?? null,
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
