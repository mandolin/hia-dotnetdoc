import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractDotnetXmlDocs, createDotnetMemberId } from "../packages/dotnet-xml-doc-extractor/src/index.mjs";
import { dotnetXmlDocsToHiaDocument } from "../packages/dotnetdoc-adapter/src/index.mjs";
import { runDotnetDoc } from "../packages/dotnetdoc-runner/src/index.mjs";
import { dotnetdocProducer } from "../packages/dotnetdoc-producer/src/index.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = "fixtures/xml-doc/Portal.Components.xml";

describe("DotNetDoc XML documentation intake", () => {
  it("extracts compiler XML documentation members", async () => {
    const xmlText = await fs.readFile(path.join(repositoryRoot, fixturePath), "utf8");
    const artifact = extractDotnetXmlDocs(xmlText, { path: fixturePath });

    assert.equal(artifact.contract, "dotnetdoc-xml-doc-extraction");
    assert.equal(artifact.assembly.name, "Portal.Components");
    assert.equal(artifact.members.length, 3);
    assert.ok(artifact.members.some((member) => member.kind === "dotnet-type" && member.summary === "Represents a portal navigation menu."));
    assert.ok(artifact.members.some((member) => member.kind === "dotnet-method" && member.exceptions[0]?.cref === "T:System.ArgumentException"));
  });

  it("creates stable member ids", () => {
    assert.equal(
      createDotnetMemberId("M:Portal.Components.Navigation.PortalMenu.Render(System.String)"),
      "dotnet:m:portal.components.navigation.portalmenu.render-system.string"
    );
  });

  it("adapts XML documentation extraction to a HIA document shape", async () => {
    const xmlText = await fs.readFile(path.join(repositoryRoot, fixturePath), "utf8");
    const artifact = extractDotnetXmlDocs(xmlText, { path: fixturePath });
    const hiaDocument = dotnetXmlDocsToHiaDocument(artifact, {
      id: "dotnetdoc:Portal.Components",
      title: "Portal.Components API"
    });

    assert.equal(hiaDocument.schemaVersion, "0.2.0");
    assert.equal(hiaDocument.symbols.length, 3);
    assert.ok(hiaDocument.symbols.some((symbol) => symbol.kind === "dotnet-property" && symbol.name === "Items"));
    assert.ok(hiaDocument.symbols.every((symbol) => symbol.source.definedIn.link.enabled === false));
  });

  it("runs the standalone runner and producer adapter from the same request", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-runner");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const request = {
      workspaceRoot: repositoryRoot,
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-xml-doc",
          path: fixturePath,
          artifactBasePath: "Portal.Components",
          hiaDocumentId: "dotnetdoc:Portal.Components",
          title: "Portal.Components API"
        }
      ],
      options: {
        writeResultManifest: true
      }
    };

    const runnerResult = await runDotnetDoc(request);
    const producerResult = await dotnetdocProducer.produce(request);

    assert.equal(runnerResult.status, "success");
    assert.equal(runnerResult.artifacts.length, 2);
    assert.equal(producerResult.status, "success");
    assert.equal(dotnetdocProducer.descriptor.id, "dotnetdoc");
    assert.ok(await exists(path.join(outputDirectory, "Portal.Components.dotnetdoc.json")));
    assert.ok(await exists(path.join(outputDirectory, "Portal.Components.hia.json")));
  });
});

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
