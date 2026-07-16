import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT,
  DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION,
  DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT,
  DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION
} from "@hia-doc/dotnetdoc-spec";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const helperProjectPath = path.join(packageRoot, "tools", "DotNetDoc.RoslynSourceExtractor", "DotNetDoc.RoslynSourceExtractor.csproj");
const PRODUCER_NAME = "@hia-doc/dotnet-source-extractor";
const PRODUCER_VERSION = "0.1.0";
const ASPNET_SURFACE_EXTENSIONS = new Set([".aspx", ".ascx", ".ashx", ".asmx", ".cs"]);
const HTTP_ATTRIBUTE_METHODS = Object.freeze({
  HttpGet: ["GET"],
  HttpPost: ["POST"],
  HttpPut: ["PUT"],
  HttpDelete: ["DELETE"],
  HttpPatch: ["PATCH"],
  HttpHead: ["HEAD"],
  HttpOptions: ["OPTIONS"]
});
const MINIMAL_API_METHODS = Object.freeze({
  MapGet: ["GET"],
  MapPost: ["POST"],
  MapPut: ["PUT"],
  MapDelete: ["DELETE"],
  MapPatch: ["PATCH"]
});

/**
 * Extract documented/public C# declarations with Roslyn syntax APIs.
 *
 * @param {object} request <lang><en>C# source extraction request.</en><zh-CN>C# 源码抽取请求。</zh-CN></lang>
 * @param {string} request.workspaceRoot <lang><en>Absolute or cwd-relative workspace root.</en><zh-CN>绝对或相对当前目录的工作区根目录。</zh-CN></lang>
 * @param {string[]} request.paths <lang><en>Safe workspace-relative `.cs` file paths.</en><zh-CN>安全的工作区相对 `.cs` 文件路径。</zh-CN></lang>
 * @returns {Promise<object>} <lang><en>`dotnetdoc-csharp-source-extraction` artifact.</en><zh-CN>`dotnetdoc-csharp-source-extraction` 产物。</zh-CN></lang>
 * @throws {Error} <lang><en>When the Roslyn helper fails or returns an invalid artifact.</en><zh-CN>当 Roslyn helper 失败或返回无效产物时抛出。</zh-CN></lang>
 * @lang zh-CN 使用 Roslyn 语法 API 抽取 C# 源码文档化信息。
 */
export async function extractDotnetSourceFiles(request) {
  const normalized = normalizeRequest(request);
  const artifact = await runRoslynHelper(normalized);
  assertSourceArtifact(artifact);
  return artifact;
}

/**
 * Extract ASP.NET route and Web Forms surface endpoints from source files.
 *
 * @param {object} request <lang><en>ASP.NET endpoint extraction request.</en><zh-CN>ASP.NET endpoint 抽取请求。</zh-CN></lang>
 * @param {string} request.workspaceRoot <lang><en>Absolute or cwd-relative workspace root.</en><zh-CN>绝对或相对当前目录的工作区根目录。</zh-CN></lang>
 * @param {string[]} request.paths <lang><en>Workspace-relative ASP.NET markup or C# files.</en><zh-CN>工作区相对 ASP.NET 标记或 C# 文件。</zh-CN></lang>
 * @param {string} [request.applicationRoot] <lang><en>Optional workspace-relative application root used to derive Web Forms app-relative paths.</en><zh-CN>可选工作区相对应用根目录，用于推导 Web Forms 应用相对路径。</zh-CN></lang>
 * @returns {Promise<object>} <lang><en>`dotnetdoc-aspnet-endpoint-extraction` artifact.</en><zh-CN>`dotnetdoc-aspnet-endpoint-extraction` 产物。</zh-CN></lang>
 * @lang zh-CN 抽取 ASP.NET 路由与 Web Forms surface endpoint。
 */
