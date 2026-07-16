import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractDotnetXmlDocs, createDotnetMemberId } from "../packages/dotnet-xml-doc-extractor/src/index.mjs";
import { extractAspNetEndpoints, extractDotnetSourceFiles } from "../packages/dotnet-source-extractor/src/index.mjs";
import { dotnetAspNetEndpointsToHiaDocument, dotnetXmlDocsToHiaDocument } from "../packages/dotnetdoc-adapter/src/index.mjs";
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

  it("extracts C# source documentation and source ranges through Roslyn", async () => {
    const artifact = await extractDotnetSourceFiles({
      workspaceRoot: repositoryRoot,
      paths: ["fixtures/source/Portal.Components/Navigation/PortalMenu.cs"]
    });

    assert.equal(artifact.contract, "dotnetdoc-csharp-source-extraction");
    assert.equal(artifact.source.files[0].path, "fixtures/source/Portal.Components/Navigation/PortalMenu.cs");
    assert.equal(artifact.members.length, 3);
    assert.ok(artifact.members.some((member) => member.memberName === "T:Portal.Components.Navigation.PortalMenu"));
    assert.ok(artifact.members.some((member) => member.memberName === "P:Portal.Components.Navigation.PortalMenu.Items"));
    assert.ok(artifact.members.some((member) => member.memberName === "M:Portal.Components.Navigation.PortalMenu.Render(System.String)"));
    assert.ok(artifact.members.every((member) => member.source.language === "csharp"));
    assert.ok(artifact.members.every((member) => member.source.range.start.line > 0));
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

  it("runs source inputs through the standalone runner", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-source-runner");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const runnerResult = await runDotnetDoc({
      workspaceRoot: repositoryRoot,
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-csharp-source",
          path: "fixtures/source/Portal.Components/Navigation/PortalMenu.cs",
          artifactBasePath: "PortalMenu.source",
          hiaDocumentId: "dotnetdoc:source:PortalMenu",
          title: "PortalMenu Source API"
        }
      ],
      options: {
        writeResultManifest: true
      }
    });
    const hia = JSON.parse(await fs.readFile(path.join(outputDirectory, "PortalMenu.source.hia.json"), "utf8"));

    assert.equal(runnerResult.status, "success");
    assert.equal(runnerResult.artifacts.length, 2);
    assert.ok(runnerResult.artifacts.some((artifact) => artifact.contract === "dotnetdoc-csharp-source-extraction"));
    assert.equal(hia.symbols[0].source.definedIn.language, "csharp");
    assert.equal(hia.symbols[0].source.definedIn.position.line, 9);
  });

  it("emits a source relation artifact when XML docs and C# source are processed together", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-source-relation");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const runnerResult = await runDotnetDoc({
      workspaceRoot: repositoryRoot,
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-xml-doc",
          path: fixturePath,
          artifactBasePath: "Portal.Components",
          hiaDocumentId: "dotnetdoc:Portal.Components",
          title: "Portal.Components API"
        },
        {
          kind: "dotnet-csharp-source",
          path: "fixtures/source/Portal.Components/Navigation/PortalMenu.cs",
          artifactBasePath: "PortalMenu.source",
          hiaDocumentId: "dotnetdoc:source:PortalMenu",
          title: "PortalMenu Source API"
        }
      ],
      options: {
        writeResultManifest: true
      }
    });
    const relation = JSON.parse(await fs.readFile(path.join(outputDirectory, "dotnetdoc.source-relation.json"), "utf8"));

    assert.equal(runnerResult.status, "success");
    assert.equal(runnerResult.artifacts.length, 5);
    assert.ok(runnerResult.artifacts.some((artifact) => artifact.contract === "dotnetdoc-source-relation"));
    assert.equal(relation.contract, "dotnetdoc-source-relation");
    assert.equal(relation.summary.relationCount, 3);
    assert.equal(relation.summary.unresolvedCount, 0);
    assert.ok(relation.relations.some((item) => item.memberName === "M:Portal.Components.Navigation.PortalMenu.Render(System.String)"));
    assert.ok(relation.relations.every((item) => item.documentation.artifactPath.endsWith(".dotnetdoc.json")));
    assert.ok(relation.relations.every((item) => item.declaration.path.endsWith(".cs")));
    assert.equal(relation.relations[0].hiaSymbol.artifactPath, "Portal.Components.hia.json");
  });

  it("extracts ASP.NET Web Forms, controller and minimal API endpoint surfaces", async () => {
    const artifact = await extractAspNetEndpoints({
      workspaceRoot: path.join(repositoryRoot, "fixtures/source/Portal.Web"),
      applicationRoot: ".",
      paths: [
        "Default.aspx",
        "Admin/Users.ascx",
        "Controllers/BooksController.cs",
        "Program.cs"
      ]
    });
    const hiaDocument = dotnetAspNetEndpointsToHiaDocument(artifact, {
      id: "dotnetdoc:aspnet-fixture",
      title: "ASP.NET Fixture Endpoint Surface"
    });

    assert.equal(artifact.contract, "dotnetdoc-aspnet-endpoint-extraction");
    assert.equal(artifact.summary.endpointCount, 6);
    assert.equal(artifact.summary.routableEndpointCount, 5);
    assert.ok(artifact.endpoints.some((endpoint) => endpoint.kind === "aspnet-webforms-page" && endpoint.route.template === "~/Default.aspx"));
    assert.ok(artifact.endpoints.some((endpoint) => endpoint.kind === "aspnet-webforms-control" && endpoint.routable === false));
    assert.ok(artifact.endpoints.some((endpoint) => endpoint.kind === "aspnet-controller-action" && endpoint.route.template === "api/Books/{id}" && endpoint.httpMethods[0] === "GET"));
    assert.ok(artifact.endpoints.some((endpoint) => endpoint.kind === "aspnet-minimal-api-endpoint" && endpoint.route.template === "/health"));
    assert.equal(hiaDocument.symbols.length, artifact.endpoints.length);
    assert.ok(hiaDocument.symbols.every((symbol) => symbol.kind === "aspnet-endpoint"));
  });

  it("runs ASP.NET endpoint inputs through the standalone runner", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-aspnet-endpoints");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const runnerResult = await runDotnetDoc({
      workspaceRoot: path.join(repositoryRoot, "fixtures/source/Portal.Web"),
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-aspnet-surface",
          path: "Default.aspx",
          artifactBasePath: "aspnet/Default",
          hiaDocumentId: "dotnetdoc:aspnet:Default",
          title: "Default Page Endpoint"
        }
      ],
      options: {
        writeResultManifest: true
      }
    });
    const endpointArtifact = JSON.parse(await fs.readFile(path.join(outputDirectory, "aspnet/Default.dotnetdoc.json"), "utf8"));
    const hia = JSON.parse(await fs.readFile(path.join(outputDirectory, "aspnet/Default.hia.json"), "utf8"));

    assert.equal(runnerResult.status, "success");
    assert.equal(runnerResult.artifacts.length, 2);
    assert.ok(runnerResult.artifacts.some((artifact) => artifact.contract === "dotnetdoc-aspnet-endpoint-extraction"));
    assert.equal(endpointArtifact.endpoints[0].handler.memberName, "Page_Load");
    assert.equal(hia.symbols[0].metadata.dotnetdoc.aspnetEndpoint.route.template, "~/Default.aspx");
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
