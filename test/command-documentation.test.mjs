/**
 * @file
 * @lang zh-CN DotNetDoc命令描述、实际解析声明及已确认帮助的采用回归。
 * @lang en Adoption regressions for DotNetDoc command descriptions, actual parser declarations and confirmed help.
 */
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  mkdtemp,
  writeFile,
  mkdir,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import os from "node:os";
import {
  columns,
  formatDotnetDocHelp,
} from "../scripts/format-command-help.mjs";
import { createDotnetDocCommands } from "../packages/dotnetdoc-runner/src/command-content.mjs";
import {
  observeDotnetDocOptions,
  checkCommandDocumentation,
  buildCommandDocumentation,
} from "../scripts/command-documentation.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = path.join(root, "packages/dotnetdoc-runner/src/cli.mjs");

/**
 * @lang zh-CN 在独占目录准备合成XML，执行正常CLI后只清理已核临时边界。
 * @lang en Prepare synthetic XML in an owned directory, then clean only the verified temporary boundary after normal CLI execution.
 * @param {function(string):Promise<void>} action <lang><zh-CN>拥有目录的验收回调。</zh-CN><en>Acceptance callback owning the directory.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>验收及清理完成。</zh-CN><en>Acceptance and cleanup complete.</en></lang>
 */
async function withWorkspace(action) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "dotnetdoc-command-"));
  try {
    await writeFile(
      path.join(directory, "sample.xml"),
      '<doc><assembly><name>Command.Sample</name></assembly><members><member name="T:Sample.Widget"><summary>示例类型 / Sample type.</summary></member></members></doc>',
    );
    await action(directory);
  } finally {
    // <lang><zh-CN>创建的唯一直属临时目录是清理边界，原业务项目不进入测试。</zh-CN><en>The uniquely created direct temporary child is the cleanup boundary, with original business projects excluded from tests.</en></lang>
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("dotnetdoc-command-"));
    await rm(directory, { recursive: true, force: true });
  }
}

/**
 * @lang zh-CN 调用安装后的真实bin，Windows经PowerShell7执行npm生成的cmd入口。
 * @lang en Invoke a real installed bin, using PowerShell 7 for npm-generated cmd entries on Windows.
 * @param {string} name <lang><zh-CN>原包清单中的固定调用名。</zh-CN><en>Fixed invocation name from the original manifest.</en></lang>
 * @param {string[]} args <lang><zh-CN>本测试固定参数。</zh-CN><en>Fixed test arguments.</en></lang>
 * @returns {object} <lang><zh-CN>真实退出码及两流。</zh-CN><en>Actual exit status and both streams.</en></lang>
 */
function runInstalledBin(name, args) {
  // <lang><zh-CN>明确把当前实际Node置于PATH首位，避免bin选到另一个已安装运行时。</zh-CN><en>Put the current actual Node first on PATH so the bin cannot choose another installed runtime.</en></lang>
  const environment = { ...process.env };
  const pathKey =
    Object.keys(environment).find((key) => key.toLowerCase() === "path") ??
    "PATH";
  environment[pathKey] =
    path.dirname(process.execPath) + path.delimiter + environment[pathKey];
  const file = path.join(
    root,
    "node_modules/.bin",
    name + (process.platform === "win32" ? ".cmd" : ""),
  );
  if (process.platform === "win32") {
    const command =
      "& " +
      [file, ...args]
        .map((value) => "'" + value.replaceAll("'", "''") + "'")
        .join(" ") +
      "; exit $LASTEXITCODE";
    return spawnSync(
      "C:/Program Files/PowerShell/7/pwsh.exe",
      ["-NoLogo", "-NoProfile", "-Command", command],
      { cwd: root, env: environment, encoding: "utf8", timeout: 30000 },
    );
  }
  return spawnSync(file, args, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    timeout: 30000,
  });
}