export async function extractAspNetEndpoints(request) {
  const normalized = normalizeAspNetEndpointRequest(request);
  const endpoints = [];
  const diagnostics = [];
  for (const relativePath of normalized.paths) {
    const text = await readFile(path.join(normalized.workspaceRoot, relativePath), "utf8");
    const extension = path.extname(relativePath).toLowerCase();
    const extracted = extension === ".cs"
      ? extractCSharpAspNetEndpoints(text, relativePath)
      : await extractWebFormsSurface(text, relativePath, normalized);
    endpoints.push(...extracted.endpoints);
    diagnostics.push(...extracted.diagnostics);
  }

  return {
    contract: DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT,
    contractVersion: DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION,
    producer: {
      name: PRODUCER_NAME,
      version: PRODUCER_VERSION,
      engine: "source-scan",
      engineVersion: "0.1.0"
    },
    source: {
      kind: "aspnet-surface",
      applicationRoot: normalized.applicationRoot,
      files: normalized.paths.map((filePath) => ({
        path: filePath,
        language: languageForPath(filePath)
      }))
    },
    summary: {
      endpointCount: endpoints.length,
      routableEndpointCount: endpoints.filter((endpoint) => endpoint.routable).length,
      webFormsSurfaceCount: endpoints.filter((endpoint) => endpoint.framework === "aspnet-webforms").length,
      aspNetCoreSurfaceCount: endpoints.filter((endpoint) => endpoint.framework === "aspnet-core").length
    },
    endpoints,
    diagnostics
  };
}

function normalizeRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("DotNet source extraction request must be an object.");
  }
  const workspaceRoot = path.resolve(String(request.workspaceRoot ?? process.cwd()));
  if (!Array.isArray(request.paths) || request.paths.length === 0) {
    throw new TypeError("DotNet source extraction request must contain at least one path.");
  }
  return {
    workspaceRoot,
    paths: request.paths.map((value, index) => normalizeSafeRelativePath(value, `paths[${index}]`))
  };
}

function normalizeAspNetEndpointRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("ASP.NET endpoint extraction request must be an object.");
  }
  const workspaceRoot = path.resolve(String(request.workspaceRoot ?? process.cwd()));
  if (!Array.isArray(request.paths) || request.paths.length === 0) {
    throw new TypeError("ASP.NET endpoint extraction request must contain at least one path.");
  }
  return {
    workspaceRoot,
    applicationRoot: request.applicationRoot === undefined
      ? "."
      : normalizeSafeDirectoryPath(request.applicationRoot, "applicationRoot"),
    paths: request.paths.map((value, index) => normalizeAspNetSurfacePath(value, `paths[${index}]`))
  };
}

function runRoslynHelper(request) {
  return new Promise((resolve, reject) => {
    const child = spawn("dotnet", [
      "run",
      "--project",
      helperProjectPath,
      "--no-launch-profile",
      "--",
      "--workspace-root",
      request.workspaceRoot,
      ...request.paths
    ], {
      cwd: packageRoot,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Roslyn source extractor failed with exit code ${code}.\n${stderr.trim()}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Roslyn source extractor returned invalid JSON.\n${error instanceof Error ? error.message : String(error)}\n${stderr.trim()}`));
      }
    });
  });
}

function assertSourceArtifact(artifact) {
  if (artifact?.contract !== DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT) {
    throw new Error(`Expected ${DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT} artifact.`);
  }
  if (artifact.contractVersion !== DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION) {
    throw new Error(`Expected source extraction contract version ${DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION}.`);
  }
  if (!Array.isArray(artifact.members)) {
    throw new Error("DotNet source extraction artifact must contain members array.");
  }
}

function normalizeSafeRelativePath(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty relative path.`);
  }
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError(`${label} must be a safe relative path.`);
  }
  if (!normalized.endsWith(".cs")) {
    throw new TypeError(`${label} must reference a .cs file.`);
  }
  return normalized;
}

function normalizeSafeDirectoryPath(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty relative path.`);
  }
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/u, "") || ".";
  if (normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError(`${label} must be a safe relative path.`);
  }
  return normalized;
}

function normalizeAspNetSurfacePath(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty relative path.`);
  }
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError(`${label} must be a safe relative path.`);
  }
  if (!ASPNET_SURFACE_EXTENSIONS.has(path.extname(normalized).toLowerCase())) {
    throw new TypeError(`${label} must reference an ASP.NET markup or C# file.`);
  }
  return normalized;
}

