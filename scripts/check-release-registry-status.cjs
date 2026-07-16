const { execFileSync, execSync } = require("node:child_process");

const { loadReleasePackages } = require("./release-packages.cjs");

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

function firstMeaningfulLines(value) {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(" | ");
}

function readRegistryVersion(packageName, version, registry) {
  try {
    const output =
      process.platform === "win32"
        ? execSync(`npm view "${packageName}@${version}" version "--registry=${registry}"`, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"]
          }).trim()
        : execFileSync("npm", ["view", `${packageName}@${version}`, "version", `--registry=${registry}`], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"]
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
      details: firstMeaningfulLines(details || error.message),
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

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = loadReleasePackages().map((item) => ({
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

main();
