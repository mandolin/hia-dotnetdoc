/** @file 只读registry核对与受控预发布检查，不执行发布或回显底层错误。 @lang en Read-only registry verification and controlled prepublication checks without publication or lower-level error echoes. */
const { execFileSync } = require("node:child_process");
const fs = require('node:fs');
const path = require('node:path');

const { loadReleasePackages } = require("./release-packages.cjs");
const { validateReleasePlan } = require('./check-release-plan.cjs');

const defaultRegistry = "https://registry.npmjs.org/";

function parseArgs(args) {
  const options = {
    prepublish: false,
    registry: defaultRegistry
  };

  for (const arg of args) {
    if (arg === "--prepublish") {
      options.prepublish = true;
    } else if (arg.startsWith("--registry=")) {
      options.registry = arg.slice("--registry=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

/** 用固定npm CLI查询一个精确版本，不调用shell；错误只返回受控状态。 @lang en Queries one exact version through the fixed npm CLI without a shell, returning controlled error states only. */
function readRegistryVersion(packageName, version, registry) {
  try {
    // <lang><zh-CN>直接用当前Node的npm CLI参数数组，避免Windows shell解释registry内容。</zh-CN><en>Use the current Node's npm CLI argument array directly, avoiding Windows shell interpretation of registry values.</en></lang>
    const output = execFileSync(process.execPath, [path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), 'view', `${packageName}@${version}`, 'version', `--registry=${registry}`], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000
    }).trim();
    return {
      registryVersion: output,
      status: output === version ? "published" : "version-mismatch"
    };
  } catch (error) {
    const stderr = error.stderr?.toString("utf8") ?? "";
    const stdout = error.stdout?.toString("utf8") ?? "";
    const details = `${stderr}\n${stdout}`;
    if (/E404|404 Not Found|is not in this registry/u.test(details)) {
      return {
        registryVersion: "",
        status: "missing"
      };
    }

    return {
      details: 'registry lookup failed',
      registryVersion: "",
      status: "error"
    };
  }
}

function printRows(rows, registry) {
  const nameWidth = Math.max(...rows.map((row) => row.name.length), "package".length);
  const versionWidth = Math.max(...rows.map((row) => row.version.length), "version".length);
  console.log(`DotNetDoc npm registry status: ${registry}`);
  console.log(`${"package".padEnd(nameWidth)}  ${"version".padEnd(versionWidth)}  status`);
  console.log(`${"-".repeat(nameWidth)}  ${"-".repeat(versionWidth)}  ------`);
  for (const row of rows) {
    const suffix = row.details ? ` (${row.details})` : "";
    console.log(`${row.name.padEnd(nameWidth)}  ${row.version.padEnd(versionWidth)}  ${row.status}${suffix}`);
  }
}

/** 只读状态检查；预发布须先有就绪清单并全部目标尚未发布，不执行发布。 @lang en Read-only status checking; prepublication requires a ready inventory and all targets still unpublished, without performing publication. */
function main() {
  const options = parseArgs(process.argv.slice(2));
  // <lang><zh-CN>源码候选尚未就绪时先拒绝，连只读npm查询都不执行；真正发布还需另行批准。</zh-CN><en>Refuse unready source candidates before even read-only npm queries; actual publication requires separate authorization.</en></lang>
  const plan = JSON.parse(fs.readFileSync(path.join(__dirname, '../release-plan.json'), 'utf8'));
  const packages = loadReleasePackages();
  validateReleasePlan(plan, packages);
  if (options.prepublish && plan.status !== 'publication-ready') {
    console.error('Prepublish check failed: source candidates are not publication-ready.');
    process.exitCode = 1;
    return;
  }
  const rows = packages.map((item) => ({
    ...item,
    ...readRegistryVersion(item.name, item.version, options.registry)
  }));

  printRows(rows, options.registry);

  const errors = rows.filter((row) => row.status === "error" || row.status === "version-mismatch");
  if (errors.length > 0) {
    console.error("Registry status check failed; resolve registry access or package version drift first.");
    process.exitCode = 1;
    return;
  }

  if (options.prepublish) {
    const alreadyPublished = rows.filter((row) => row.status === "published");
    if (alreadyPublished.length > 0) {
      console.error("Prepublish check failed; at least one package version already exists on npm.");
      process.exitCode = 1;
      return;
    }
    console.log("Prepublish check passed: all DotNetDoc release package versions are missing on npm.");
  }
}

try { main(); } catch {
  // <lang><zh-CN>参数/清单错误也不回显原值或主机堆栈。</zh-CN><en>Argument/inventory errors also avoid echoing raw values or host stacks.</en></lang>
  console.error('DotNetDoc registry verification rejected.');
  process.exitCode = 1;
}