async function extractWebFormsSurface(text, relativePath, request) {
  const directive = parseWebFormsDirective(text);
  if (!directive) {
    return {
      endpoints: [],
      diagnostics: [diagnostic("DOTNETDOC_ASPNET_MARKUP_DIRECTIVE_MISSING", "ASP.NET markup file has no Page or Control directive.", "warning", relativePath)]
    };
  }

  const directiveKind = directive.name.toLowerCase() === "page" ? "page" : "control";
  const routeTemplate = toAppRelativePath(relativePath, request.applicationRoot);
  const codeBehindPath = directive.attributes.CodeBehind ?? directive.attributes.CodeFile ?? null;
  const codeBehind = codeBehindPath
    ? await findCodeBehind(relativePath, codeBehindPath, request)
    : null;
  const handler = codeBehind
    ? await extractWebFormsHandler(codeBehind, request, directiveKind)
    : null;
  const source = sourceForSpan(text, relativePath, "aspnet-markup", directive.start, directive.end, "aspnet-webforms-directive", "high");
  const kind = directiveKind === "page" ? "aspnet-webforms-page" : "aspnet-webforms-control";

  return {
    endpoints: [
      {
        id: `aspnet:${safeArtifactId(kind)}:${safeArtifactId(routeTemplate)}`,
        kind,
        framework: "aspnet-webforms",
        name: path.basename(relativePath),
        displayName: `${directive.name} ${routeTemplate}`,
        route: {
          template: routeTemplate,
          normalizedPath: routeTemplate.startsWith("~/") ? `/${routeTemplate.slice(2)}` : routeTemplate,
          source: "webforms-file-path",
          confidence: "high"
        },
        httpMethods: directiveKind === "page" ? ["GET", "POST"] : [],
        routable: directiveKind === "page",
        handler: {
          kind: "webforms-codebehind",
          typeName: directive.attributes.Inherits ?? null,
          memberName: handler?.memberName ?? null,
          source: handler?.source ?? null
        },
        source,
        metadata: {
          webForms: {
            directive: directive.name,
            inherits: directive.attributes.Inherits ?? null,
            codeBehind: codeBehind?.path ?? codeBehindPath,
            masterPageFile: directive.attributes.MasterPageFile ?? null,
            autoEventWireup: directive.attributes.AutoEventWireup ?? null
          }
        }
      }
    ],
    diagnostics: []
  };
}

function extractCSharpAspNetEndpoints(text, relativePath) {
  const endpoints = [
    ...extractAttributeRoutingEndpoints(text, relativePath),
    ...extractMinimalApiEndpoints(text, relativePath)
  ];
  return {
    endpoints,
    diagnostics: []
  };
}

function parseWebFormsDirective(text) {
  const match = /<%@\s*(Page|Control)\b([\s\S]*?)%>/iu.exec(text);
  if (!match) {
    return null;
  }
  return {
    name: match[1],
    attributes: parseAttributes(match[2]),
    start: match.index,
    end: match.index + match[0].length
  };
}

