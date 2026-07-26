import { readFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { extractAspNetEndpoints, extractDotnetMarkupComments, extractDotnetProjectDiscovery, extractDotnetSourceFiles } from "@hia-doc/dotnet-source-extractor";
import { extractDotnetXmlDocs } from "@hia-doc/dotnet-xml-doc-extractor";
import { dotnetAspNetEndpointsToHiaDocument, dotnetMarkupCommentsToHiaDocument, dotnetProjectDiscoveryToHiaDocument, dotnetXmlDocsToHiaDocument } from "@hia-doc/dotnetdoc-adapter";
import {
  DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT,
  DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT,
  DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT,
  DOTNETDOC_PROJECT_DISCOVERY_CONTRACT,
  DOTNETDOC_SOURCE_RELATION_CONTRACT,
  DOTNETDOC_SOURCE_RELATION_CONTRACT_VERSION,
  DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT
} from "@hia-doc/dotnetdoc-spec";

export {
  DOTNETDOC_CONFIG_JSON_SCHEMA,
  DOTNETDOC_CONFIG_SCHEMA_ID,
  DOTNETDOC_CONFIG_SCHEMA_VERSION
} from "./schema.mjs";
import { DOTNETDOC_CONFIG_SCHEMA_ID, DOTNETDOC_CONFIG_SCHEMA_VERSION } from "./schema.mjs";

export const DOTNETDOC_RUNNER_VERSION = "0.1.4";
export const DOTNETDOC_INPUT_KINDS = Object.freeze(["dotnet-xml-doc", "dotnet-csharp-source", "dotnet-aspnet-surface", "dotnet-markup-comments", "dotnet-project"]);
export const DOTNETDOC_OUTPUT_KINDS = Object.freeze(["dotnetdoc-extraction", "hia-document", "dotnetdoc-source-relation", "dotnetdoc-aspnet-endpoint-extraction", "dotnetdoc-markup-comment-extraction", "dotnetdoc-project-discovery"]);

const RESULT_CONTRACT = "documentation-producer-result";
const RESULT_CONTRACT_VERSION = "0.1.0-draft";
const PRODUCER_ID = "dotnetdoc";
const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

/**
 * 执行一次 .NET XML documentation 文档构建，并返回 documentation producer result。
 * Runs one .NET XML documentation build and returns a documentation producer result.
 *
 * @param {object} request <lang><en>DotNetDoc runner request with absolute workspace/output directories.</en><zh-CN>包含绝对工作区与输出目录的 DotNetDoc runner 请求。</zh-CN></lang>
 * @param {{ signal?: AbortSignal, reportProgress?: Function }} [context] <lang><en>Optional producer runtime context.</en><zh-CN>可选 producer 运行时上下文。</zh-CN></lang>
 * @returns {Promise<object>} <lang><en>Documentation producer result.</en><zh-CN>Documentation producer result。</zh-CN></lang>
 * @lang zh-CN 执行 .NET XML documentation 构建。
 */
export async function runDotnetDoc(request, context = {}) {
  const normalizedRequest = normalizeRequest(request);
  const normalized = {
    ...normalizedRequest,
    inputs: await expandInputs(normalizedRequest)
  };
  await mkdir(normalized.outputDirectory, { recursive: true });

  const artifacts = [];
  const diagnostics = [];
  const extractionRecords = [];
  let completed = 0;

  for (const [index, input] of normalized.inputs.entries()) {
    if (context.signal?.aborted) {
      diagnostics.push(createDiagnostic("DOTNETDOC_RUNNER_ABORTED", "DotNetDoc runner was aborted before all inputs completed.", "error"));
      break;
    }

    context.reportProgress?.({
      phase: "extract",
      current: index,
      total: normalized.inputs.length,
      message: input.path
    });

    try {
      const generated = await processInput(input, normalized);
      artifacts.push(...generated.artifacts);
      diagnostics.push(...generated.diagnostics);
      extractionRecords.push(generated.extractionRecord);
      completed += 1;
    } catch (error) {
      diagnostics.push(createDiagnostic(
        "DOTNETDOC_RUNNER_INPUT_FAILED",
        `Unable to process DotNetDoc input ${input.path}.`,
        "error",
        input.path,
        { cause: error instanceof Error ? error.message : String(error) }
      ));
    }
  }

  const sourceRelation = normalized.options.writeSourceRelationArtifact
    ? buildSourceRelationArtifact(extractionRecords, normalized)
    : null;
  if (sourceRelation) {
    const relationPath = "dotnetdoc.source-relation.json";
    await writeJson(path.join(normalized.outputDirectory, relationPath), sourceRelation);
    artifacts.push({
      ...artifact("dotnetdoc-source-relation", "dotnetdoc-source-relation", relationPath, normalized.profileIds),
      contract: sourceRelation.contract,
      contractVersion: sourceRelation.contractVersion
    });
    diagnostics.push(...sourceRelation.diagnostics);
  }

  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const result = {
    contract: RESULT_CONTRACT,
    contractVersion: RESULT_CONTRACT_VERSION,
    producer: {
      id: PRODUCER_ID,
      version: DOTNETDOC_RUNNER_VERSION
    },
    status: hasErrors ? (artifacts.length > 0 ? "partial" : "failed") : "success",
    artifacts,
    diagnostics
  };

  if (normalized.options.writeResultManifest) {
    await writeJson(path.join(normalized.outputDirectory, "dotnetdoc.producer-result.json"), result);
  }

  context.reportProgress?.({
    phase: "complete",
    current: completed,
    total: normalized.inputs.length
  });

  return result;
}

/**
 * 读取 versioned DotNetDoc JSON config 并转成 runner request。
 * Loads a versioned DotNetDoc JSON config and converts it into a runner request.
 *
 * @param {string} configPath <lang><en>Config path relative to cwd or absolute.</en><zh-CN>相对当前目录或绝对的配置文件路径。</zh-CN></lang>
 * @param {{ cwd?: string }} [options] <lang><en>Config loading options.</en><zh-CN>配置加载选项。</zh-CN></lang>
 * @returns {Promise<object>} <lang><en>Normalized runner request.</en><zh-CN>规范化后的 runner 请求。</zh-CN></lang>
 * @lang zh-CN 加载 DotNetDoc 配置。
 */
export async function loadDotnetDocConfig(configPath, options = {}) {
  const absoluteConfigPath = path.resolve(options.cwd ?? process.cwd(), configPath);
  const config = JSON.parse(await readFile(absoluteConfigPath, "utf8"));
  assertRecord(config, "DotNetDoc config must be a JSON object.");
  assertKnownKeys(config, ["$schema", "schemaVersion", "workspaceRoot", "outputDirectory", "inputs", "options", "profileIds"], "config");
  if (config.schemaVersion !== DOTNETDOC_CONFIG_SCHEMA_VERSION) {
    throw new TypeError(`schemaVersion must be ${DOTNETDOC_CONFIG_SCHEMA_VERSION}.`);
  }
  if (config.$schema !== undefined && config.$schema !== DOTNETDOC_CONFIG_SCHEMA_ID) {
    throw new TypeError(`$schema must be ${DOTNETDOC_CONFIG_SCHEMA_ID}.`);
  }

  const configDirectory = path.dirname(absoluteConfigPath);
  const workspaceDirectory = normalizeConfigDirectory(config.workspaceRoot ?? ".", "workspaceRoot");
  const outputDirectory = normalizeConfigDirectory(config.outputDirectory ?? "dist/dotnetdoc", "outputDirectory");
  const workspaceRoot = path.resolve(configDirectory, workspaceDirectory);

  return normalizeRequest({
    workspaceRoot,
    outputDirectory: path.resolve(workspaceRoot, outputDirectory),
    inputs: config.inputs,
    options: config.options,
    profileIds: config.profileIds
  });
}

function normalizeRequest(request) {
  assertRecord(request, "DotNetDoc request must be an object.");
  const workspaceRoot = path.resolve(String(request.workspaceRoot ?? process.cwd()));
  const outputDirectory = path.resolve(String(request.outputDirectory ?? path.join(workspaceRoot, "dist", "dotnetdoc")));
  if (!Array.isArray(request.inputs) || request.inputs.length === 0) {
    throw new TypeError("DotNetDoc request must contain at least one input.");
  }

  const options = {
    writeResultManifest: request.options?.writeResultManifest !== false,
    writeSourceRelationArtifact: request.options?.writeSourceRelationArtifact !== false
  };
  const profileIds = normalizeProfileIds(request.profileIds ?? ["dotnetdoc"]);

  return {
    workspaceRoot,
    outputDirectory,
    inputs: request.inputs.map(normalizeInput),
    options,
    profileIds
  };
}

function normalizeInput(input, index) {
  assertRecord(input, `inputs[${index}] must be an object.`);
  assertKnownKeys(input, ["kind", "path", "paths", "glob", "globs", "excludeGlobs", "globPatterns", "excludeGlobPatterns", "applicationRoot", "artifactBasePath", "hiaDocumentId", "title"], `inputs[${index}]`);
  if (!DOTNETDOC_INPUT_KINDS.includes(input.kind)) {
    throw new TypeError(`inputs[${index}].kind must be one of: ${DOTNETDOC_INPUT_KINDS.join(", ")}.`);
  }

  const explicitPaths = normalizeInputPathList(input, index);
  const globPatterns = uniqueStrings([
    ...normalizeInputGlobList(input, index, "glob", "globs"),
    ...normalizeInternalGlobList(input.globPatterns, index, "globPatterns")
  ]);
  const excludeGlobPatterns = uniqueStrings([
    ...normalizeInputGlobList(input, index, null, "excludeGlobs"),
    ...normalizeInternalGlobList(input.excludeGlobPatterns, index, "excludeGlobPatterns")
  ]);
  if (explicitPaths.length === 0 && globPatterns.length === 0) {
    throw new TypeError(`inputs[${index}] must define path, paths, glob or globs.`);
  }

  const inputPath = explicitPaths[0] ?? `${input.kind}-group`;
  const artifactBasePath = input.artifactBasePath
    ? normalizeSafeRelativePath(input.artifactBasePath, `inputs[${index}].artifactBasePath`)
    : (explicitPaths[0] ? stripKnownInputExtension(explicitPaths[0]) : `${input.kind}-group`);

  return {
    kind: input.kind,
    path: inputPath,
    paths: explicitPaths,
    globPatterns,
    excludeGlobPatterns,
    applicationRoot: input.applicationRoot ? normalizeSafeRelativePath(input.applicationRoot, `inputs[${index}].applicationRoot`) : ".",
    artifactBasePath,
    hiaDocumentId: input.hiaDocumentId,
    title: input.title
  };
}

async function processInput(input, request) {
  const dotnetdoc = input.kind === "dotnet-xml-doc"
    ? await processXmlDocInput(input, request)
    : input.kind === "dotnet-csharp-source"
      ? await processCSharpSourceInput(input, request)
      : input.kind === "dotnet-aspnet-surface"
        ? await processAspNetEndpointInput(input, request)
        : input.kind === "dotnet-markup-comments"
          ? await processMarkupCommentInput(input, request)
          : await processProjectDiscoveryInput(input, request);
  const hiaDocument = dotnetdoc.contract === DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT
    ? dotnetAspNetEndpointsToHiaDocument(dotnetdoc, {
      id: input.hiaDocumentId,
      title: input.title
    })
    : dotnetdoc.contract === DOTNETDOC_MARKUP_COMMENT_EXTRACTION_CONTRACT
      ? dotnetMarkupCommentsToHiaDocument(dotnetdoc, {
        id: input.hiaDocumentId,
        title: input.title
      })
      : dotnetdoc.contract === DOTNETDOC_PROJECT_DISCOVERY_CONTRACT
        ? dotnetProjectDiscoveryToHiaDocument(dotnetdoc, {
          id: input.hiaDocumentId,
          title: input.title
        })
        : dotnetXmlDocsToHiaDocument(dotnetdoc, {
          id: input.hiaDocumentId,
          title: input.title
        });

  const dotnetdocPath = `${input.artifactBasePath}.dotnetdoc.json`;
  const hiaPath = `${input.artifactBasePath}.hia.json`;
  await writeJson(path.join(request.outputDirectory, dotnetdocPath), dotnetdoc);
  await writeJson(path.join(request.outputDirectory, hiaPath), hiaDocument);

  return {
    artifacts: [
      {
        ...artifact(`${safeArtifactId(input.artifactBasePath)}-dotnetdoc`, "dotnetdoc-extraction", dotnetdocPath, request.profileIds),
        contract: dotnetdoc.contract,
        contractVersion: dotnetdoc.contractVersion
      },
      artifact(`${safeArtifactId(input.artifactBasePath)}-hia-document`, "hia-document", hiaPath, request.profileIds)
    ],
    diagnostics: [...(dotnetdoc.diagnostics ?? []), ...(hiaDocument.diagnostics ?? [])],
    extractionRecord: {
      input,
      artifactPath: dotnetdocPath,
      hiaPath,
      artifact: dotnetdoc,
      hiaDocument
    }
  };
}

/**
 * Build a relation artifact from compiler XML documentation members to C# declarations.
 *
 * @param {object[]} extractionRecords <lang><en>Extraction records produced by the current runner request.</en><zh-CN>当前 runner 请求生成的抽取记录。</zh-CN></lang>
 * @param {object} request <lang><en>Normalized runner request.</en><zh-CN>规范化后的 runner 请求。</zh-CN></lang>
 * @returns {object|null} <lang><en>Relation artifact when XML and source inputs both exist.</en><zh-CN>当 XML 与源码输入同时存在时返回关系产物。</zh-CN></lang>
 * @lang zh-CN 从编译器 XML documentation member 到 C# declaration 构建关系产物。
 */
function buildSourceRelationArtifact(extractionRecords, request) {
  const xmlRecords = extractionRecords.filter((record) => record.artifact.contract === DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT);
  const sourceRecords = extractionRecords.filter((record) => record.artifact.contract === DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT);
  if (xmlRecords.length === 0 || sourceRecords.length === 0) {
    return null;
  }

  const sourceMembers = groupMembersByName(sourceRecords);
  const xmlMembers = groupMembersByName(xmlRecords);
  const relations = [];
  const unresolved = [];

  for (const xmlRecord of xmlRecords) {
    for (const xmlMember of xmlRecord.artifact.members) {
      const matches = sourceMembers.get(xmlMember.memberName) ?? [];
      if (matches.length === 0) {
        unresolved.push(unresolvedMember("missing-csharp-source", "xml-doc", xmlRecord, xmlMember));
        continue;
      }
      for (const [index, match] of matches.entries()) {
        relations.push(createSourceRelation(xmlRecord, xmlMember, match.record, match.member, index));
      }
    }
  }

  for (const sourceRecord of sourceRecords) {
    for (const sourceMember of sourceRecord.artifact.members) {
      if (!xmlMembers.has(sourceMember.memberName)) {
        unresolved.push(unresolvedMember("missing-xml-documentation", "csharp-source", sourceRecord, sourceMember));
      }
    }
  }

  return {
    contract: DOTNETDOC_SOURCE_RELATION_CONTRACT,
    contractVersion: DOTNETDOC_SOURCE_RELATION_CONTRACT_VERSION,
    producer: {
      name: "@hia-doc/dotnetdoc-runner",
      version: DOTNETDOC_RUNNER_VERSION
    },
    source: {
      kind: "dotnetdoc-source-relation",
      relation: "xml-doc-to-csharp-source",
      xmlDocArtifacts: xmlRecords.map((record) => sourceArtifactRef(record)),
      csharpSourceArtifacts: sourceRecords.map((record) => sourceArtifactRef(record))
    },
    summary: {
      relationCount: relations.length,
      unresolvedCount: unresolved.length,
      xmlMemberCount: countMembers(xmlRecords),
      csharpSourceMemberCount: countMembers(sourceRecords)
    },
    privacy: {
      sourcesContentPolicy: "none",
      sourcePreviewPolicy: "none",
      embedsSourcesContent: false
    },
    relations,
    unresolved,
    diagnostics: unresolved.length === 0 ? [] : [
      createDiagnostic(
        "DOTNETDOC_SOURCE_RELATION_UNRESOLVED_MEMBERS",
        `DotNetDoc source relation left ${unresolved.length} member(s) unresolved.`,
        "warning",
        null,
        {
          unresolvedCount: unresolved.length
        }
      )
    ]
  };
}

function createSourceRelation(xmlRecord, xmlMember, sourceRecord, sourceMember, duplicateIndex) {
  const duplicateSuffix = duplicateIndex === 0 ? "" : `-${duplicateIndex + 1}`;
  return {
    id: `dotnetdoc:source-relation:${safeArtifactId(xmlMember.memberName)}${duplicateSuffix}`,
    relation: "documents-declaration",
    memberName: xmlMember.memberName,
    memberId: xmlMember.id,
    kind: xmlMember.kind,
    name: xmlMember.name,
    confidence: sourceMember.source?.confidence ?? "medium",
    hiaSymbol: {
      id: xmlMember.id,
      artifactPath: xmlRecord.hiaPath,
      documentId: xmlRecord.input.hiaDocumentId ?? null
    },
    documentation: {
      memberId: xmlMember.id,
      artifactPath: xmlRecord.artifactPath,
      path: xmlMember.source?.path ?? xmlRecord.input.path,
      language: "xml",
      range: xmlMember.source?.range ?? null,
      rangeSource: xmlMember.source?.rangeSource ?? "compiler-xml-doc",
      confidence: xmlMember.source?.confidence ?? "high"
    },
    declaration: {
      memberId: sourceMember.id,
      artifactPath: sourceRecord.artifactPath,
      path: sourceMember.source?.path ?? sourceRecord.input.path,
      language: sourceMember.source?.language ?? "csharp",
      range: sourceMember.source?.range ?? null,
      rangeSource: sourceMember.source?.rangeSource ?? "roslyn-syntax",
      confidence: sourceMember.source?.confidence ?? "medium",
      semantic: sourceMember.semantic ?? null
    }
  };
}

function groupMembersByName(records) {
  const grouped = new Map();
  for (const record of records) {
    for (const member of record.artifact.members ?? []) {
      const group = grouped.get(member.memberName) ?? [];
      group.push({ record, member });
      grouped.set(member.memberName, group);
    }
  }
  return grouped;
}

function countMembers(records) {
  return records.reduce((count, record) => count + (record.artifact.members?.length ?? 0), 0);
}

function sourceArtifactRef(record) {
  return {
    contract: record.artifact.contract,
    contractVersion: record.artifact.contractVersion,
    artifactPath: record.artifactPath,
    inputPath: record.input.path
  };
}

function unresolvedMember(reason, side, record, member) {
  return {
    memberName: member.memberName,
    memberId: member.id,
    kind: member.kind,
    name: member.name,
    side,
    reason,
    source: {
      path: member.source?.path ?? record.input.path,
      language: member.source?.language ?? (side === "xml-doc" ? "xml" : "csharp"),
      range: member.source?.range ?? null,
      rangeSource: member.source?.rangeSource ?? null,
      confidence: member.source?.confidence ?? null
    }
  };
}

async function processXmlDocInput(input, request) {
  const xmlPath = path.join(request.workspaceRoot, input.path);
  const xmlText = await readFile(xmlPath, "utf8");
  return extractDotnetXmlDocs(xmlText, { path: input.path });
}

async function processCSharpSourceInput(input, request) {
  return extractDotnetSourceFiles({
    workspaceRoot: request.workspaceRoot,
    paths: input.paths
  });
}

async function processAspNetEndpointInput(input, request) {
  return extractAspNetEndpoints({
    workspaceRoot: request.workspaceRoot,
    applicationRoot: input.applicationRoot,
    paths: input.paths
  });
}

async function processMarkupCommentInput(input, request) {
  return extractDotnetMarkupComments({
    workspaceRoot: request.workspaceRoot,
    paths: input.paths
  });
}

async function processProjectDiscoveryInput(input, request) {
  return extractDotnetProjectDiscovery({
    workspaceRoot: request.workspaceRoot,
    paths: input.paths
  });
}

function artifact(id, kind, artifactPath, profileIds) {
  return {
    id,
    kind,
    path: artifactPath,
    format: "json",
    mediaType: "application/json",
    profileIds
  };
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeProfileIds(profileIds) {
  if (!Array.isArray(profileIds) || profileIds.length === 0 || profileIds.some((id) => typeof id !== "string" || !SAFE_ID_PATTERN.test(id))) {
    throw new TypeError("profileIds must be a non-empty array of safe profile ids.");
  }
  return profileIds;
}

function normalizeConfigDirectory(value, label) {
  return normalizeSafeRelativePath(value, label);
}

async function expandInputs(request) {
  const expandedInputs = [];
  for (const input of request.inputs) {
    const expandedPaths = await expandInputPaths(request.workspaceRoot, input);
    expandedInputs.push({
      ...input,
      path: expandedPaths[0],
      paths: expandedPaths,
      globPatterns: undefined,
      excludeGlobPatterns: undefined
    });
  }
  return expandedInputs;
}

async function expandInputPaths(workspaceRoot, input) {
  const matchedPaths = input.globPatterns.length === 0
    ? []
    : await expandGlobPatterns(workspaceRoot, input.globPatterns, input.excludeGlobPatterns);
  const paths = uniqueStrings([...input.paths, ...matchedPaths]);
  if (paths.length === 0) {
    throw new TypeError(`Input ${input.kind} did not resolve any paths.`);
  }
  if (input.kind === "dotnet-xml-doc" && paths.length !== 1) {
    throw new TypeError("dotnet-xml-doc inputs currently require exactly one XML documentation path.");
  }
  return paths;
}

async function expandGlobPatterns(workspaceRoot, patterns, excludePatterns) {
  const includeRegexes = expandBracePatterns(patterns).map(globPatternToRegExp);
  const excludeRegexes = expandBracePatterns(excludePatterns).map(globPatternToRegExp);
  const matched = new Set();
  for (const pattern of patterns) {
    const searchRoot = globSearchRoot(pattern);
    const files = await listWorkspaceFiles(workspaceRoot, searchRoot);
    for (const filePath of files) {
      if (includeRegexes.some((regex) => regex.test(filePath)) && !excludeRegexes.some((regex) => regex.test(filePath))) {
        matched.add(filePath);
      }
    }
  }
  return [...matched].sort((left, right) => left.localeCompare(right));
}

async function listWorkspaceFiles(workspaceRoot, relativeDirectory) {
  const root = path.join(workspaceRoot, relativeDirectory);
  const result = [];

  async function visit(absoluteDirectory, relativeDirectoryPath) {
    let entries;
    try {
      entries = await readdir(absoluteDirectory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const relativePath = relativeDirectoryPath === "." ? entry.name : `${relativeDirectoryPath}/${entry.name}`;
      const absolutePath = path.join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        result.push(relativePath.replaceAll("\\", "/"));
      }
    }
  }

  await visit(root, relativeDirectory);
  return result;
}

function normalizeInputPathList(input, index) {
  const paths = [];
  if (input.path !== undefined) {
    paths.push(normalizeSafeRelativePath(input.path, `inputs[${index}].path`));
  }
  if (input.paths !== undefined) {
    if (!Array.isArray(input.paths) || input.paths.length === 0) {
      throw new TypeError(`inputs[${index}].paths must be a non-empty array.`);
    }
    paths.push(...input.paths.map((value, pathIndex) => normalizeSafeRelativePath(value, `inputs[${index}].paths[${pathIndex}]`)));
  }
  return uniqueStrings(paths);
}

function normalizeInputGlobList(input, index, singularKey, pluralKey) {
  const patterns = [];
  if (singularKey && input[singularKey] !== undefined) {
    patterns.push(normalizeSafeGlobPattern(input[singularKey], `inputs[${index}].${singularKey}`));
  }
  if (input[pluralKey] !== undefined) {
    if (!Array.isArray(input[pluralKey]) || input[pluralKey].length === 0) {
      throw new TypeError(`inputs[${index}].${pluralKey} must be a non-empty array.`);
    }
    patterns.push(...input[pluralKey].map((value, patternIndex) => normalizeSafeGlobPattern(value, `inputs[${index}].${pluralKey}[${patternIndex}]`)));
  }
  return uniqueStrings(patterns);
}

function normalizeInternalGlobList(values, index, key) {
  if (values === undefined) {
    return [];
  }
  if (!Array.isArray(values)) {
    throw new TypeError(`inputs[${index}].${key} must be an array.`);
  }
  return values.map((value, patternIndex) => normalizeSafeGlobPattern(value, `inputs[${index}].${key}[${patternIndex}]`));
}

function normalizeSafeRelativePath(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty relative path.`);
  }
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError(`${label} must be a safe relative path.`);
  }
  return normalized;
}

function normalizeSafeGlobPattern(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty relative glob pattern.`);
  }
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError(`${label} must be a safe relative glob pattern.`);
  }
  return normalized;
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function expandBracePatterns(patterns) {
  return patterns.flatMap(expandBracePattern);
}

