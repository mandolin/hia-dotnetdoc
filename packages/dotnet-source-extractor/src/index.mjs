import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { XMLParser } from "fast-xml-parser";

import {
  DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT,
  DOTNETDOC_ASPNET_ENDPOINT_EXTRACTION_CONTRACT_VERSION,
  DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT,
  DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION,
  DOTNETDOC_PROJECT_DISCOVERY_CONTRACT,
  DOTNETDOC_PROJECT_DISCOVERY_CONTRACT_VERSION
} from "@hia-doc/dotnetdoc-spec";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const helperProjectPath = path.join(packageRoot, "tools", "DotNetDoc.RoslynSourceExtractor", "DotNetDoc.RoslynSourceExtractor.csproj");
const PRODUCER_NAME = "@hia-doc/dotnet-source-extractor";
const PRODUCER_VERSION = "0.1.1";
const ASPNET_SURFACE_EXTENSIONS = new Set([".aspx", ".ascx", ".ashx", ".asmx", ".cs"]);
const DOTNET_PROJECT_EXTENSIONS = new Set([".csproj", ".sln"]);
const CSPROJ_XML_PARSER = new XMLParser({
  allowBooleanAttributes: true,
  attributeNamePrefix: "",
  ignoreAttributes: false,
  ignoreDeclaration: true,
  parseTagValue: false,
  preserveOrder: false,
  processEntities: true,
  textNodeName: "#text",
  trimValues: true
});
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

/**
 * Discover .NET solution and project structure without compiling the workspace.
 *
 * @param {object} request <lang><en>.NET project discovery request.</en><zh-CN>.NET project 发现请求。</zh-CN></lang>
 * @param {string} request.workspaceRoot <lang><en>Absolute or cwd-relative workspace root.</en><zh-CN>绝对或相对当前目录的工作区根目录。</zh-CN></lang>
 * @param {string|string[]} [request.path] <lang><en>Workspace-relative `.sln` or `.csproj` path.</en><zh-CN>工作区相对 `.sln` 或 `.csproj` 路径。</zh-CN></lang>
 * @param {string[]} [request.paths] <lang><en>Workspace-relative `.sln` or `.csproj` paths.</en><zh-CN>工作区相对 `.sln` 或 `.csproj` 路径列表。</zh-CN></lang>
 * @returns {Promise<object>} <lang><en>`dotnetdoc-project-discovery` artifact.</en><zh-CN>`dotnetdoc-project-discovery` 产物。</zh-CN></lang>
 * @lang zh-CN 在不编译工作区的情况下发现 .NET solution 与 project 结构。
 */