function parseAttributes(text) {
  const result = {};
  for (const match of text.matchAll(/\b([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/gu)) {
    result[match[1]] = match[2];
  }
  return result;
}

async function findCodeBehind(markupPath, codeBehindPath, request) {
  const normalizedCodeBehind = normalizeAspNetSurfacePath(path.posix.join(path.posix.dirname(markupPath), codeBehindPath.replaceAll("\\", "/")), "codeBehind");
  const absolutePath = path.join(request.workspaceRoot, normalizedCodeBehind);
  try {
    await readFile(absolutePath, "utf8");
    return {
      path: normalizedCodeBehind
    };
  } catch {
    return {
      path: normalizedCodeBehind,
      missing: true
    };
  }
}

async function extractWebFormsHandler(codeBehind, request, directiveKind) {
  if (codeBehind.missing) {
    return null;
  }
  const text = await readFile(path.join(request.workspaceRoot, codeBehind.path), "utf8");
  const handlerNames = directiveKind === "page"
    ? ["Page_Init", "Page_Load", "Page_PreRender"]
    : ["Page_Load", "Page_Init", "Page_PreRender"];
  for (const handlerName of handlerNames) {
    const handlerMatch = new RegExp(`\\b(?:protected|public|private|internal)?\\s*(?:override\\s+)?void\\s+${handlerName}\\s*\\(`, "u").exec(text);
    if (handlerMatch) {
      return {
        memberName: handlerName,
        source: sourceForSpan(text, codeBehind.path, "csharp", handlerMatch.index, handlerMatch.index + handlerMatch[0].length, "webforms-codebehind-handler", "medium")
      };
    }
  }
  return null;
}

function extractAttributeRoutingEndpoints(text, relativePath) {
  const lines = splitLinesWithOffsets(text);
  const classes = [];
  for (const match of text.matchAll(/\bclass\s+([A-Za-z_]\w*)\b/gu)) {
    const classLine = lineIndexForOffset(lines, match.index);
    const attributes = attributeGroupsBefore(lines, classLine);
    classes.push({
      name: match[1],
      shortName: match[1].replace(/Controller$/u, ""),
      index: match.index,
      routePrefix: firstRouteTemplate(attributes) ?? "",
      isController: /Controller$/u.test(match[1]) || attributes.some((attribute) => attribute.name === "ApiController")
    });
  }

  const endpoints = [];
  const methodPattern = /\b(?:public|protected|internal)\s+(?:async\s+)?(?:[A-Za-z_][\w.<>,?\[\]\s]*\s+)+([A-Za-z_]\w*)\s*\(/gu;
  for (const match of text.matchAll(methodPattern)) {
    const lineIndex = lineIndexForOffset(lines, match.index);
    const attributes = attributeGroupsBefore(lines, lineIndex);
    const httpRoute = httpRouteFromAttributes(attributes);
    if (!httpRoute) {
      continue;
    }
    const controller = nearestClass(classes, match.index);
    const prefix = controller?.routePrefix ?? "";
    const template = replaceRouteTokens(joinRouteTemplates(prefix, httpRoute.template), controller, match[1]);
    endpoints.push({
      id: `aspnet:controller-action:${safeArtifactId(`${controller?.name ?? "controller"}.${match[1]}.${template}`)}`,
      kind: "aspnet-controller-action",
      framework: "aspnet-core",
      name: match[1],
      displayName: `${controller?.name ?? "Controller"}.${match[1]}`,
      route: {
        template,
        normalizedPath: normalizeHttpRoutePath(template),
        source: "attribute-routing",
        confidence: controller?.isController ? "high" : "medium"
      },
      httpMethods: httpRoute.methods,
      routable: true,
      handler: {
        kind: "controller-action",
        typeName: controller?.name ?? null,
        memberName: match[1],
        source: sourceForSpan(text, relativePath, "csharp", match.index, match.index + match[0].length, "attribute-routing-action", "medium")
      },
      source: sourceForSpan(text, relativePath, "csharp", match.index, match.index + match[0].length, "attribute-routing-action", "medium"),
      metadata: {
        aspnetCore: {
          controller: controller?.name ?? null,
          attributes: attributes.map((attribute) => attribute.raw)
        }
      }
    });
  }
  return endpoints;
}

function extractMinimalApiEndpoints(text, relativePath) {
  const endpoints = [];
  const pattern = /\b(?:[A-Za-z_]\w*\.)?(MapGet|MapPost|MapPut|MapDelete|MapPatch)\s*\(\s*(?:"([^"]+)"|'([^']+)')/gu;
  for (const match of text.matchAll(pattern)) {
    const methodName = match[1];
    const template = match[2] ?? match[3] ?? "/";
    endpoints.push({
      id: `aspnet:minimal-api:${safeArtifactId(`${methodName}.${template}`)}`,
      kind: "aspnet-minimal-api-endpoint",
      framework: "aspnet-core",
      name: methodName,
      displayName: `${methodName} ${template}`,
      route: {
        template,
        normalizedPath: normalizeHttpRoutePath(template),
        source: "minimal-api-map",
        confidence: "medium"
      },
      httpMethods: MINIMAL_API_METHODS[methodName] ?? [],
      routable: true,
      handler: {
        kind: "minimal-api-delegate",
        typeName: null,
        memberName: methodName,
        source: sourceForSpan(text, relativePath, "csharp", match.index, match.index + match[0].length, "minimal-api-map", "medium")
      },
      source: sourceForSpan(text, relativePath, "csharp", match.index, match.index + match[0].length, "minimal-api-map", "medium"),
      metadata: {
        aspnetCore: {
          mapMethod: methodName
        }
      }
    });
  }
  return endpoints;
}

function splitLinesWithOffsets(text) {
  const lines = [];
  let offset = 0;
  for (const line of text.split(/\r?\n/u)) {
    lines.push({ text: line, offset });
    offset += line.length + 1;
  }
  return lines;
}

function lineIndexForOffset(lines, offset) {
  let result = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].offset > offset) {
      break;
    }
    result = index;
  }
  return result;
}

