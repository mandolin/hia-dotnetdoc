/**
 * @file
 * @lang zh-CN 验证分离Node/npm布局及Windows原生cmd的受控启动选择。
 * @lang en Verify controlled launcher selection for separated Node/npm layouts and Windows native cmd entries.
 */
const assert = require("node:assert/strict");
const test = require("node:test");
const { resolveNpmInvocation } = require("../scripts/npm-invocation.cjs");

test("npm-provided JavaScript entry is preferred over Node-adjacent installation", () => {
  const result = resolveNpmInvocation(
    "/runtime/node",
    "/npm/bin/npm-cli.js",
    "win32",
    (file) => file === "/npm/bin/npm-cli.js",
  );
  assert.deepEqual(result, {
    command: "/runtime/node",
    args: ["/npm/bin/npm-cli.js", "pack", "--dry-run", "--json"],
  });
});
test("Node-adjacent npm JavaScript entry remains supported", () => {
  const result = resolveNpmInvocation(
    "/runtime/node",
    undefined,
    "linux",
    (file) =>
      file.replaceAll("\\", "/") === "/runtime/node_modules/npm/bin/npm-cli.js",
  );
  assert.equal(result.command, "/runtime/node");
  assert.match(
    result.args[0].replaceAll("\\", "/"),
    /node_modules\/npm\/bin\/npm-cli\.js$/u,
  );
});
test("Windows fallback routes fixed npm arguments through PowerShell 7", () => {
  const result = resolveNpmInvocation(
    "/runtime/node",
    undefined,
    "win32",
    () => false,
  );
  assert.equal(result.command, "C:/Program Files/PowerShell/7/pwsh.exe");
  assert.deepEqual(result.args, [
    "-NoLogo",
    "-NoProfile",
    "-Command",
    "& npm.cmd pack --dry-run --json; exit $LASTEXITCODE",
  ]);
});
test("Unix fallback retains the normal executable route", () => {
  assert.deepEqual(
    resolveNpmInvocation("/runtime/node", undefined, "linux", () => false),
    { command: "npm", args: ["pack", "--dry-run", "--json"] },
  );
});
