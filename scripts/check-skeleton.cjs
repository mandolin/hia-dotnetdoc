const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const requiredPaths = [
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "LICENSE",
  ".mise.toml",
  ".github/workflows/ci.yml",
  ".github/workflows/npm-trusted-publish.yml",
  "package.json",
  "pnpm-workspace.yaml",
  "ai/README.md",
  "dev/project-status.md",
  "dev/project-context.md",
  "dev/roadmap.md",
  "dev/task-template.md",
  "dev/test-checklist.md",
  "fixtures/xml-doc/Portal.Components.xml",
  "fixtures/source/Portal.Components/Navigation/PortalMenu.cs",
  "examples/standalone/dotnetdoc.config.json",
  "examples/standalone/xml-doc/Portal.Components.xml",
  "scripts/build-fixtures.cjs",
  "scripts/check-fixtures.cjs",
  "scripts/check-license-audit.cjs",
  "scripts/check-package-pack.cjs",
  "scripts/check-release-registry-status.cjs",
  "scripts/check-skeleton.cjs",
  "scripts/check-standalone.cjs",
  "scripts/configure-trusted-publishers.cjs",
  "scripts/print-trusted-publish-commands.cjs",
  "scripts/release-packages.cjs",
  "scripts/resolve-release-package.cjs",
  "packages/dotnetdoc-spec/package.json",
  "packages/dotnetdoc-spec/README.md",
  "packages/dotnetdoc-spec/LICENSE",
  "packages/dotnetdoc-spec/src/index.mjs",
  "packages/dotnet-xml-doc-extractor/package.json",
  "packages/dotnet-xml-doc-extractor/README.md",
  "packages/dotnet-xml-doc-extractor/LICENSE",
  "packages/dotnet-xml-doc-extractor/src/index.mjs",
  "packages/dotnet-source-extractor/package.json",
  "packages/dotnet-source-extractor/README.md",
  "packages/dotnet-source-extractor/LICENSE",
  "packages/dotnet-source-extractor/src/index.mjs",
  "packages/dotnet-source-extractor/tools/DotNetDoc.RoslynSourceExtractor/DotNetDoc.RoslynSourceExtractor.csproj",
  "packages/dotnet-source-extractor/tools/DotNetDoc.RoslynSourceExtractor/Program.cs",
  "packages/dotnetdoc-adapter/package.json",
  "packages/dotnetdoc-adapter/README.md",
  "packages/dotnetdoc-adapter/LICENSE",
  "packages/dotnetdoc-adapter/src/index.mjs",
  "packages/dotnetdoc-runner/package.json",
  "packages/dotnetdoc-runner/README.md",
  "packages/dotnetdoc-runner/LICENSE",
  "packages/dotnetdoc-runner/src/index.mjs",
  "packages/dotnetdoc-runner/src/cli.mjs",
  "packages/dotnetdoc-runner/src/schema.mjs",
  "packages/dotnetdoc-producer/package.json",
  "packages/dotnetdoc-producer/README.md",
  "packages/dotnetdoc-producer/LICENSE",
  "packages/dotnetdoc-producer/src/index.mjs",
  "test/dotnetdoc-xml-fixture.test.mjs"
];

function main() {
  for (const relativePath of requiredPaths) {
    assert.ok(fs.existsSync(path.join(root, relativePath)), `Missing required skeleton path: ${relativePath}`);
  }

  const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(rootPackage.private, true, "Root workspace package must stay private.");
  console.log("DotNetDoc skeleton check passed.");
}

main();