function attributeGroupsBefore(lines, declarationLineIndex) {
  const attributeLines = [];
  for (let index = declarationLineIndex - 1; index >= 0; index -= 1) {
    const line = lines[index].text.trim();
    if (line.length === 0) {
      continue;
    }
    if (!line.startsWith("[")) {
      break;
    }
    attributeLines.unshift(line);
  }
  const attributes = [];
  for (const line of attributeLines) {
    for (const match of line.matchAll(/\[\s*([A-Za-z_][\w.]*)\s*(?:Attribute)?\s*(?:\(([^)]*)\))?/gu)) {
      const name = match[1].split(".").at(-1).replace(/Attribute$/u, "");
      attributes.push({
        name,
        raw: match[0],
        firstString: firstStringArgument(match[2] ?? "")
      });
    }
  }
  return attributes;
}

function firstRouteTemplate(attributes) {
  const route = attributes.find((attribute) => attribute.name === "Route" || attribute.name === "RoutePrefix");
  return route?.firstString ?? null;
}

function httpRouteFromAttributes(attributes) {
  for (const attribute of attributes) {
    if (HTTP_ATTRIBUTE_METHODS[attribute.name]) {
      return {
        methods: HTTP_ATTRIBUTE_METHODS[attribute.name],
        template: attribute.firstString ?? ""
      };
    }
  }
  const route = attributes.find((attribute) => attribute.name === "Route");
  if (route) {
    return {
      methods: [],
      template: route.firstString ?? ""
    };
  }
  return null;
}

function firstStringArgument(value) {
  const match = /"([^"]*)"|'([^']*)'/u.exec(value);
  return match?.[1] ?? match?.[2] ?? null;
}

function nearestClass(classes, index) {
  let candidate = null;
  for (const classInfo of classes) {
    if (classInfo.index < index) {
      candidate = classInfo;
    }
  }
  return candidate;
}

function joinRouteTemplates(prefix, suffix) {
  if (!prefix) {
    return suffix || "/";
  }
  if (!suffix) {
    return prefix;
  }
  return `${prefix.replace(/\/$/u, "")}/${suffix.replace(/^\//u, "")}`;
}

function replaceRouteTokens(template, controller, actionName) {
  return String(template || "/")
    .replaceAll("[controller]", controller?.shortName ?? "controller")
    .replaceAll("[action]", actionName);
}

function normalizeHttpRoutePath(template) {
  const value = String(template || "/");
  if (value.startsWith("~/")) {
    return `/${value.slice(2)}`;
  }
  return value.startsWith("/") ? value : `/${value}`;
}

function toAppRelativePath(relativePath, applicationRoot) {
  const normalizedRoot = applicationRoot === "." ? "" : `${applicationRoot.replace(/\/$/u, "")}/`;
  const withoutRoot = normalizedRoot && relativePath.startsWith(normalizedRoot)
    ? relativePath.slice(normalizedRoot.length)
    : relativePath;
  return `~/${withoutRoot.replace(/^\//u, "")}`;
}

function sourceForSpan(text, relativePath, language, start, end, rangeSource, confidence) {
  return {
    path: relativePath,
    language,
    rangeSource,
    confidence,
    range: {
      start: positionForOffset(text, start),
      end: positionForOffset(text, end)
    }
  };
}

function positionForOffset(text, offset) {
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    line: lines.length,
    column: lines.at(-1).length + 1
  };
}

function languageForPath(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".cs") {
    return "csharp";
  }
  return "aspnet-markup";
}

function diagnostic(code, message, severity, pathValue) {
  return {
    code,
    message,
    severity,
    source: pathValue ? { path: pathValue } : null
  };
}

function safeArtifactId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "input";
}