function expandBracePattern(pattern) {
  const match = /\{([^{}]+)\}/.exec(pattern);
  if (!match) {
    return [pattern];
  }
  const before = pattern.slice(0, match.index);
  const after = pattern.slice(match.index + match[0].length);
  return match[1].split(",").flatMap((part) => expandBracePattern(`${before}${part.trim()}${after}`));
}

function globSearchRoot(pattern) {
  const segments = pattern.split("/");
  const staticSegments = [];
  for (const segment of segments) {
    if (/[*{}]/.test(segment)) {
      break;
    }
    staticSegments.push(segment);
  }
  return staticSegments.length === 0 ? "." : staticSegments.join("/");
}

function globPatternToRegExp(pattern) {
  let source = "^";
  for (let index = 0; index < pattern.length;) {
    const char = pattern[index];
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        if (pattern[index + 2] === "/") {
          source += "(?:.*/)?";
          index += 3;
        } else {
          source += ".*";
          index += 2;
        }
      } else {
        source += "[^/]*";
        index += 1;
      }
      continue;
    }
    source += escapeRegExp(char);
    index += 1;
  }
  return new RegExp(`${source}$`);
}

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function stripKnownInputExtension(value) {
  return value.replace(/\.(?:xml|cs|csproj|sln|aspx|ascx|master|cshtml|razor)$/i, "");
}

function safeArtifactId(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "input";
}

function assertRecord(value, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(message);
  }
}

function assertKnownKeys(value, allowedKeys, label) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new TypeError(`Unsupported ${label} key: ${key}.`);
    }
  }
}

function createDiagnostic(code, message, severity, pathValue, metadata = {}) {
  return {
    code,
    message,
    severity,
    source: pathValue ? { path: pathValue } : null,
    metadata
  };
}
