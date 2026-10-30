const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
/**
 * @lang zh-CN 本轮六包必须共享的精确本地发布候选版本。
 * @lang en Exact local release-candidate version shared by all six packages in this train.
 */
const releaseVersion = "1.0.0";
/**
 * @lang zh-CN 必须从可发布文件中清除的上一条 exact internal dependency line。
 * @lang en Previous exact internal dependency line that must be absent from release-bearing files.
 */
const previousReleaseVersion = "0.1.12";
const repositoryUrl = "git+https://github.com/mandolin/hia-dotnetdoc.git";
const npmCliPath = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");

const packages = [
  {
    name: "@hia-doc/dotnetdoc-spec",
    directory: "packages/dotnetdoc-spec",
    requiredFiles: ["package.json", "README.md", "LICENSE", "src/index.mjs", "src/artifact-contracts.mjs", "src/json-value.mjs", ...["0.1.0-draft", "1.0.0"].flatMap(version => ["dotnetdoc-xml-doc-extraction", "dotnetdoc-csharp-source-extraction", "dotnetdoc-source-relation", "dotnetdoc-aspnet-endpoint-extraction", "dotnetdoc-markup-comment-extraction", "dotnetdoc-project-discovery", "dotnetdoc-build-warning-classification"].map(contract => `src/schemas/${contract}-${version}.schema.json`))]
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
      // <lang><zh-CN>SDK策略是安装后helper运行的必要文件，必须进入真实归档闭包。</zh-CN><en>The SDK policy is required for the installed helper and must be part of the actual archive closure.</en></lang>
      "global.json",
      "tools/DotNetDoc.RoslynSourceExtractor/DotNetDoc.RoslynSourceExtractor.csproj",
      "tools/DotNetDoc.RoslynSourceExtractor/Program.cs"
    ],
    forbiddenFileFragments: ["/bin/", "/obj/"]
  },
  {
    name: "@hia-doc/dotnetdoc-adapter",
    directory: "packages/dotnetdoc-adapter",
    internalDependencies: ["@hia-doc/dotnetdoc-spec"],
    requiredFiles: ["package.json", "README.md", "LICENSE", "src/index.mjs", "src/signature.mjs"]
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
    requiredFiles: ["package.json", "README.md", "LICENSE", "src/cli.mjs", "src/index.mjs", "src/schema.mjs", "src/schema-legacy.mjs", "src/config-compatibility.mjs", "src/doc-source-map.mjs", "src/schemas/dotnetdoc-config-0.1.0-draft.schema.json", "src/schemas/dotnetdoc-config-1.0.0.schema.json"]
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
    // <lang><zh-CN>类型与公开责任须在实际归档中，仓库内存在文件不足以通过分发检查。</zh-CN><en>Declarations and public responsibility must exist in actual archives; repository presence alone cannot pass distribution checks.</en></lang>
    for (const file of ["src/index.d.mts", "API.md", "MIGRATION.md"]) assert.ok(packedFiles.includes(file), `${packageInfo.name} requires ${file}.`);
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
    assert.equal(content.includes(`"${previousReleaseVersion}"`), false, `${relativePath} must not retain previous release version "${previousReleaseVersion}".`);
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
