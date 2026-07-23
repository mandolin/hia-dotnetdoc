const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const releaseVersion = "0.1.3";
const repositoryUrl = "git+https://github.com/mandolin/hia-dotnetdoc.git";
const npmCliPath = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");

const packages = [
  {
    name: "@hia-doc/dotnetdoc-spec",
    directory: "packages/dotnetdoc-spec",
    requiredFiles: ["package.json", "README.md", "LICENSE", "src/index.mjs"]
  },
  {
    name: "@hia-doc/dotnet-xml-doc-extractor",
    directory: "packages/dotnet-xml-doc-extractor",
    internalDependencies: ["@hia-doc/dotnetdoc-spec"],
    requiredFiles: ["package.json", "README.md", "LICENSE", "src/index.mjs"]
  },
  {
    name: "@hia-doc/dotnet-source-extractor",
    directory: "packages/dotnet-source-extractor",
    internalDependencies: ["@hia-doc/dotnetdoc-spec"],
    requiredFiles: [
      "package.json",
      "README.md",
      "LICENSE",
      "src/index.mjs",
      "tools/DotNetDoc.RoslynSourceExtractor/DotNetDoc.RoslynSourceExtractor.csproj",
      "tools/DotNetDoc.RoslynSourceExtractor/Program.cs"
    ],
    forbiddenFileFragments: ["/bin/", "/obj/"]
  },
  {
    name: "@hia-doc/dotnetdoc-adapter",
    directory: "packages/dotnetdoc-adapter",
    internalDependencies: ["@hia-doc/dotnetdoc-spec"],
    requiredFiles: ["package.json", "README.md", "LICENSE", "src/index.mjs"]
  },
  {
    name: "@hia-doc/dotnetdoc-runner",
    directory: "packages/dotnetdoc-runner",
    internalDependencies: [
      "@hia-doc/dotnet-source-extractor",
      "@hia-doc/dotnet-xml-doc-extractor",
      "@hia-doc/dotnetdoc-adapter",
      "@hia-doc/dotnetdoc-spec"
    ],
    requiredFiles: ["package.json", "README.md", "LICENSE", "src/cli.mjs", "src/index.mjs", "src/schema.mjs"]
  },
  {
    name: "@hia-doc/dotnetdoc-producer",
    directory: "packages/dotnetdoc-producer",
    internalDependencies: ["@hia-doc/dotnetdoc-runner"],
    requiredFiles: ["package.json", "README.md", "LICENSE", "src/index.mjs"]
  }
];

const releaseVersionFiles = [
  "package.json",
  "package-lock.json",
  "packages/dotnetdoc-spec/package.json",
  "packages/dotnet-xml-doc-extractor/package.json",
  "packages/dotnet-xml-doc-extractor/src/index.mjs",
  "packages/dotnet-source-extractor/package.json",
  "packages/dotnet-source-extractor/tools/DotNetDoc.RoslynSourceExtractor/Program.cs",
  "packages/dotnetdoc-adapter/package.json",
  "packages/dotnetdoc-runner/package.json",
  "packages/dotnetdoc-runner/src/index.mjs",
  "packages/dotnetdoc-producer/package.json"
];

function main() {
  assertNoLegacyReleaseVersions();

  for (const packageInfo of packages) {
    const packageRoot = path.join(root, packageInfo.directory);
    const packageJson = readPackageJson(packageInfo.directory);
    assert.equal(packageJson.name, packageInfo.name, `${packageInfo.directory} package name drifted.`);
    assert.equal(packageJson.version, releaseVersion, `${packageInfo.name} must be release candidate ${releaseVersion}.`);
    assert.equal(packageJson.private, undefined, `${packageInfo.name} must not be private.`);
    assert.equal(packageJson.license, "MIT", `${packageInfo.name} must stay MIT licensed.`);
    assert.equal(packageJson.publishConfig?.access, "public", `${packageInfo.name} must publish as a public scoped package.`);
    assert.equal(packageJson.repository?.type, "git", `${packageInfo.name} must declare a git repository.`);
    assert.equal(packageJson.repository?.url, repositoryUrl, `${packageInfo.name} repository URL drifted.`);
    assert.equal(packageJson.repository?.directory, packageInfo.directory, `${packageInfo.name} repository directory drifted.`);
    assert.ok(packageJson.bugs?.url, `${packageInfo.name} must declare a bugs URL.`);
    assert.ok(packageJson.homepage?.includes(packageInfo.directory), `${packageInfo.name} homepage must point at the package README.`);

    for (const dependencyName of packageInfo.internalDependencies ?? []) {
      assert.equal(packageJson.dependencies?.[dependencyName], releaseVersion, `${packageInfo.name} dependency ${dependencyName} must be pinned to ${releaseVersion}.`);
    }

    const packedFiles = dryRunPack(packageRoot, packageInfo.name);
    for (const requiredFile of packageInfo.requiredFiles) {
      assert.ok(packedFiles.includes(requiredFile), `${packageInfo.name} pack output is missing ${requiredFile}.`);
    }

    for (const fragment of ["node_modules/", "fixtures/", "examples/", "temp/", "dist/", ...(packageInfo.forbiddenFileFragments ?? [])]) {
      assert.equal(
        packedFiles.some((filePath) => filePath.includes(fragment)),
        false,
        `${packageInfo.name} pack output must not include ${fragment}`
      );
    }
  }

  const tarballs = fs.readdirSync(root).filter((entry) => entry.endsWith(".tgz"));
  assert.deepEqual(tarballs, [], "Pack dry-run must not leave tarballs in the workspace root.");
  console.log(`DotNetDoc package pack check passed: ${packages.length} package(s) at ${releaseVersion}.`);
}

function assertNoLegacyReleaseVersions() {
  for (const relativePath of releaseVersionFiles) {
    const content = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert.equal(content.includes('"0.0.0"'), false, `${relativePath} must not contain legacy release version "0.0.0".`);
  }
}

function readPackageJson(relativeDirectory) {
  return JSON.parse(fs.readFileSync(path.join(root, relativeDirectory, "package.json"), "utf8"));
}

function dryRunPack(packageRoot, packageName) {
  const command = fs.existsSync(npmCliPath) ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const args = fs.existsSync(npmCliPath)
    ? [npmCliPath, "pack", "--dry-run", "--json"]
    : ["pack", "--dry-run", "--json"];

  const result = spawnSync(command, args, {
    cwd: packageRoot,
    encoding: "utf8",
    shell: false
  });

  assert.equal(result.status, 0, `${packageName} npm pack --dry-run failed:\n${result.error?.message ?? ""}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  const output = JSON.parse(result.stdout);
  assert.equal(Array.isArray(output), true, `${packageName} npm pack --dry-run did not return a JSON array.`);
  assert.equal(output.length, 1, `${packageName} npm pack --dry-run returned an unexpected package count.`);

  return output[0].files.map((file) => file.path.replaceAll("\\", "/")).sort();
}

main();
