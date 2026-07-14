import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractDotnetXmlDocs, createDotnetMemberId } from "../packages/dotnet-xml-doc-extractor/src/index.mjs";
import { dotnetXmlDocsToHiaDocument } from "../packages/dotnetdoc-adapter/src/index.mjs";

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
});

