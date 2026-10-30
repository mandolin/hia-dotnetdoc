/** @file 仅校验六包候选清单与就绪状态，无网络、发布或文件写入。 @lang en Validates only the six-package candidate inventory/readiness without networking, publishing or file writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadReleasePackages } = require('./release-packages.cjs');

/**
 * 中文：校验清单和六包精确来源对应；可选要求已另行确认publication-ready，不把候选当发行授权。
 * @lang en Validates exact inventory correspondence with six package sources; optionally requires separately confirmed publication-ready status, never treating a candidate as publication authority.
 * @param {object} plan <lang><zh-CN>本地发行清单。</zh-CN><en>Local release inventory.</en></lang>
 * @param {Array<object>} packages <lang><zh-CN>真实包清单读取结果。</zh-CN><en>Actual package-manifest readings.</en></lang>
 * @param {boolean} [publicationReady=false] <lang><zh-CN>是否要求正式就绪，默认只验本地候选。</zh-CN><en>Whether formal readiness is required; defaults to validating local candidates only.</en></lang>
 * @returns {void} <lang><zh-CN>只校验；不发布。</zh-CN><en>Validation only, without publishing.</en></lang>
 * @throws {Error} <lang><zh-CN>任意身份/闭包/状态错配拒绝。</zh-CN><en>Rejects identity, closure or status mismatches.</en></lang>
 */
function validateReleasePlan(plan, packages, publicationReady = false) {
  // <lang><zh-CN>清单不能增减、重复或错配包；候选计数不能替代实际完整身份。</zh-CN><en>The inventory may not add, omit, duplicate or mismatch packages; a candidate count cannot replace complete identities.</en></lang>
  assert.equal(plan.version, '1.0.0');
  assert.ok(['local-candidate', 'publication-ready'].includes(plan.status));
  assert.equal(plan.publishedToNpm, false);
  assert.equal(packages.length, 6);
  assert.deepEqual(plan.packages, packages.map(({ name, directory, version }) => ({ name, directory, version })));
  assert.ok(packages.every(({ version }) => version === plan.version));
  if (publicationReady) assert.equal(plan.status, 'publication-ready', 'source candidates are not publication-ready');
}

module.exports = { validateReleasePlan };
if (require.main === module) {
  try {
    // <lang><zh-CN>参数只允许一个显式就绪开关，未知值不进入shell或网络。</zh-CN><en>Allow only one explicit readiness flag; unknown values never enter a shell or network.</en></lang>
    const args = process.argv.slice(2);
    assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--publication-ready'));
    const plan = JSON.parse(fs.readFileSync(path.join(__dirname, '../release-plan.json'), 'utf8'));
    validateReleasePlan(plan, loadReleasePackages(), args.length === 1);
    console.log('DotNetDoc release inventory verified; this command does not publish.');
  } catch {
    console.error('DotNetDoc release inventory or publication readiness rejected.');
    process.exitCode = 1;
  }
}
