const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const forbiddenLicensePattern = /\b(AGPL|GPL|LGPL|SSPL|BUSL|BSL)\b/i;

function main() {
  const parserPackage = readPackageJson("node_modules/fast-xml-parser/package.json");
  assert.equal(parserPackage.license, "MIT", "fast-xml-parser must stay MIT licensed.");

  for (const packageFile of [
    "packages/dotnetdoc-spec/package.json",
    "packages/dotnet-xml-doc-extractor/package.json",
    "packages/dotnet-source-extractor/package.json",
    "packages/dotnetdoc-adapter/package.json",
    "packages/dotnetdoc-runner/package.json",
    "packages/dotnetdoc-producer/package.json"
  ]) {
    const packageJson = readPackageJson(packageFile);
    assert.equal(forbiddenLicensePattern.test(packageJson.license ?? ""), false, `Forbidden license detected in ${packageFile}.`);
  }

  const roslynProject = fs.readFileSync(
    path.join(root, "packages/dotnet-source-extractor/tools/DotNetDoc.RoslynSourceExtractor/DotNetDoc.RoslynSourceExtractor.csproj"),
    "utf8"
  );
  assert.match(roslynProject, /PackageReference Include="Microsoft\.CodeAnalysis\.CSharp" Version="5\.6\.0"/, "Roslyn helper dependency must stay pinned to the reviewed package.");
  const notices = fs.readFileSync(path.join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
  assert.match(notices, /Microsoft\.CodeAnalysis\.CSharp`\s+\|\s+`5\.6\.0`\s+\|\s+MIT/, "Roslyn helper dependency must be recorded in third-party notices.");

  console.log("DotNetDoc dependency license audit passed.");
}

function readPackageJson(relativePath) {
  const filePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(filePath), `Missing package metadata: ${relativePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

main();
