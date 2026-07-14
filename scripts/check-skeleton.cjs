const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const requiredPaths = [
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "LICENSE",
  ".mise.toml",
  "package.json",
  "pnpm-workspace.yaml",
  "ai/README.md",
  "dev/project-status.md",
  "dev/project-context.md",
  "dev/roadmap.md",
  "dev/task-template.md",
  "dev/test-checklist.md",
  "fixtures/xml-doc/Portal.Components.xml",
  "scripts/build-fixtures.cjs",
  "scripts/check-fixtures.cjs",
  "scripts/check-license-audit.cjs",
  "scripts/check-skeleton.cjs",
  "packages/dotnetdoc-spec/package.json",
  "packages/dotnetdoc-spec/src/index.mjs",
  "packages/dotnet-xml-doc-extractor/package.json",
  "packages/dotnet-xml-doc-extractor/src/index.mjs",
  "packages/dotnetdoc-adapter/package.json",
  "packages/dotnetdoc-adapter/src/index.mjs",
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

