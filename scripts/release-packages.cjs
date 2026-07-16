const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

// Release package inventory.
// 发布包清单：保持 Trusted Publisher、registry preflight 与 package resolver 使用同一顺序。
const releasePackageDirectories = [
  "packages/dotnetdoc-spec",
  "packages/dotnet-xml-doc-extractor",
  "packages/dotnet-source-extractor",
  "packages/dotnetdoc-adapter",
  "packages/dotnetdoc-runner",
  "packages/dotnetdoc-producer"
];

function loadReleasePackages() {
  return releasePackageDirectories.map((directory) => {
    const packageJsonPath = path.join(root, directory, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return {
      directory,
      name: packageJson.name,
      packageJson,
      version: packageJson.version
    };
  });
}

module.exports = {
  loadReleasePackages,
  releasePackageDirectories,
  root
};
