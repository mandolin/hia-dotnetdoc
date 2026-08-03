import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractDotnetXmlDocs, createDotnetMemberId } from "../packages/dotnet-xml-doc-extractor/src/index.mjs";
import { extractAspNetEndpoints, extractDotnetMarkupComments, extractDotnetProjectDiscovery, extractDotnetSourceFiles } from "../packages/dotnet-source-extractor/src/index.mjs";
import { dotnetAspNetEndpointsToHiaDocument, dotnetMarkupCommentsToHiaDocument, dotnetProjectDiscoveryToHiaDocument, dotnetXmlDocsToHiaDocument } from "../packages/dotnetdoc-adapter/src/index.mjs";
import { classifyDotnetBuildDiagnostics, runDotnetDoc } from "../packages/dotnetdoc-runner/src/index.mjs";
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
    assert.equal(artifact.defaultLocale, "en");
    assert.deepEqual(artifact.locales, ["en", "zh-CN"]);
    assert.ok(artifact.members.some((member) => member.kind === "dotnet-type" && member.summary === "Represents a portal navigation menu."));
    assert.ok(artifact.members.some((member) => member.kind === "dotnet-method" && member.exceptions[0]?.cref === "T:System.ArgumentException"));
    const menu = artifact.members.find((member) => member.name === "PortalMenu");
    const render = artifact.members.find((member) => member.name === "Render");
    assert.equal(menu?.i18n?.model, "hia-text-i18n");
    assert.equal(menu?.i18n?.fields.summary.localizedText["zh-CN"], "表示一个门户导航菜单。");
    assert.equal(menu?.i18n?.fields.remarks.localizedText["zh-CN"], "供 ASP.NET Portal 布局页面使用。");
    assert.equal(render?.i18n?.fields["params.tenantId.summary"].localizedText["zh-CN"], "租户标识。");
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
    assert.equal(hiaDocument.defaultLocale, "en");
    assert.deepEqual(hiaDocument.locales, ["en", "zh-CN"]);
    assert.equal(hiaDocument.symbols.length, 3);
    assert.ok(hiaDocument.symbols.some((symbol) => symbol.kind === "dotnet-property" && symbol.name === "Items"));
    assert.ok(hiaDocument.symbols.every((symbol) => symbol.source.definedIn.link.enabled === false));
    const menu = hiaDocument.symbols.find((symbol) => symbol.name === "PortalMenu");
    const render = hiaDocument.symbols.find((symbol) => symbol.name === "Render");
    assert.equal(menu?.i18n?.fields.summary.localizedText.en, "Represents a portal navigation menu.");
    assert.equal(menu?.i18n?.fields.remarks.localizedText["zh-CN"], "供 ASP.NET Portal 布局页面使用。");
    assert.equal(menu?.metadata.dotnetdoc.semantic.containingAssembly, "Portal.Components");
    assert.equal(menu?.metadata.dotnetdoc.semantic.documentationCommentId, "T:Portal.Components.Navigation.PortalMenu");
    assert.equal(menu?.metadata.dotnetdoc.semantic.containingNamespace, "Portal.Components.Navigation");
    assert.equal(render?.metadata.dotnetdoc.semantic.containingType, "Portal.Components.Navigation.PortalMenu");
    assert.equal(render?.metadata.dotnetdoc.semantic.parentDocumentationCommentId, "T:Portal.Components.Navigation.PortalMenu");
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
    const semanticMenu = artifact.members.find((member) => member.memberName === "T:Portal.Components.Navigation.PortalMenu");
    assert.equal(semanticMenu?.semantic?.containingNamespace, "Portal.Components.Navigation");
    assert.ok(semanticMenu?.semantic?.baseTypeIds.includes("T:System.Object"));
    assert.ok(artifact.diagnostics.every((diagnostic) => ["error", "warning", "info"].includes(diagnostic.severity)));
    assert.ok(artifact.diagnostics.every((diagnostic) => !Object.hasOwn(diagnostic, "source")));
    assert.ok(artifact.members.some((member) => member.memberName === "P:Portal.Components.Navigation.PortalMenu.Items"));
    assert.ok(artifact.members.some((member) => member.memberName === "M:Portal.Components.Navigation.PortalMenu.Render(System.String)"));
    assert.ok(artifact.members.every((member) => member.source.language === "csharp"));
    assert.ok(artifact.members.every((member) => member.source.range.start.line > 0));
    assert.ok(artifact.members.every((member) => member.semantic?.documentationCommentId === member.memberName));
    const menu = artifact.members.find((member) => member.name === "PortalMenu");
    const render = artifact.members.find((member) => member.name === "Render");
    assert.equal(menu?.i18n?.fields.summary.localizedText["zh-CN"], "表示一个门户导航菜单。");
    assert.equal(render?.i18n?.fields["params.tenantId.summary"].localizedText["zh-CN"], "用于选择可见菜单项的租户标识。");
    assert.equal(artifact.members.some((member) => Object.hasOwn(member, "documentationXml")), false);
  });

  it("extracts C# source files from a project path without a full MSBuild workspace", async () => {
    const artifact = await extractDotnetSourceFiles({
      workspaceRoot: repositoryRoot,
      projectPath: "fixtures/source/Portal.Components/Portal.Components.csproj"
    });

    assert.equal(artifact.contract, "dotnetdoc-csharp-source-extraction");
    assert.equal(artifact.source.projectPath, "fixtures/source/Portal.Components/Portal.Components.csproj");
    assert.equal(artifact.source.projectContext.kind, "csproj-explicit-compile-items");
    assert.equal(artifact.source.projectContext.sourcePathCount, 1);
    assert.deepEqual(artifact.source.projectContext.projectIdentity, {
      id: "dotnet-project:fixtures-source-portal.components-portal.components.csproj",
      path: "fixtures/source/Portal.Components/Portal.Components.csproj",
      policy: "project-relative-owner-resolved"
    });
    assert.equal(artifact.source.projectContext.assemblyName, "Portal.Components");
    assert.equal(artifact.assembly.name, "Portal.Components");
    assert.equal(artifact.source.files.length, 1);
    assert.equal(artifact.source.files[0].path, "fixtures/source/Portal.Components/Navigation/PortalMenu.cs");
    assert.ok(artifact.members.some((member) => member.memberName === "T:Portal.Components.Navigation.PortalMenu"));
    assert.equal(
      artifact.members.find((member) => member.memberName === "T:Portal.Components.Navigation.PortalMenu")?.semantic?.containingAssembly,
      "Portal.Components"
    );
    assert.equal(artifact.members.some((member) => member.memberName === "T:Portal.Components.Navigation.SemanticSample`1"), false);
  });

  it("uses Roslyn semantic documentation ids for constructors, generics and ref/out parameters", async () => {
    const artifact = await extractDotnetSourceFiles({
      workspaceRoot: repositoryRoot,
      paths: ["fixtures/source/Portal.Components/Navigation/SemanticSample.cs"]
    });

    const semanticType = artifact.members.find((member) => member.name === "SemanticSample");
    const constructor = artifact.members.find((member) => member.name === "#ctor");
    const tryFormat = artifact.members.find((member) => member.name === "TryFormat");

    assert.equal(artifact.contract, "dotnetdoc-csharp-source-extraction");
    assert.equal(artifact.diagnostics.length, 0);
    assert.equal(semanticType?.memberName, "T:Portal.Components.Navigation.SemanticSample`1");
    assert.equal(constructor?.memberName, "M:Portal.Components.Navigation.SemanticSample`1.#ctor(`0)");
    assert.match(tryFormat?.memberName ?? "", /^M:Portal\.Components\.Navigation\.SemanticSample`1\.TryFormat\(`0@,System\.String@\)$/);
    assert.equal(tryFormat?.semantic?.documentationCommentId, tryFormat?.memberName);
    assert.equal(tryFormat?.semantic?.symbolKind, "Method");
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
    assert.equal(hia.symbols[0].source.definedIn.position.line, 18);
  });

  it("runs source projectPath inputs through the standalone runner", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-source-project-runner");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const runnerResult = await runDotnetDoc({
      workspaceRoot: repositoryRoot,
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-csharp-source",
          paths: [],
          projectPath: "fixtures/source/Portal.Components/Portal.Components.csproj",
          artifactBasePath: "Portal.Components.source-project",
          hiaDocumentId: "dotnetdoc:source:Portal.Components",
          title: "Portal.Components Source API"
        }
      ],
      options: {
        writeResultManifest: true
      }
    });
    const sourceArtifact = JSON.parse(await fs.readFile(path.join(outputDirectory, "Portal.Components.source-project.dotnetdoc.json"), "utf8"));
    const hia = JSON.parse(await fs.readFile(path.join(outputDirectory, "Portal.Components.source-project.hia.json"), "utf8"));

    assert.equal(runnerResult.status, "success");
    assert.equal(runnerResult.artifacts.length, 2);
    assert.equal(sourceArtifact.source.projectPath, "fixtures/source/Portal.Components/Portal.Components.csproj");
    assert.equal(sourceArtifact.source.projectContext.sourcePathCount, 1);
    assert.ok(sourceArtifact.members.some((member) => member.memberName === "P:Portal.Components.Navigation.PortalMenu.Items"));
    assert.equal(hia.symbols[0].source.definedIn.language, "csharp");
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
          paths: [],
          projectPath: "fixtures/source/Portal.Components/Portal.Components.csproj",
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
    assert.equal(relation.identityPolicy.policy, "project-relative-owner-resolved");
    assert.equal(relation.identityPolicy.absolutePathInIdentity, false);
    assert.equal(relation.privacy.sourcesContentPolicy, "none");
    assert.equal(relation.privacy.embedsSourcesContent, false);
    assert.ok(relation.relations.some((item) => item.memberName === "M:Portal.Components.Navigation.PortalMenu.Render(System.String)"));
    assert.ok(relation.relations.every((item) => item.resolution === "resolved"));
    assert.ok(relation.relations.every((item) => item.confidence === "medium"));
    assert.ok(relation.relations.every((item) => item.provenance.activity === "xml-doc-to-csharp-source"));
    assert.ok(relation.relations.every((item) => item.projectIdentity.path === "fixtures/source/Portal.Components/Portal.Components.csproj"));
    assert.ok(relation.relations.every((item) => item.documentation.artifactPath.endsWith(".dotnetdoc.json")));
    assert.ok(relation.relations.every((item) => item.declaration.path.endsWith(".cs")));
    assert.equal(relation.relations[0].hiaSymbol.artifactPath, "Portal.Components.hia.json");
    const typeRelation = relation.relations.find((item) => item.memberName === "T:Portal.Components.Navigation.PortalMenu");
    assert.equal(typeRelation.declaration.semantic.containingNamespace, "Portal.Components.Navigation");
    assert.ok(typeRelation.declaration.semantic.baseTypeIds.includes("T:System.Object"));
  });

  it("uses a conservative unique-member fallback when parameter type ids differ", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-source-relation-fallback");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const runnerResult = await runDotnetDoc({
      workspaceRoot: repositoryRoot,
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-xml-doc",
          path: "fixtures/xml-doc/Legacy.Signature.xml",
          artifactBasePath: "Legacy.Signature",
          hiaDocumentId: "dotnetdoc:Legacy.Signature",
          title: "Legacy Signature API"
        },
        {
          kind: "dotnet-csharp-source",
          path: "fixtures/source/Legacy.Signature/LegacyPage.cs",
          artifactBasePath: "Legacy.Signature.source",
          hiaDocumentId: "dotnetdoc:source:Legacy.Signature",
          title: "Legacy Signature Source API"
        }
      ],
      options: {
        writeResultManifest: true
      }
    });
    const relation = JSON.parse(await fs.readFile(path.join(outputDirectory, "dotnetdoc.source-relation.json"), "utf8"));
    const fallback = relation.relations.find((item) => item.memberName.includes("LegacyPage.Handle"));

    assert.equal(runnerResult.status, "success");
    assert.equal(relation.summary.fallbackRelationCount, 1);
    assert.equal(fallback?.match.mode, "unique-member-fallback");
    assert.equal(fallback?.match.exactDocumentationId, false);
    assert.equal(fallback?.confidence, "low");
    assert.equal(fallback?.declaration.path, "fixtures/source/Legacy.Signature/LegacyPage.cs");
  });

  it("matches legacy overloaded signatures and extracts enum fields and conversion operators", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-source-relation-edge-cases");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const runnerResult = await runDotnetDoc({
      workspaceRoot: repositoryRoot,
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-xml-doc",
          path: "fixtures/xml-doc/Relation.EdgeCases.xml",
          artifactBasePath: "Relation.EdgeCases",
          hiaDocumentId: "dotnetdoc:Relation.EdgeCases",
          title: "Relation Edge Cases API"
        },
        {
          kind: "dotnet-csharp-source",
          path: "fixtures/source/Relation.EdgeCases/RelationEdgeCases.cs",
          artifactBasePath: "Relation.EdgeCases.source",
          hiaDocumentId: "dotnetdoc:source:Relation.EdgeCases",
          title: "Relation Edge Cases Source API"
        }
      ],
      options: {
        writeResultManifest: true
      }
    });
    const relation = JSON.parse(await fs.readFile(path.join(outputDirectory, "dotnetdoc.source-relation.json"), "utf8"));
    const source = JSON.parse(await fs.readFile(path.join(outputDirectory, "Relation.EdgeCases.source.dotnetdoc.json"), "utf8"));
    const overloadedRelations = relation.relations.filter((item) => item.name === "Handle");
    const enumRelation = relation.relations.find((item) => item.memberName === "F:Relation.EdgeCases.RelationMode.Primary");
    const conversionRelation = relation.relations.find((item) => item.memberName.includes("ConversionValue.op_Implicit"));

    assert.equal(runnerResult.status, "success");
    assert.equal(relation.summary.signatureFallbackRelationCount, 2);
    assert.equal(overloadedRelations.length, 2);
    assert.ok(overloadedRelations.every((item) => item.match.mode === "normalized-signature-fallback"));
    assert.ok(overloadedRelations.every((item) => item.confidence === "low"));
    assert.equal(enumRelation?.match.mode, "documentation-id");
    assert.equal(enumRelation?.declaration.semantic.symbolKind, "Field");
    assert.equal(conversionRelation?.match.mode, "documentation-id");
    assert.equal(conversionRelation?.declaration.semantic.symbolKind, "Method");
    assert.ok(source.members.some((member) => member.memberName === "F:Relation.EdgeCases.RelationMode.Primary"));
    assert.ok(source.members.some((member) => member.memberName.includes("ConversionValue.op_Implicit")));
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
    const getBook = artifact.endpoints.find((endpoint) => endpoint.displayName === "BooksController.Get");
    const createBook = artifact.endpoints.find((endpoint) => endpoint.displayName === "BooksController.Create");
    const health = artifact.endpoints.find((endpoint) => endpoint.kind === "aspnet-minimal-api-endpoint" && endpoint.route.template === "/health");
    const createBookMinimal = artifact.endpoints.find((endpoint) => endpoint.kind === "aspnet-minimal-api-endpoint" && endpoint.route.template === "/books");
    assert.equal(getBook?.route.name, "GetBook");
    assert.equal(getBook?.metadata.aspnetCore.authorization.allowAnonymous, true);
    assert.equal(getBook?.metadata.aspnetCore.authorization.required, false);
    assert.ok(getBook?.metadata.aspnetCore.responses.some((response) => response.statusCode === 200));
    assert.equal(createBook?.metadata.aspnetCore.authorization.required, true);
    assert.deepEqual(createBook?.metadata.aspnetCore.authorization.roles, ["Editors"]);
    assert.ok(createBook?.metadata.aspnetCore.responses.some((response) => response.statusCode === 201));
    assert.equal(health?.metadata.aspnetCore.endpointName, "HealthCheck");
    assert.deepEqual(health?.metadata.aspnetCore.tags, ["System"]);
    assert.equal(health?.metadata.aspnetCore.authorization.allowAnonymous, true);
    assert.equal(createBookMinimal?.metadata.aspnetCore.authorization.required, true);
    assert.deepEqual(createBookMinimal?.metadata.aspnetCore.authorization.policies, ["Books.Write"]);
    assert.equal(createBookMinimal?.metadata.aspnetCore.responses[0].statusCode, 200);
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

  it("runs ASP.NET endpoint inputs with multiple workspace-relative paths", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-aspnet-endpoint-paths");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const runnerResult = await runDotnetDoc({
      workspaceRoot: path.join(repositoryRoot, "fixtures/source/Portal.Web"),
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-aspnet-surface",
          paths: [
            "Default.aspx",
            "Admin/Users.ascx",
            "Controllers/BooksController.cs",
            "Program.cs"
          ],
          artifactBasePath: "aspnet/Portal.Web",
          hiaDocumentId: "dotnetdoc:aspnet:Portal.Web",
          title: "Portal Web ASP.NET Surface"
        }
      ],
      options: {
        writeResultManifest: true
      }
    });
    const endpointArtifact = JSON.parse(await fs.readFile(path.join(outputDirectory, "aspnet/Portal.Web.dotnetdoc.json"), "utf8"));
    const resultManifest = JSON.parse(await fs.readFile(path.join(outputDirectory, "dotnetdoc.producer-result.json"), "utf8"));

    assert.equal(runnerResult.status, "success");
    assert.equal(endpointArtifact.source.files.length, 4);
    assert.ok(endpointArtifact.endpoints.some((endpoint) => endpoint.kind === "aspnet-webforms-page"));
    assert.ok(endpointArtifact.endpoints.some((endpoint) => endpoint.kind === "aspnet-webforms-control"));
    assert.ok(endpointArtifact.endpoints.some((endpoint) => endpoint.kind === "aspnet-controller-action"));
    assert.ok(endpointArtifact.endpoints.some((endpoint) => endpoint.kind === "aspnet-minimal-api-endpoint"));
    assert.ok(resultManifest.artifacts.some((artifact) => artifact.path === "aspnet/Portal.Web.hia.json"));
  });

  it("extracts Web Forms and Razor markup comments as documentation inputs", async () => {
    const artifact = await extractDotnetMarkupComments({
      workspaceRoot: path.join(repositoryRoot, "fixtures/source/Portal.Web"),
      paths: [
        "Default.aspx",
        "Admin/Users.ascx",
        "Views/Home/Index.cshtml",
        "Components/StatusPanel.razor"
      ]
    });
    const hiaDocument = dotnetMarkupCommentsToHiaDocument(artifact, {
      id: "dotnetdoc:markup-comments-fixture",
      title: "ASP.NET Markup Comment Fixture"
    });

    assert.equal(artifact.contract, "dotnetdoc-markup-comment-extraction");
    assert.equal(artifact.defaultLocale, "en");
    assert.deepEqual(artifact.locales, ["en", "zh-CN"]);
    assert.equal(artifact.summary.commentCount, 7);
    assert.equal(artifact.summary.webFormsServerCommentCount, 2);
    assert.equal(artifact.summary.razorCommentCount, 2);
    assert.equal(artifact.summary.htmlCommentCount, 3);
    assert.equal(artifact.summary.serverHiddenCommentCount, 4);
    assert.equal(artifact.summary.clientVisibleCommentCount, 3);
    assert.equal(artifact.privacy.embedsSourcesContent, false);
    assert.ok(artifact.comments.some((comment) => comment.commentKind === "webforms-server-comment" && comment.content.includes("@component PortalHomePage")));
    assert.ok(artifact.comments.some((comment) => comment.commentKind === "razor-comment" && comment.content.includes("@component StatusPanel")));
    assert.ok(artifact.comments.some((comment) => comment.commentKind === "html-comment" && comment.visibility === "client-visible"));
    assert.equal(
      artifact.comments.find((comment) => comment.content.includes("@component PortalHomePage"))?.i18n?.fields.content.localizedText["zh-CN"],
      "门户首页 Web Forms 页面。"
    );
    assert.ok(artifact.comments.every((comment) => comment.source.range.start.line > 0));
    assert.deepEqual(hiaDocument.locales, ["en", "zh-CN"]);
    assert.equal(hiaDocument.symbols.length, artifact.comments.length);
    assert.ok(hiaDocument.symbols.every((symbol) => symbol.kind === "dotnet-markup-comment"));
    assert.equal(
      hiaDocument.symbols.find((symbol) => symbol.metadata.dotnetdoc.markupComment.content.includes("@component StatusPanel"))?.i18n?.fields.content.localizedText.en,
      "Shows the current portal health state."
    );
    const localizedSymbol = hiaDocument.symbols.find((symbol) => symbol.i18n);
    assert.equal(localizedSymbol?.i18n.enabled, true);
    assert.equal(localizedSymbol?.i18n.modelVersion, "0.2.0");
    assert.equal(localizedSymbol?.i18n.fields.content.fieldPath, "content");
    assert.equal(localizedSymbol?.i18n.fields.content.kind, "plain-text");
    assert.equal(Object.hasOwn(localizedSymbol?.source.definedIn ?? {}, "range"), true);
    assert.equal(hiaDocument.metadata.privacy.sourcesContentPolicy, "none");
  });

  it("runs markup comment inputs through the standalone runner", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-markup-comments");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const runnerResult = await runDotnetDoc({
      workspaceRoot: path.join(repositoryRoot, "fixtures/source/Portal.Web"),
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-markup-comments",
          path: "Views/Home/Index.cshtml",
          artifactBasePath: "markup/Home.Index",
          hiaDocumentId: "dotnetdoc:markup:Home.Index",
          title: "Home Razor Markup Comments"
        }
      ],
      options: {
        writeResultManifest: true
      }
    });
    const markupArtifact = JSON.parse(await fs.readFile(path.join(outputDirectory, "markup/Home.Index.dotnetdoc.json"), "utf8"));
    const hia = JSON.parse(await fs.readFile(path.join(outputDirectory, "markup/Home.Index.hia.json"), "utf8"));

    assert.equal(runnerResult.status, "success");
    assert.equal(runnerResult.artifacts.length, 2);
    assert.ok(runnerResult.artifacts.some((artifact) => artifact.contract === "dotnetdoc-markup-comment-extraction"));
    assert.equal(markupArtifact.summary.razorCommentCount, 1);
    assert.equal(markupArtifact.summary.htmlCommentCount, 1);
    assert.equal(hia.symbols[0].metadata.dotnetdoc.markupComment.commentKind, "razor-comment");
  });

  it("runs markup comment inputs with glob patterns through the standalone runner", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-markup-comment-globs");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const runnerResult = await runDotnetDoc({
      workspaceRoot: path.join(repositoryRoot, "fixtures/source/Portal.Web"),
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-markup-comments",
          paths: [],
          globs: ["**/*.{aspx,ascx,master,cshtml,razor}"],
          artifactBasePath: "markup/Portal.Web",
          hiaDocumentId: "dotnetdoc:markup:Portal.Web",
          title: "Portal Web Markup Comments"
        }
      ],
      options: {
        writeResultManifest: true
      }
    });
    const markupArtifact = JSON.parse(await fs.readFile(path.join(outputDirectory, "markup/Portal.Web.dotnetdoc.json"), "utf8"));
    const hia = JSON.parse(await fs.readFile(path.join(outputDirectory, "markup/Portal.Web.hia.json"), "utf8"));

    assert.equal(runnerResult.status, "success");
    assert.equal(markupArtifact.summary.inputCount, 4);
    assert.equal(markupArtifact.summary.commentCount, 7);
    assert.equal(hia.symbols.length, 7);
    assert.equal(hia.symbols.every((symbol) => Object.hasOwn(symbol.source.definedIn, "range")), true);
    assert.ok(runnerResult.artifacts.some((artifact) => artifact.path === "markup/Portal.Web.dotnetdoc.json"));
  });

  it("discovers .NET solution and project structure without compiling", async () => {
    const artifact = await extractDotnetProjectDiscovery({
      workspaceRoot: repositoryRoot,
      path: "fixtures/source/Portal.sln"
    });
    const hiaDocument = dotnetProjectDiscoveryToHiaDocument(artifact, {
      id: "dotnetdoc:projects:Portal",
      title: "Portal Project Structure"
    });

    assert.equal(artifact.contract, "dotnetdoc-project-discovery");
    assert.equal(artifact.summary.solutionCount, 1);
    assert.equal(artifact.summary.projectCount, 1);
    assert.equal(artifact.identityPolicy.policy, "project-relative-owner-resolved");
    assert.equal(artifact.identityPolicy.absolutePathInIdentity, false);
    assert.equal(artifact.privacy.sourcesContentPolicy, "none");
    assert.equal(artifact.privacy.embedsSourcesContent, false);
    assert.equal(artifact.projects[0].path, "fixtures/source/Portal.Components/Portal.Components.csproj");
    assert.deepEqual(artifact.projects[0].identity, {
      id: "dotnet-project:fixtures-source-portal.components-portal.components.csproj",
      path: "fixtures/source/Portal.Components/Portal.Components.csproj",
      policy: "project-relative-owner-resolved"
    });
    assert.equal(artifact.projects[0].resolution, "resolved");
    assert.equal(artifact.projects[0].confidence, "medium");
    assert.equal(artifact.projects[0].provenance.activity, "project-file-scan");
    assert.equal(JSON.stringify(artifact).includes(repositoryRoot), false);
    assert.deepEqual(artifact.projects[0].targetFrameworks, ["net8.0"]);
    assert.equal(artifact.projects[0].packageReferences[0].include, "Microsoft.CodeAnalysis.CSharp");
    assert.equal(artifact.projects[0].compileItems[0].include, "Navigation/PortalMenu.cs");
    assert.equal(hiaDocument.symbols.length, 2);
    assert.ok(hiaDocument.symbols.some((symbol) => symbol.kind === "dotnet-solution"));
    assert.ok(hiaDocument.symbols.some((symbol) => symbol.kind === "dotnet-project"));
  });

  it("runs .NET project discovery inputs through the standalone runner", async () => {
    const outputDirectory = path.join(repositoryRoot, "temp", "out-test-project-discovery");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    const runnerResult = await runDotnetDoc({
      workspaceRoot: repositoryRoot,
      outputDirectory,
      inputs: [
        {
          kind: "dotnet-project",
          path: "fixtures/source/Portal.Components/Portal.Components.csproj",
          artifactBasePath: "projects/Portal.Components",
          hiaDocumentId: "dotnetdoc:project:Portal.Components",
          title: "Portal.Components Project"
        }
      ],
      options: {
        writeResultManifest: true
      }
    });
    const projectArtifact = JSON.parse(await fs.readFile(path.join(outputDirectory, "projects/Portal.Components.dotnetdoc.json"), "utf8"));
    const hia = JSON.parse(await fs.readFile(path.join(outputDirectory, "projects/Portal.Components.hia.json"), "utf8"));

    assert.equal(runnerResult.status, "success");
    assert.equal(runnerResult.artifacts.length, 2);
    assert.ok(runnerResult.artifacts.some((artifact) => artifact.contract === "dotnetdoc-project-discovery"));
    assert.equal(projectArtifact.projects[0].assemblyName, "Portal.Components");
    assert.equal(hia.symbols[0].metadata.dotnetdoc.projectDiscoveryProject.path, "fixtures/source/Portal.Components/Portal.Components.csproj");
  });

  it("classifies generated and designer CS1591 warnings without blocking default documentation", () => {
    const artifact = classifyDotnetBuildDiagnostics([
      "src/Portal/Default.aspx.designer.cs(12,18): warning CS1591: Missing XML comment for publicly visible type or member 'Default'",
      "src/Portal/ManualController.cs(21,14): warning CS1591: Missing XML comment for publicly visible type or member 'ManualController'",
      "src/Portal/obj/Debug/net8.0/Razor/Home.g.cs(4,10): warning CS1591: Missing XML comment for publicly visible type or member 'Home'"
    ]);

    assert.equal(artifact.contract, "dotnetdoc-build-warning-classification");
    assert.equal(artifact.summary.diagnosticCount, 3);
    assert.equal(artifact.summary.generatedOrDesignerCount, 2);
    assert.equal(artifact.summary.manualSourceCount, 1);
    assert.equal(artifact.summary.defaultBlockingCount, 0);
    assert.equal(artifact.diagnostics[0].boundary.kind, "designer-code");
    assert.equal(artifact.diagnostics[0].gate.defaultAction, "exclude-from-documentation-warning-gate");
    assert.equal(artifact.diagnostics[1].boundary.kind, "manual-source");
    assert.equal(artifact.diagnostics[1].gate.defaultAction, "keep-in-documentation-warning-gate");
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
