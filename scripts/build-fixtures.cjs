const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const sourcePath = "fixtures/xml-doc/Portal.Components.xml";
const outputRoot = path.join(root, "fixtures", "out");

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const runner = await import(pathToFileURL(path.join(root, "packages", "dotnetdoc-runner", "src", "index.mjs")));

  fs.rmSync(outputRoot, { recursive: true, force: true });
  await runner.runDotnetDoc({
    workspaceRoot: root,
    outputDirectory: outputRoot,
    inputs: [
      {
        kind: "dotnet-xml-doc",
        path: sourcePath,
        artifactBasePath: "Portal.Components",
        hiaDocumentId: "dotnetdoc:Portal.Components",
        title: "Portal.Components API"
      }
    ],
    options: {
      writeResultManifest: true
    }
  });
  console.log("DotNetDoc XML documentation fixture artifacts generated.");
}