test("a refused core projection preserves the existing generated group", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "dotnetdoc-command-"));
  const receiptPath = path.join(
    root,
    "packages/dotnetdoc-runner/src/command-documentation/generation.json",
  );
  const before = await readFile(receiptPath);
  try {
    const module = path.join(directory, "refused-core.mjs");
    await writeFile(
      module,
      'export async function produceCommandDocumentation() { return {status:"refused",diagnostics:[]}; }\n',
    );
    await assert.rejects(buildCommandDocumentation(module));
    assert.deepEqual(await readFile(receiptPath), before);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("dotnetdoc-command-"));
    await rm(directory, { recursive: true, force: true });
  }
});

test("the descriptor covers six actual switches and conditional positional inputs", () => {
  const [command, alias] = createDotnetDocCommands();
  assert.equal(alias.aliasOf, command.id);
  assert.equal(alias.executable, "dotnetdoc");
  const actual = observeDotnetDocOptions();
  assert.equal(command.options.length, 6);
  assert.equal(command.positionals[0].name, "positionals");
  assert.equal(command.positionals[0].multiple, true);
  assert.deepEqual(
    command.options.map((item) => item.name).sort(),
    actual.options.map((item) => item.name).sort(),
  );
  assert.equal(actual.strict, true);
  assert.equal(actual.allowPositionals, true);
});

test("the checked generated artifacts bind current sources and original parser declarations", async () => {
  const receipt = await checkCommandDocumentation();
  assert.equal(receipt.commands, 2);
  assert.equal(receipt.symbols, 16);
});

test("an option type conflict is rejected independently of the descriptor", async () => {
  const actual = observeDotnetDocOptions();
  actual.options.find((option) => option.name === "config").valueType =
    "boolean";
  await assert.rejects(checkCommandDocumentation({ observation: actual }));
});

for (const [args, code, expected] of [
  [["--help"], 0, "HIA-Documentation-Sys · hia-dotnetdoc"],
  [["-h"], 0, "配置与副作用 / Configuration and effects"],
  [
    ["--help", "--unknown-command-option"],
    1,
    "DotNetDoc failed: request or input could not be processed.",
  ],
  [
    ["--help", "--config"],
    1,
    "DotNetDoc failed: request or input could not be processed.",
  ],
  [
    ["--help", "--title", "Sample API"],
    0,
    "HIA-Documentation-Sys · hia-dotnetdoc",
  ],
  [
    ["--help", "--config", "missing.json"],
    0,
    "HIA-Documentation-Sys · hia-dotnetdoc",
  ],
  [["--version"], 0, "1.0.0"],
  [["--help", "--version"], 0, "HIA-Documentation-Sys · hia-dotnetdoc"],
  [
    ["--version", "--unknown-command-option"],
    1,
    "DotNetDoc failed: request or input could not be processed.",
  ],
  [[], 1, "DotNetDoc failed: request or input could not be processed."],
]) {
  test("normal CLI boundary " + JSON.stringify(args), () => {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, code);
    assert.ok((code ? result.stderr : result.stdout).includes(expected));
    assert.equal(code ? result.stdout : result.stderr, "");
    assert.equal(result.stdout.includes("\x1b"), false);
  });
}

