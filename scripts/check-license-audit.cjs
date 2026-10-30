/** @file 检查已审npm锁来源/实装许可与固定Roslyn版本，不联网或运行第三方代码。 @lang en Checks reviewed npm lock provenance/installed licenses and the pinned Roslyn version without network access or third-party execution. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const forbiddenLicensePattern = /\b(AGPL|GPL|LGPL|SSPL|BUSL|BSL)\b/i;

/** 校验整个运行依赖闭包及包级许可证，不以顶层MIT代替传递包复核。 @lang en Checks the runtime dependency closure and package licenses instead of substituting a top-level MIT label for transitive review. */
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
  checkReviewedRuntimeDependencies(notices);
  assert.match(notices, /Microsoft\.CodeAnalysis\.CSharp`\s+\|\s+`5\.6\.0`\s+\|\s+MIT/, "Roslyn helper dependency must be recorded in third-party notices.");

  console.log("DotNetDoc dependency license audit passed.");
}

/**
 * 对照已审清单核所有npm运行条目，锁必须有精确官方URL/SRI与匹配的实装许可。
 * @lang en Checks every npm runtime entry against the review manifest, requiring exact official URLs/SRI and matching installed licenses.
 * @param {string} notices <lang><zh-CN>本仓第三方声明，不含运行凭据。</zh-CN><en>Repository third-party notices without runtime credentials.</en></lang>
 * @returns {void} <lang><zh-CN>仅验证，无写入。</zh-CN><en>Validation only, without writes.</en></lang>
 */
function checkReviewedRuntimeDependencies(notices) {
  // <lang><zh-CN>清单固定审过的版本和来源；实际闭包必须逐名匹配，不能漏查新增传递包。</zh-CN><en>The manifest fixes reviewed versions/sources; match the actual closure by name so newly added transitive packages cannot escape review.</en></lang>
  const review = readPackageJson('third-party-lock-allowlist.json');
  const lock = readPackageJson('package-lock.json');
  const actual = Object.entries(lock.packages).filter(([name, entry]) => name.startsWith('node_modules/') && entry.version).map(([name]) => name.slice('node_modules/'.length)).sort();
  assert.deepEqual(actual, review.packages.map((item) => item.name).sort(), 'Reviewed runtime dependency closure drift.');
  for (const item of review.packages) {
    // <lang><zh-CN>只从锁和安装清单读取元数据，不require第三方入口；公告必须覆盖该精确版本。</zh-CN><en>Read metadata only from the lock and installed manifest, never require third-party entry code; notices must cover the exact version.</en></lang>
    const locked = lock.packages[`node_modules/${item.name}`];
    const installed = readPackageJson(`node_modules/${item.name}/package.json`);
    assert.equal(locked.version, item.version);
    assert.equal(locked.resolved, item.resolved);
    assert.equal(locked.integrity, item.integrity);
    assert.match(locked.resolved, /^https:\/\/registry\.npmjs\.org\//u);
    assert.match(locked.integrity, /^sha512-/u);
    assert.equal(installed.version, item.version);
    assert.equal(installed.license, item.license);
    assert.ok(['MIT', 'BSD-3-Clause', 'BSD-2-Clause', 'ISC', 'Apache-2.0'].includes(item.license));
    assert.ok(notices.includes('`' + item.name + '`') && notices.includes('`' + item.version + '`'), 'Third-party notices missing reviewed entry.');
  }
}

/** 仅读取本仓已知JSON元数据文件，缺失即阻断门禁。 @lang en Reads known repository JSON metadata only and blocks the gate when it is absent. */
function readPackageJson(relativePath) {
  // <lang><zh-CN>相对路径由门禁固定闭集提供，不接受用户路径或远端资源。</zh-CN><en>Relative paths come from the gate's fixed set, never user paths or remote resources.</en></lang>
  const filePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(filePath), `Missing package metadata: ${relativePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

main();
