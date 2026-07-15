const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(root, "fixtures", "out");

function main() {
  const dotnetdoc = readJson("Portal.Components.dotnetdoc.json");
  const hia = readJson("Portal.Components.hia.json");
  const result = readJson("dotnetdoc.producer-result.json");

  assert.equal(dotnetdoc.contract, "dotnetdoc-xml-doc-extraction");
  assert.equal(dotnetdoc.contractVersion, "0.1.0-draft");
  assert.equal(dotnetdoc.assembly.name, "Portal.Components");
  assert.equal(dotnetdoc.members.length, 3);
  assert.ok(dotnetdoc.members.some((member) => member.kind === "dotnet-type" && member.name === "PortalMenu"));
  assert.ok(dotnetdoc.members.some((member) => member.kind === "dotnet-method" && member.parameters[0]?.name === "tenantId"));

  assert.equal(hia.schemaVersion, "0.2.0");
  assert.equal(hia.title, "Portal.Components API");
  assert.ok(hia.symbols.some((symbol) => symbol.kind === "dotnet-type" && symbol.name === "PortalMenu"));
  assert.ok(hia.symbols.some((symbol) => symbol.metadata.dotnetdoc.returns === "HTML fragment for the tenant menu."));
  assert.equal(result.contract, "documentation-producer-result");
  assert.equal(result.status, "success");
  assert.equal(result.artifacts.length, 2);
  assert.ok(result.artifacts.some((artifact) => artifact.kind === "dotnetdoc-extraction"));
  assert.ok(result.artifacts.some((artifact) => artifact.kind === "hia-document"));

  expectNoUnsafePaths(dotnetdoc, hia, result);
  expectNoSourcesContent(outputRoot);
  console.log("DotNetDoc fixture check passed.");
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(outputRoot, name), "utf8"));
}

function expectNoUnsafePaths(...values) {
  const paths = [];
  for (const value of values) {
    collectPathValues(value, paths);
  }
  for (const value of paths) {
    assert.equal(path.isAbsolute(value), false, `Path must not be absolute: ${value}`);
    assert.equal(value.startsWith("\\\\"), false, `Path must not be UNC: ${value}`);
    assert.equal(value.split(/[\\/]/).includes(".."), false, `Path must not escape workspace: ${value}`);
  }
}

function collectPathValues(value, result) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPathValues(item, result);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if ((key === "path" || key.endsWith("Path") || key === "relativePath") && typeof item === "string") {
      result.push(item);
    } else {
      collectPathValues(item, result);
    }
  }
}

function expectNoSourcesContent(directory) {
  for (const filePath of fs.readdirSync(directory).map((name) => path.join(directory, name))) {
    const content = fs.readFileSync(filePath, "utf8");
    assert.equal(/"sourcesContent"\s*:/.test(content), false, `sourcesContent must not be emitted: ${path.relative(root, filePath)}`);
  }
}

main();
