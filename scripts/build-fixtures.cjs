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
  const extractor = await import(pathToFileURL(path.join(root, "packages", "dotnet-xml-doc-extractor", "src", "index.mjs")));
  const adapter = await import(pathToFileURL(path.join(root, "packages", "dotnetdoc-adapter", "src", "index.mjs")));

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  const xmlText = fs.readFileSync(path.join(root, sourcePath), "utf8");
  const artifact = extractor.extractDotnetXmlDocs(xmlText, { path: sourcePath });
  const hiaDocument = adapter.dotnetXmlDocsToHiaDocument(artifact, {
    id: "dotnetdoc:Portal.Components",
    title: "Portal.Components API"
  });

  writeJson("Portal.Components.dotnetdoc.json", artifact);
  writeJson("Portal.Components.hia.json", hiaDocument);
  console.log("DotNetDoc XML documentation fixture artifacts generated.");
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(outputRoot, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

