#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";

import {
  DOTNETDOC_RUNNER_VERSION,
  loadDotnetDocConfig,
  runDotnetDoc
} from "./index.mjs";

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

try {
  const request = values.config
    ? await loadDotnetDocConfig(values.config)
    : createCliRequest(values, positionals);

  if (values["out-dir"]) {
    request.outputDirectory = path.resolve(request.workspaceRoot, values["out-dir"]);
  }

  const result = await runDotnetDoc(request);
  process.stdout.write(`DotNetDoc ${result.status}: ${result.artifacts.length} artifact(s).\n`);
  process.exitCode = result.status === "success" ? 0 : 1;
} catch (error) {
  process.stderr.write(`DotNetDoc failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

function createCliRequest(cliValues, inputs) {
  if (inputs.length === 0) {
    throw new TypeError("At least one XML documentation input or --config is required.");
  }
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
