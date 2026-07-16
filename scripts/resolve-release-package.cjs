const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const releaseVersion = "0.1.0";
const packageName = process.argv[2];
const writeGithubOutput = process.argv.includes("--github-output");

const packages = [
  "packages/dotnetdoc-spec",
  "packages/dotnet-xml-doc-extractor",
  "packages/dotnet-source-extractor",
  "packages/dotnetdoc-adapter",
  "packages/dotnetdoc-runner",
  "packages/dotnetdoc-producer"
].map((directory) => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, directory, "package.json"), "utf8"));
  return {
    directory,
    name: packageJson.name,
    packageJson,
    version: packageJson.version
  };
});

function main() {
  assert.ok(packageName, "Usage: node scripts/resolve-release-package.cjs <package-name> [--github-output]");
  const candidate = packages.find((item) => item.name === packageName);
  assert.ok(candidate, `Unknown DotNetDoc release package: ${packageName}`);
  assert.equal(candidate.version, releaseVersion, `${candidate.name} must be at release version ${releaseVersion}.`);
  assert.equal(candidate.packageJson.private, undefined, `${candidate.name} must not be private.`);
  assert.equal(candidate.packageJson.publishConfig?.access, "public", `${candidate.name} must publish as a public scoped package.`);

  const output = {
    package_dir: candidate.directory,
    package_name: candidate.name,
    package_version: candidate.version
  };

  if (writeGithubOutput) {
    const githubOutput = process.env.GITHUB_OUTPUT;
    assert.ok(githubOutput, "--github-output requires GITHUB_OUTPUT.");
    fs.appendFileSync(
      githubOutput,
      Object.entries(output).map(([key, value]) => `${key}=${value}`).join("\n") + "\n",
      "utf8"
    );
  } else {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  }
}

main();
