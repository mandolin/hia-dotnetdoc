import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT,
  DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT_VERSION
} from "@hia-doc/dotnetdoc-spec";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const helperProjectPath = path.join(packageRoot, "tools", "DotNetDoc.RoslynSourceExtractor", "DotNetDoc.RoslynSourceExtractor.csproj");

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
