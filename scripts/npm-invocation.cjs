/**
 * @file
 * @lang zh-CN 为归档检查选择本机npm入口，兼容分离安装与PowerShell7的Windows回退。
 * @lang en Select a local npm entry for archive checks, supporting separated installations and a PowerShell 7 Windows fallback.
 */
const path = require("node:path");
const fs = require("node:fs");

/**
 * @lang zh-CN 只构造固定pack命令，不运行进程或插入用户路径到shell脚本。
 * @lang en Construct only the fixed pack command without running processes or inserting user paths into shell scripts.
 * @param {string} executable <lang><zh-CN>实际Node入口。</zh-CN><en>Actual Node executable.</en></lang>
 * @param {string|undefined} npmEntry <lang><zh-CN>npm提供的JS入口。</zh-CN><en>JavaScript entry supplied by npm.</en></lang>
 * @param {string} platform <lang><zh-CN>真实或合成平台名。</zh-CN><en>Actual or synthetic platform name.</en></lang>
 * @param {function(string):boolean} [exists=fs.existsSync] <lang><zh-CN>入口存在性查询。</zh-CN><en>Entry existence query.</en></lang>
 * @returns {{command:string,args:string[]}} <lang><zh-CN>显式程序与固定参数。</zh-CN><en>Explicit executable and fixed arguments.</en></lang>
 */
function resolveNpmInvocation(
  executable,
  npmEntry,
  platform,
  exists = fs.existsSync,
) {
  // <lang><zh-CN>先采用npm实际传入路径，再兼容Windows和Unix发行布局。</zh-CN><en>Prefer npm's actual supplied path, then support Windows and Unix distribution layouts.</en></lang>
  const entry = [
    npmEntry,
    path.join(path.dirname(executable), "node_modules/npm/bin/npm-cli.js"),
    path.resolve(
      path.dirname(executable),
      "../lib/node_modules/npm/bin/npm-cli.js",
    ),
  ].find((file) => file && exists(file));
  if (entry)
    return {
      command: executable,
      args: [entry, "pack", "--dry-run", "--json"],
    };
  if (platform === "win32")
    return {
      command: "C:/Program Files/PowerShell/7/pwsh.exe",
      args: [
        "-NoLogo",
        "-NoProfile",
        "-Command",
        "& npm.cmd pack --dry-run --json; exit $LASTEXITCODE",
      ],
    };
  return { command: "npm", args: ["pack", "--dry-run", "--json"] };
}

module.exports = { resolveNpmInvocation };
