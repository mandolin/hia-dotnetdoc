const { loadReleasePackages } = require("./release-packages.cjs");

const confirmPublish = "publish @hia-doc dotnetdoc package";
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
  console.log(`- Confirm phrase: ${confirmPublish}`);
  console.log("");
  console.log("Run these commands in order after release:registry:preflight passes:");
  console.log("");

  for (const item of packages) {
    console.log(
      `gh workflow run ${workflow} --repo ${repository} --ref ${ref} --raw-field package_name="${item.name}" --raw-field confirm_publish="${confirmPublish}"`
    );
  }

  console.log("");
  console.log("Verify each package after its workflow run succeeds:");
  for (const item of packages) {
    console.log(`npm view "${item.name}@${item.version}" version --registry=https://registry.npmjs.org/`);
  }
}

main();
