const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(root, "examples", "standalone", "dist", "dotnetdoc");

function main() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  const result = spawnSync(process.execPath, ["packages/dotnetdoc-runner/src/cli.mjs", "--config", "examples/standalone/dotnetdoc.config.json"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const manifest = readJson("dotnetdoc.producer-result.json");
  assert.equal(manifest.status, "success");
  assert.equal(manifest.artifacts.length, 2);
  assert.ok(fs.existsSync(path.join(outputRoot, "Portal.Components.dotnetdoc.json")));
  assert.ok(fs.existsSync(path.join(outputRoot, "Portal.Components.hia.json")));
  console.log("DotNetDoc standalone example check passed: 1 input, 2 artifacts.");
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(outputRoot, name), "utf8"));
}

main();
