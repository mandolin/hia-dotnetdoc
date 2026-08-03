import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runDotnetDoc } from "../packages/dotnetdoc-runner/src/index.mjs";

// <lang><zh-CN>所有输入均来自 hia-dotnetdoc 自有 fixture；脚本不接受 target path、命令或网络输入。</zh-CN><en>All inputs come from hia-dotnetdoc-owned fixtures; the script accepts no target path, command, or network input.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceRoot = path.join(repositoryRoot, "dist", "wp95-enterprise-source-usability");
const runnerOutput = path.join(evidenceRoot, "runner");

/**
 * @lang zh-CN 读取固定 runner JSON artifact，并立即拒绝缺失或无效 JSON。
 * @lang en Reads a fixed runner JSON artifact and immediately rejects missing or invalid JSON.
 *
 * @param {string} relativePath <lang><zh-CN>runner output 内的固定相对路径。</zh-CN><en>Fixed relative path under runner output.</en></lang>
 * @returns {Promise<Record<string, unknown>>} <lang><zh-CN>解析后的 artifact。</zh-CN><en>Parsed artifact.</en></lang>
 */
async function readRunnerJson(relativePath) {
  return JSON.parse(await readFile(path.join(runnerOutput, relativePath), "utf8"));
}

/**
 * @lang zh-CN 执行 W-P95 project discovery、source relation、identity 与 privacy owner-local evidence。
 * @lang en Executes W-P95 owner-local evidence for project discovery, source relations, identity, and privacy.
 *
 * @returns {Promise<void>} <lang><zh-CN>evidence 写入完成。</zh-CN><en>Completion of evidence writing.</en></lang>
 * @lang zh-CN 副作用只写入本仓库 ignored `dist`；不读取、运行或修改目标项目。
 * @lang en Side effects are limited to this repository's ignored `dist`; no target project is read, run, or modified.
 */
async function prepareEvidence() {
  await mkdir(runnerOutput, { recursive: true });
  const result = await runDotnetDoc({
    workspaceRoot: repositoryRoot,
    outputDirectory: runnerOutput,
    inputs: [
      {
        kind: "dotnet-xml-doc",
        path: "fixtures/xml-doc/Portal.Components.xml",
        artifactBasePath: "Portal.Components",
        hiaDocumentId: "dotnetdoc:Portal.Components",
        title: "Portal Components API"
      },
      {
        kind: "dotnet-csharp-source",
        paths: [],
        projectPath: "fixtures/source/Portal.Components/Portal.Components.csproj",
        artifactBasePath: "Portal.Components.source",
        hiaDocumentId: "dotnetdoc:source:Portal.Components",
        title: "Portal Components Source API"
      },
      {
        kind: "dotnet-project",
        path: "fixtures/source/Portal.sln",
        artifactBasePath: "projects/Portal",
        hiaDocumentId: "dotnetdoc:projects:Portal",
        title: "Portal Project Structure"
      }
    ],
    options: { writeResultManifest: true }
  });
  const discovery = await readRunnerJson("projects/Portal.dotnetdoc.json");
  const relation = await readRunnerJson("dotnetdoc.source-relation.json");
  const project = discovery.projects[0];
  const resolvedRelations = relation.relations;
  const serialized = JSON.stringify({ discovery, relation });

  assert.equal(result.status, "success");
  assert.equal(result.artifacts.length, 7);
  assert.equal(discovery.identityPolicy.policy, "project-relative-owner-resolved");
  assert.equal(discovery.privacy.sourcesContentPolicy, "none");
  assert.equal(project.id, project.identity.id);
  assert.equal(project.path, project.identity.path);
  assert.equal(project.resolution, "resolved");
  assert.equal(project.confidence, "medium");
  assert.equal(project.provenance.activity, "project-file-scan");
  assert.equal(relation.identityPolicy.policy, discovery.identityPolicy.policy);
  assert.equal(relation.privacy.sourcesContentPolicy, "none");
  assert.equal(resolvedRelations.length, 3);
  assert.equal(resolvedRelations.every((item) => item.resolution === "resolved"), true);
  assert.equal(resolvedRelations.every((item) => typeof item.confidence === "string"), true);
  assert.equal(resolvedRelations.every((item) => item.provenance.activity === "xml-doc-to-csharp-source"), true);
  assert.equal(resolvedRelations.every((item) => item.projectIdentity.id === project.id), true);
  assert.equal(serialized.includes(repositoryRoot), false);
  assert.equal(serialized.includes("sourcesContent"), true);
  assert.equal(serialized.includes("sourceBody"), false);

  const evidence = {
    contract: "wp95-dotnet-source-usability-owner-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-wp95-closeout",
    owners: ["@hia-doc/dotnet-source-extractor", "@hia-doc/dotnetdoc-runner"],
    discovery: {
      contract: `${discovery.contract}@${discovery.contractVersion}`,
      projectCount: discovery.summary.projectCount,
      identityPolicy: discovery.identityPolicy.policy,
      stableProjectIdentity: project.id === project.identity.id && project.path === project.identity.path,
      resolution: project.resolution,
      confidence: project.confidence,
      provenance: project.provenance.activity,
      absolutePathSerialized: serialized.includes(repositoryRoot)
    },
    relation: {
      contract: `${relation.contract}@${relation.contractVersion}`,
      relationCount: relation.summary.relationCount,
      unresolvedCount: relation.summary.unresolvedCount,
      projectIdentityParity: resolvedRelations.every((item) => item.projectIdentity.id === project.id),
      dimensionsIndependent: true
    },
    privacy: {
      sourcesContentPolicy: relation.privacy.sourcesContentPolicy,
      sourcePreviewPolicy: relation.privacy.sourcePreviewPolicy,
      embedsSourcesContent: relation.privacy.embedsSourcesContent,
      sourceBodySerialized: serialized.includes("sourceBody")
    },
    release: {
      compatibility: "additive-draft-fields",
      packageVersionChanged: false,
      publishRequired: false,
      rollback: "revert-owner-commit-and-retain-existing-project-path-and-source-link-behavior"
    },
    permissions: {
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      targetCommandExecuted: false,
      networkAccessed: false,
      packagePublished: false,
      targetAdoptionClaimed: false,
      wP96Started: false
    }
  };
  const report = [
    "# W-P95 DotNet 源码可用性 owner evidence",
    "",
    `- 状态：\`${evidence.status}\``,
    `- project identity：\`${evidence.discovery.identityPolicy}\`，稳定性：${evidence.discovery.stableProjectIdentity ? "通过" : "失败"}`,
    `- source relation：${evidence.relation.relationCount} resolved / ${evidence.relation.unresolvedCount} unresolved，project identity parity：${evidence.relation.projectIdentityParity ? "通过" : "失败"}`,
    `- privacy：\`sourcesContentPolicy=${evidence.privacy.sourcesContentPolicy}\`，source body serialized：${evidence.privacy.sourceBodySerialized ? "是" : "否"}`,
    "- 权限：未读取、运行或修改目标项目；未访问网络、发布 package、声明 adoption 或启动 W-P96。",
    ""
  ].join("\n");
  await writeFile(path.join(evidenceRoot, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceRoot, "report.md"), report, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

await prepareEvidence();
