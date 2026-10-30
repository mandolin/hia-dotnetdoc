#!/usr/bin/env node

/** @file .NET文档CLI统一处理参数/配置/执行失败，不回显私有参数或堆栈。 @lang en The .NET documentation CLI controls argument/config/execution failures without echoing private arguments or stacks. */
import path from "node:path";
import { parseArgs } from "node:util";

import {
  DOTNETDOC_RUNNER_VERSION,
  loadDotnetDocConfig,
  runDotnetDoc
} from "./index.mjs";

try {
  // <lang><zh-CN>参数解析也在受控边界内，未知选项不能逃出成Node堆栈。</zh-CN><en>Argument parsing is inside the controlled boundary so unknown options cannot escape as Node stacks.</en></lang>
  const { values, positionals } = parseArgs({
    options: {
      config: { type: "string", short: "c" },
      help: { type: "boolean", short: "h" },
      "out-dir": { type: "string", short: "o" },
      title: { type: "string" },
      version: { type: "boolean", short: "v" },
      "workspace-root": { type: "string" }
    },
    allowPositionals: true,
    strict: true
  });

  if (values.help) {
    process.stdout.write(`HIA DotNetDoc ${DOTNETDOC_RUNNER_VERSION}\n\nUsage:\n  hia-dotnetdoc --config dotnetdoc.config.json\n  hia-dotnetdoc [options] <documentation.xml...>\n\nOptions:\n  -c, --config <path>\n  -o, --out-dir <path>\n      --workspace-root <path>\n      --title <title>\n  -v, --version\n`);
    process.exit(0);
  }

  if (values.version) {
    process.stdout.write(`${DOTNETDOC_RUNNER_VERSION}\n`);
    process.exit(0);
  }

  // <lang><zh-CN>仅解析成功后加载配置或建立显式XML请求；路径安全仍由runner裁决。</zh-CN><en>Load config or create explicit XML requests only after successful parsing; the runner still decides path safety.</en></lang>
  const request = values.config
    ? await loadDotnetDocConfig(values.config)
    : createCliRequest(values, positionals);

  if (values["out-dir"]) {
    request.outputDirectory = path.resolve(request.workspaceRoot, values["out-dir"]);
  }

  // <lang><zh-CN>公开完成摘要只包含受控status与产物数，不序列化底层异常。</zh-CN><en>The public completion summary contains only controlled status and artifact count, never serialized lower-layer errors.</en></lang>
  const result = await runDotnetDoc(request);
  process.stdout.write(`DotNetDoc ${result.status}: ${result.artifacts.length} artifact(s).\n`);
  process.exitCode = result.status === "success" ? 0 : 1;
} catch {
  // <lang><zh-CN>异常详情留给显式私有调试，不写公开stderr；请求/文件名/源码均不回显。</zh-CN><en>Exception details require explicit private debugging and never enter public stderr; do not echo request values, filenames or source.</en></lang>
  process.stderr.write('DotNetDoc failed: request or input could not be processed.\n');
  process.exitCode = 1;
}

/**
 * 为位置参数建立既有XML请求；不在解析阶段读取文件或启动helper。
 * @lang en Builds an existing XML request from positionals without file reads or helper execution during parsing.
 * @param {object} cliValues <lang><zh-CN>已由Node parseArgs解析的选项。</zh-CN><en>Options already parsed by Node parseArgs.</en></lang>
 * @param {string[]} inputs <lang><zh-CN>显式XML相对路径列表。</zh-CN><en>Explicit relative XML paths.</en></lang>
 * @returns {object} <lang><zh-CN>工作区内文档请求，实际安全检查仍由runner负责。</zh-CN><en>Documentation request with actual safety checks delegated to the runner.</en></lang>
 * @throws {TypeError} <lang><zh-CN>无输入时拒绝。</zh-CN><en>Rejects missing input.</en></lang>
 */
function createCliRequest(cliValues, inputs) {
  if (inputs.length === 0) {
    throw new TypeError("At least one XML documentation input or --config is required.");
  }
  // <lang><zh-CN>命令行cwd只用作显式工作区基址；它不决定包内Roslyn helper的SDK选择。</zh-CN><en>The CLI cwd is only the explicit workspace base and does not select the bundled Roslyn helper's SDK.</en></lang>
  const workspaceRoot = path.resolve(process.cwd(), cliValues["workspace-root"] ?? ".");
  return {
    workspaceRoot,
    outputDirectory: path.resolve(workspaceRoot, cliValues["out-dir"] ?? "dist/dotnetdoc"),
    inputs: inputs.map((inputPath) => ({
      kind: "dotnet-xml-doc",
      path: inputPath,
      title: cliValues.title
    })),
    options: {
      writeResultManifest: true
    }
  };
}