test("direct XML keeps last output and title values", async () =>
  withWorkspace(async (directory) => {
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "--out-dir",
        "first",
        "--out-dir",
        "second",
        "--title",
        "First",
        "--title",
        "Selected",
        "sample.xml",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal((await readdir(directory)).includes("first"), false);
    const manifest = JSON.parse(
      await readFile(
        path.join(directory, "second/dotnetdoc.producer-result.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.status, "success");
    const artifact = manifest.artifacts.find(
      (item) => item.kind === "hia-document",
    );
    const document = JSON.parse(
      await readFile(path.join(directory, "second", artifact.path), "utf8"),
    );
    assert.equal(document.title, "Selected");
  }));

test("config uses only output override and ignores direct title, root and inputs", async () =>
  withWorkspace(async (directory) => {
    await writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({
        schemaVersion: "1.0.0",
        outputDirectory: "configured",
        inputs: [
          { kind: "dotnet-xml-doc", path: "sample.xml", title: "Configured" },
        ],
      }),
    );
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "--config",
        "config.json",
        "--out-dir",
        "overridden",
        "--workspace-root",
        "missing-root",
        "--title",
        "Ignored",
        "missing.xml",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal((await readdir(directory)).includes("configured"), false);
    const manifest = JSON.parse(
      await readFile(
        path.join(directory, "overridden/dotnetdoc.producer-result.json"),
        "utf8",
      ),
    );
    const artifact = manifest.artifacts.find(
      (item) => item.kind === "hia-document",
    );
    assert.equal(
      JSON.parse(
        await readFile(
          path.join(directory, "overridden", artifact.path),
          "utf8",
        ),
      ).title,
      "Configured",
    );
  }));

test("empty output retains config but selects the root in direct XML mode", async () =>
  withWorkspace(async (directory) => {
    await writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({
        schemaVersion: "1.0.0",
        outputDirectory: "configured",
        inputs: [{ kind: "dotnet-xml-doc", path: "sample.xml" }],
      }),
    );
    const configured = spawnSync(
      process.execPath,
      [cli, "--config", "config.json", "--out-dir", ""],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(configured.status, 0, configured.stderr);
    const direct = spawnSync(
      process.execPath,
      [cli, "--out-dir", "", "--title", "", "sample.xml"],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(direct.status, 0, direct.stderr);
    const manifest = JSON.parse(
      await readFile(
        path.join(directory, "dotnetdoc.producer-result.json"),
        "utf8",
      ),
    );
    const artifact = manifest.artifacts.find(
      (item) => item.kind === "hia-document",
    );
    assert.equal(
      JSON.parse(await readFile(path.join(directory, artifact.path), "utf8"))
        .title,
      "",
    );
    assert.ok((await readdir(directory)).includes("configured"));
  }));

test("partial XML builds keep successful artifacts and exit one", async () =>
  withWorkspace(async (directory) => {
    const result = spawnSync(
      process.execPath,
      [cli, "sample.xml", "missing.xml"],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /^DotNetDoc partial:/u);
    const manifest = JSON.parse(
      await readFile(
        path.join(directory, "dist/dotnetdoc/dotnetdoc.producer-result.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.status, "partial");
    assert.ok(manifest.artifacts.some((item) => item.kind === "hia-document"));
  }));

test("leading separator preserves the normal missing XML result", async () =>
  withWorkspace(async (directory) => {
    const result = spawnSync(process.execPath, [cli, "--", "--help"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /^DotNetDoc failed:/u);
  }));

for (const name of ["hia-dotnetdoc", "dotnetdoc"]) {
  for (const [args, status] of [
    [["--help"], 0],
    [["--version"], 0],
    [["--help", "--unknown-command-option"], 1],
  ]) {
    test("normal installed bin " + name + " " + JSON.stringify(args), () => {
      const result = runInstalledBin(name, args);
      assert.equal(result.status, status, result.stderr);
      if (status === 1)
        assert.equal(
          result.stderr,
          "DotNetDoc failed: request or input could not be processed.\n",
        );
      else if (args[0] === "--version") assert.equal(result.stdout, "1.0.0\n");
      else
        assert.equal(
          result.stdout,
          formatDotnetDocHelp(createDotnetDocCommands()[0], 80),
        );
    });
  }
}

for (const width of [80, 120]) {
  test("shared help respects display columns " + width, () => {
    const help = formatDotnetDocHelp(createDotnetDocCommands()[0], width);
    for (const line of help.split("\n"))
      assert.ok(columns(line) <= width, line);
  });
}

test("a changed parser byte digest is rejected", async () => {
  const actual = observeDotnetDocOptions();
  actual.cliSha256 = "0".repeat(64);
  await assert.rejects(checkCommandDocumentation({ observation: actual }));
});

test("the actual projection retains both invocations and the alias relation", async () => {
  const file = path.join(
    root,
    "packages/dotnetdoc-runner/src/command-documentation/document.hia.json",
  );
  const document = JSON.parse(await readFile(file, "utf8"));
  const canonical = document.symbols.find(
    (symbol) =>
      symbol.metadata.commandDocumentation.nativeId === "hia-dotnetdoc",
  );
  const alias = document.symbols.find(
    (symbol) => symbol.metadata.commandDocumentation.nativeId === "dotnetdoc",
  );
  assert.equal(alias.metadata.commandDocumentation.aliasOf, canonical.id);
  assert.equal(document.symbols.length, 16);
});