export async function extractDotnetProjectDiscovery(request) {
  const normalized = normalizeProjectDiscoveryRequest(request);
  const diagnostics = [];
  const solutions = [];
  const projectsByPath = new Map();

  for (const relativePath of normalized.paths) {
    const absolutePath = path.join(normalized.workspaceRoot, relativePath);
    const text = await readFile(absolutePath, "utf8");
    const extension = path.extname(relativePath).toLowerCase();
    if (extension === ".sln") {
      const solution = parseSolutionFile(text, relativePath);
      solutions.push(solution);
      for (const solutionProject of solution.projects) {
        if (path.extname(solutionProject.path).toLowerCase() !== ".csproj") {
          diagnostics.push(diagnostic(
            "DOTNETDOC_PROJECT_DISCOVERY_UNSUPPORTED_SOLUTION_PROJECT",
            "Solution project is not a C# project and was kept as solution metadata only.",
            "info",
            solutionProject.path,
            { solutionPath: relativePath, projectTypeGuid: solutionProject.projectTypeGuid }
          ));
          continue;
        }
        try {
          const projectPath = normalizePathFromBase(relativePath, solutionProject.path, "solution project path");
          const projectText = await readFile(path.join(normalized.workspaceRoot, projectPath), "utf8");
          const project = parseProjectFile(projectText, projectPath, { solutionPath: relativePath });
          projectsByPath.set(project.path, project);
        } catch (error) {
          diagnostics.push(diagnostic(
            "DOTNETDOC_PROJECT_DISCOVERY_SOLUTION_PROJECT_UNREADABLE",
            "Solution referenced a project file that could not be read.",
            "warning",
            solutionProject.path,
            { solutionPath: relativePath, cause: error instanceof Error ? error.message : String(error) }
          ));
        }
      }
      continue;
    }

    const project = parseProjectFile(text, relativePath, {});
    projectsByPath.set(project.path, project);
  }

  const projects = [...projectsByPath.values()].sort((left, right) => left.path.localeCompare(right.path));
  const artifactDiagnostics = [...diagnostics, ...projects.flatMap((project) => project.diagnostics ?? [])];

  return {
    contract: DOTNETDOC_PROJECT_DISCOVERY_CONTRACT,
    contractVersion: DOTNETDOC_PROJECT_DISCOVERY_CONTRACT_VERSION,
    producer: {
      name: PRODUCER_NAME,
      version: PRODUCER_VERSION,
      engine: "project-file-scan",
      engineVersion: "0.1.0"
    },
    source: {
      kind: normalized.paths.length === 1 ? sourceKindForProjectPath(normalized.paths[0]) : "dotnet-project-set",
      files: normalized.paths.map((filePath) => ({
        path: filePath,
        language: path.extname(filePath).toLowerCase() === ".sln" ? "sln" : "xml"
      }))
    },
    summary: {
      inputCount: normalized.paths.length,
      solutionCount: solutions.length,
      projectCount: projects.length,
      csharpProjectCount: projects.filter((project) => path.extname(project.path).toLowerCase() === ".csproj").length,
      targetFrameworkCount: new Set(projects.flatMap((project) => project.targetFrameworks)).size,
      packageReferenceCount: projects.reduce((count, project) => count + project.packageReferences.length, 0),
      projectReferenceCount: projects.reduce((count, project) => count + project.projectReferences.length, 0),
      compileItemCount: projects.reduce((count, project) => count + project.compileItems.length, 0),
      diagnosticCount: artifactDiagnostics.length
    },
    solutions,
    projects,
    diagnostics: artifactDiagnostics
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

function normalizeProjectDiscoveryRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError(".NET project discovery request must be an object.");
  }
  const workspaceRoot = path.resolve(String(request.workspaceRoot ?? process.cwd()));
  const rawPaths = request.paths ?? request.path;
  const paths = Array.isArray(rawPaths) ? rawPaths : [rawPaths];
  if (paths.length === 0 || paths.some((value) => value === undefined || value === null)) {
    throw new TypeError(".NET project discovery request must contain at least one path.");
  }
  return {
    workspaceRoot,
    paths: paths.map((value, index) => normalizeDotnetProjectPath(value, `paths[${index}]`))
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

function parseSolutionFile(text, relativePath) {
  const projects = [];
  const projectPattern = /^Project\("(?<projectTypeGuid>[^"]+)"\)\s*=\s*"(?<name>[^"]+)",\s*"(?<projectPath>[^"]+)",\s*"(?<projectGuid>[^"]+)"/gimu;
  for (const match of text.matchAll(projectPattern)) {
    const rawProjectPath = match.groups.projectPath.replaceAll("\\", "/");
    projects.push({
      id: `dotnet-solution-project:${safeArtifactId(`${relativePath}:${rawProjectPath}`)}`,
      name: match.groups.name,
      path: rawProjectPath,
      projectGuid: match.groups.projectGuid,
      projectTypeGuid: match.groups.projectTypeGuid,
      kind: path.extname(rawProjectPath).toLowerCase() === ".csproj" ? "csharp-project" : "solution-item"
    });
  }

  return {
    id: `dotnet-solution:${safeArtifactId(relativePath)}`,
    path: relativePath,
    name: path.basename(relativePath, path.extname(relativePath)),
    format: "sln",
    projectCount: projects.length,
    projects
  };
}

function parseProjectFile(text, relativePath, context) {
  const diagnostics = [];
  const parsed = CSPROJ_XML_PARSER.parse(text);
  const root = parsed?.Project;
  if (!root || typeof root !== "object") {
    diagnostics.push(diagnostic(
      "DOTNETDOC_PROJECT_DISCOVERY_PROJECT_ROOT_MISSING",
      "Project file does not contain a Project root element.",
      "error",
      relativePath
    ));
  }

  const propertyGroups = collectPropertyGroups(root);
  const packageReferences = collectItemReferences(root, "PackageReference").map((item) => ({
    include: item.include,
    version: item.version,
    privateAssets: item.privateAssets,
    includeAssets: item.includeAssets,
    excludeAssets: item.excludeAssets,
    condition: item.condition
  }));
  const projectReferences = collectItemReferences(root, "ProjectReference").map((item) => ({
    include: item.include,
    path: item.include ? normalizeReferencePath(relativePath, item.include) : null,
    condition: item.condition
  }));
  const compileItems = collectItemReferences(root, "Compile").map((item) => ({
    include: item.include,
    update: item.update,
    remove: item.remove,
    condition: item.condition
  }));

  const targetFrameworks = uniqueStrings([
    ...propertyGroups.flatMap((group) => splitTargetFrameworks(group.properties.TargetFrameworks)),
    ...propertyGroups.flatMap((group) => splitTargetFrameworks(group.properties.TargetFramework))
  ]);
  const outputTypes = uniqueStrings(propertyGroups.map((group) => group.properties.OutputType));
  const rootNamespaces = uniqueStrings(propertyGroups.map((group) => group.properties.RootNamespace));
  const assemblyNames = uniqueStrings(propertyGroups.map((group) => group.properties.AssemblyName));

  return {
    id: `dotnet-project:${safeArtifactId(relativePath)}`,
    path: relativePath,
    name: assemblyNames[0] ?? path.basename(relativePath, path.extname(relativePath)),
    fileName: path.basename(relativePath),
    kind: "csharp-project",
    sdk: root?.Sdk ? String(root.Sdk) : null,
    outputType: outputTypes[0] ?? null,
    targetFrameworks,
    rootNamespace: rootNamespaces[0] ?? null,
    assemblyName: assemblyNames[0] ?? null,
    nullable: firstDefinedProperty(propertyGroups, "Nullable"),
    implicitUsings: firstDefinedProperty(propertyGroups, "ImplicitUsings"),
    usesSdkDefaultCompileItems: compileItems.length === 0 && Boolean(root?.Sdk),
    packageReferences,
    projectReferences,
    compileItems,
    propertyGroups,
    source: {
      path: relativePath,
      language: "xml",
      rangeSource: "project-file",
      confidence: "medium"
    },
    metadata: {
      solutionPath: context.solutionPath ?? null
    },
    diagnostics
  };
}

function collectPropertyGroups(root) {
  return asArray(root?.PropertyGroup).map((group) => {
    const properties = {};
    if (group && typeof group === "object") {
      for (const [key, value] of Object.entries(group)) {
        if (key === "Condition" || key === "#text") {
          continue;
        }
        if (isScalar(value)) {
          properties[key] = String(value);
        }
      }
    }
    return {
      condition: group?.Condition ? String(group.Condition) : null,
      properties
    };
  });
}

function collectItemReferences(root, itemName) {
  const results = [];
  for (const itemGroup of asArray(root?.ItemGroup)) {
    for (const item of asArray(itemGroup?.[itemName])) {
      if (!item || typeof item !== "object") {
        continue;
      }
      results.push({
        include: item.Include ? String(item.Include).replaceAll("\\", "/") : null,
        update: item.Update ? String(item.Update).replaceAll("\\", "/") : null,
        remove: item.Remove ? String(item.Remove).replaceAll("\\", "/") : null,
        version: item.Version ? String(item.Version) : null,
        privateAssets: item.PrivateAssets ? String(item.PrivateAssets) : null,
        includeAssets: item.IncludeAssets ? String(item.IncludeAssets) : null,
        excludeAssets: item.ExcludeAssets ? String(item.ExcludeAssets) : null,
        condition: item.Condition ?? itemGroup?.Condition ? String(item.Condition ?? itemGroup.Condition) : null
      });
    }
  }
  return results;
}

function splitTargetFrameworks(value) {
  if (!value) {
    return [];
  }
  return String(value).split(";").map((item) => item.trim()).filter(Boolean);
}

function firstDefinedProperty(propertyGroups, propertyName) {
  const group = propertyGroups.find((item) => item.properties[propertyName] !== undefined);
  return group?.properties[propertyName] ?? null;
}

function sourceKindForProjectPath(relativePath) {
  return path.extname(relativePath).toLowerCase() === ".sln" ? "dotnet-solution" : "dotnet-project";
}

function normalizeReferencePath(projectPath, referencePath) {
  try {
    return normalizePathFromBase(projectPath, referencePath, "project reference path");
  } catch {
    return referencePath.replaceAll("\\", "/");
  }
}

function normalizePathFromBase(basePath, childPath, label) {
  const normalizedChild = String(childPath).replaceAll("\\", "/");
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(basePath), normalizedChild));
  if (!joined || joined.startsWith("/") || /^[a-zA-Z]:\//.test(joined) || joined.split("/").includes("..")) {
    throw new TypeError(`${label} must stay inside the workspace.`);
  }
  return joined;
}

function normalizeDotnetProjectPath(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty relative path.`);
  }
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError(`${label} must be a safe relative path.`);
  }
  if (!DOTNET_PROJECT_EXTENSIONS.has(path.extname(normalized).toLowerCase())) {
    throw new TypeError(`${label} must reference a .sln or .csproj file.`);
  }
  return normalized;
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
      isController: /Controller$/u.test(match[1]) || attributes.some((attribute) => attribute.name === "ApiController"),
      attributes
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
    const aspnetCoreMetadata = buildAspNetCoreEndpointMetadata([
      ...(controller?.attributes ?? []),
      ...attributes
    ], {
      endpointName: httpRoute.name,
      routePrefix: prefix,
      routeSource: "attribute-routing"
    });
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
        confidence: controller?.isController ? "high" : "medium",
        name: aspnetCoreMetadata.endpointName
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
          attributes: attributes.map((attribute) => attribute.raw),
          classAttributes: (controller?.attributes ?? []).map((attribute) => attribute.raw),
          routePrefix: prefix,
          endpointName: aspnetCoreMetadata.endpointName,
          tags: aspnetCoreMetadata.tags,
          authorization: aspnetCoreMetadata.authorization,
          responses: aspnetCoreMetadata.responses
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
    const statement = statementFromIndex(text, match.index);
    const aspnetCoreMetadata = parseMinimalApiFluentMetadata(statement);
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
        confidence: "medium",
        name: aspnetCoreMetadata.endpointName
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
          mapMethod: methodName,
          endpointName: aspnetCoreMetadata.endpointName,
          tags: aspnetCoreMetadata.tags,
          authorization: aspnetCoreMetadata.authorization,
          responses: aspnetCoreMetadata.responses,
          fluentCalls: aspnetCoreMetadata.fluentCalls
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
      const argumentsInfo = parseAttributeArguments(match[2] ?? "");
      attributes.push({
        name,
        raw: match[0],
        firstString: argumentsInfo.strings[0] ?? null,
        arguments: argumentsInfo
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
        template: attribute.firstString ?? "",
        name: attribute.arguments.named.Name ?? null
      };
    }
  }
  const route = attributes.find((attribute) => attribute.name === "Route");
  if (route) {
    return {
      methods: [],
      template: route.firstString ?? "",
      name: route.arguments.named.Name ?? null
    };
  }
  return null;
}

function parseAttributeArguments(value) {
  const text = String(value ?? "");
  const named = {};
  for (const match of text.matchAll(/\b([A-Za-z_]\w*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,\s)]+))/gu)) {
    named[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return {
    raw: text.trim(),
    strings: quotedStrings(text),
    numbers: numericArguments(text),
    statusCodes: statusCodeArguments(text),
    named
  };
}

function buildAspNetCoreEndpointMetadata(attributes, options) {
  return {
    endpointName: options.endpointName ?? null,
    routePrefix: options.routePrefix ?? null,
    routeSource: options.routeSource,
    tags: tagsFromAttributes(attributes),
    authorization: authorizationFromAttributes(attributes),
    responses: responsesFromAttributes(attributes)
  };
}

function parseMinimalApiFluentMetadata(statement) {
  const requireAuthorizationCalls = [...statement.matchAll(/\.RequireAuthorization\s*\(([^)]*)\)/gu)].map((match) => parseAttributeArguments(match[1] ?? ""));
  const allowAnonymous = /\.AllowAnonymous\s*\(/u.test(statement);
  const producesCalls = [...statement.matchAll(/\.Produces(?:<[^>]+>)?\s*\(([^)]*)\)/gu)].map((match) => parseAttributeArguments(match[1] ?? ""));
  const fluentCalls = [...statement.matchAll(/\.([A-Za-z_]\w*)\s*\(/gu)].map((match) => match[1]);
  const policies = uniqueStrings(requireAuthorizationCalls.flatMap((call) => call.strings));

  return {
    endpointName: firstFluentString(statement, "WithName"),
    tags: allFluentStrings(statement, "WithTags"),
    authorization: {
      required: requireAuthorizationCalls.length > 0 && !allowAnonymous,
      allowAnonymous,
      policies,
      roles: [],
      source: requireAuthorizationCalls.length > 0 || allowAnonymous ? "minimal-api-fluent" : "none",
      confidence: requireAuthorizationCalls.length > 0 || allowAnonymous ? "medium" : "unknown"
    },
    responses: producesCalls.map((call) => ({
      statusCode: firstStatusCode(call),
      contentTypes: call.strings.filter((item) => item.includes("/")),
      source: "minimal-api-fluent",
      raw: call.raw
    })),
    fluentCalls
  };
}

function authorizationFromAttributes(attributes) {
  const allowAnonymous = attributes.some((attribute) => attribute.name === "AllowAnonymous");
  const authorizeAttributes = attributes.filter((attribute) => attribute.name === "Authorize");
  const policies = uniqueStrings(authorizeAttributes.map((attribute) => attribute.arguments.named.Policy ?? (attribute.arguments.named.Roles ? null : attribute.firstString)));
  const roles = uniqueStrings(authorizeAttributes.flatMap((attribute) => splitCommaList(attribute.arguments.named.Roles)));
  return {
    required: authorizeAttributes.length > 0 && !allowAnonymous,
    allowAnonymous,
    policies,
    roles,
    source: authorizeAttributes.length > 0 || allowAnonymous ? "attributes" : "none",
    confidence: authorizeAttributes.length > 0 || allowAnonymous ? "medium" : "unknown"
  };
}

function tagsFromAttributes(attributes) {
  return uniqueStrings(attributes
    .filter((attribute) => attribute.name === "Tags" || attribute.name === "EndpointSummary")
    .flatMap((attribute) => attribute.arguments.strings));
}

function responsesFromAttributes(attributes) {
  return attributes
    .filter((attribute) => attribute.name === "ProducesResponseType" || attribute.name === "Produces")
    .map((attribute) => ({
      statusCode: firstStatusCode(attribute.arguments),
      contentTypes: attribute.name === "Produces" ? attribute.arguments.strings.filter((item) => item.includes("/")) : [],
      source: "attributes",
      raw: attribute.raw
    }));
}

function firstFluentString(statement, methodName) {
  const match = new RegExp(`\\.${methodName}\\s*\\(([^)]*)\\)`, "u").exec(statement);
  return match ? quotedStrings(match[1])[0] ?? null : null;
}

function allFluentStrings(statement, methodName) {
  return uniqueStrings([...statement.matchAll(new RegExp(`\\.${methodName}\\s*\\(([^)]*)\\)`, "gu"))]
    .flatMap((match) => quotedStrings(match[1])));
}

function statementFromIndex(text, start) {
  const end = text.indexOf(";", start);
  return end === -1 ? text.slice(start) : text.slice(start, end + 1);
}

function quotedStrings(value) {
  return [...String(value ?? "").matchAll(/"([^"]*)"|'([^']*)'/gu)].map((match) => match[1] ?? match[2] ?? "");
}

function numericArguments(value) {
  return [...String(value ?? "").matchAll(/(?:^|[,(]\s*)(\d{3})(?=\s*[,)]|$)/gu)].map((match) => Number.parseInt(match[1], 10));
}

function statusCodeArguments(value) {
  return [...String(value ?? "").matchAll(/\bStatusCodes\.Status(\d{3})[A-Za-z0-9_]*\b/gu)].map((match) => Number.parseInt(match[1], 10));
}

function firstStatusCode(argumentsInfo) {
  return argumentsInfo.numbers[0] ?? argumentsInfo.statusCodes[0] ?? null;
}

function splitCommaList(value) {
  if (!value) {
    return [];
  }
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
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

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))];
}

function isScalar(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function diagnostic(code, message, severity, pathValue, metadata = {}) {
  return {
    code,
    message,
    severity,
    source: pathValue ? { path: pathValue } : null,
    metadata
  };
}

function safeArtifactId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "input";
}
