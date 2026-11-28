const { loadReleasePackages } = require("./release-packages.cjs");

const workflow = "npm-trusted-publish.yml";
const repository = "mandolin/hia-dotnetdoc";
const ref = "main";

function main() {
  const packages = loadReleasePackages();

  console.log("DotNetDoc Trusted Publisher command plan");
  console.log("");
  console.log("Prerequisites:");
  console.log("- Each package must be configured in npm Trusted Publishers for GitHub Actions.");
  console.log(`- GitHub workflow: ${repository}/.github/workflows/${workflow}`);
  console.log("");
  // <lang><zh-CN>实际发行由全局冻结波次协调，仓内命令清单只提供只读预检。</zh-CN><en>The system release coordinates the frozen waves; this repository prints read-only audit commands.</en></lang>
  console.log("Audit the coordinated stable archives:");
  console.log("");

  for (const item of packages) {
    console.log(
      `gh workflow run ${workflow} --repo ${repository} --ref ${ref} --raw-field operation=stable-audit --raw-field package_name="${item.name}"`
    );
  }

  console.log("");
  console.log("Stable publication requires separate system wave approval.");
}

main();
