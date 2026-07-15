import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { extractDotnetXmlDocs } from "@hia-doc/dotnet-xml-doc-extractor";
import { dotnetXmlDocsToHiaDocument } from "@hia-doc/dotnetdoc-adapter";
import {
  DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT,
  DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION
} from "@hia-doc/dotnetdoc-spec";

export {
  DOTNETDOC_CONFIG_JSON_SCHEMA,
  DOTNETDOC_CONFIG_SCHEMA_ID,
  DOTNETDOC_CONFIG_SCHEMA_VERSION
} from "./schema.mjs";
import { DOTNETDOC_CONFIG_SCHEMA_ID, DOTNETDOC_CONFIG_SCHEMA_VERSION } from "./schema.mjs";

export const DOTNETDOC_RUNNER_VERSION = "0.0.0";
export const DOTNETDOC_INPUT_KINDS = Object.freeze(["dotnet-xml-doc"]);
export const DOTNETDOC_OUTPUT_KINDS = Object.freeze(["dotnetdoc-extraction", "hia-document"]);

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
  const normalized = normalizeRequest(request);
  await mkdir(normalized.outputDirectory, { recursive: true });

  const artifacts = [];
  const diagnostics = [];
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
    writeResultManifest: request.options?.writeResultManifest !== false
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
  assertKnownKeys(input, ["kind", "path", "artifactBasePath", "hiaDocumentId", "title"], `inputs[${index}]`);
  if (input.kind !== "dotnet-xml-doc") {
    throw new TypeError(`inputs[${index}].kind must be dotnet-xml-doc.`);
  }

  const inputPath = normalizeSafeRelativePath(input.path, `inputs[${index}].path`);
  const artifactBasePath = input.artifactBasePath
    ? normalizeSafeRelativePath(input.artifactBasePath, `inputs[${index}].artifactBasePath`)
    : stripXmlExtension(inputPath);

  return {
    kind: input.kind,
    path: inputPath,
    artifactBasePath,
    hiaDocumentId: input.hiaDocumentId,
    title: input.title
  };
}

async function processInput(input, request) {
  const xmlPath = path.join(request.workspaceRoot, input.path);
  const xmlText = await readFile(xmlPath, "utf8");
  const dotnetdoc = extractDotnetXmlDocs(xmlText, { path: input.path });
  const hiaDocument = dotnetXmlDocsToHiaDocument(dotnetdoc, {
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
        contract: DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT,
        contractVersion: DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT_VERSION
      },
      artifact(`${safeArtifactId(input.artifactBasePath)}-hia-document`, "hia-document", hiaPath, request.profileIds)
    ],
    diagnostics: [...(dotnetdoc.diagnostics ?? []), ...(hiaDocument.diagnostics ?? [])]
  };
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

function stripXmlExtension(value) {
  return value.replace(/\.xml$/i, "");
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
