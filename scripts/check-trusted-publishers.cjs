const { execFileSync, execSync } = require("node:child_process");

const { loadReleasePackages } = require("./release-packages.cjs");

const npmVersion = "11.18.0";
const registry = "https://registry.npmjs.org/";
const expectedRepository = "mandolin/hia-dotnetdoc";
const expectedWorkflowFile = "npm-trusted-publish.yml";

function runNpmTrustList(packageName) {
  const args = [`npm@${npmVersion}`, "trust", "list", packageName, `--registry=${registry}`];
  if (process.platform === "win32") {
    const quotedArgs = args.map((arg) => `"${arg.replaceAll('"', '\\"')}"`).join(" ");
    return execSync(`npx ${quotedArgs}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }

  return execFileSync("npx", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function assertTrustedPublisher(packageName, output) {
  const checks = [
    ["type: github", "GitHub Trusted Publisher type"],
    [`file: ${expectedWorkflowFile}`, "workflow filename"],
    [`repository: ${expectedRepository}`, "repository"],
    ["permissions: publish", "publish permission"]
  ];

  for (const [needle, label] of checks) {
    if (!output.includes(needle)) {
      throw new Error(`${packageName} is missing expected ${label}: ${needle}`);
    }
  }
}

function main() {
  for (const item of loadReleasePackages()) {
    const output = runNpmTrustList(item.name);
    assertTrustedPublisher(item.name, output);
    console.log(`${item.name}: trusted publisher configured.`);
  }
}

main();
