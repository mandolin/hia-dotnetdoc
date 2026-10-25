/**
 * @file
 * @lang zh-CN 将配置项目中的唯一Roslyn声明投影为XML文档成员的代码定位；不猜路径、不执行业务构建。
 * @lang en Projects unique Roslyn declarations from configured projects into XML member code locators without path guessing or target builds.
 */
import { realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { extractDotnetProjectDiscovery, extractDotnetSourceFiles } from '@hia-doc/dotnet-source-extractor';
import { dotnetXmlDocsToHiaDocument } from '@hia-doc/dotnetdoc-adapter';
import { DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT, DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT, DOTNETDOC_PROJECT_DISCOVERY_CONTRACT } from '@hia-doc/dotnetdoc-spec';

/**
 * @lang zh-CN 按完整成员ID选择唯一声明；已知程序集不能跨界，重复注册和partial多位置保持歧义。
 * @lang en Selects a declaration by its complete member ID, respecting known assemblies and retaining ambiguity for duplicate registrations or partial locations.
 * @param {object} member <lang><zh-CN>XML成员身份。</zh-CN><en>XML member identity.</en></lang>
 * @param {object[]} candidates <lang><zh-CN>声明及其程序集身份。</zh-CN><en>Declarations with assembly identities.</en></lang>
 * @param {string|null} assembly <lang><zh-CN>XML声明的程序集。</zh-CN><en>Assembly declared by the XML input.</en></lang>
 * @returns {{declaration?:object,status:string}} <lang><zh-CN>唯一声明或missing/ambiguous；不按简称或参数数量回退。</zh-CN><en>Unique declaration or missing/ambiguous, without short-name or arity fallback.</en></lang>
 */
export function selectExactDeclaration(member, candidates, assembly) {
  // <lang><zh-CN>沿用既有唯一声明门禁；相同位置重复注册也不自动推断为同一输入事实。</zh-CN><en>Retain the existing unique-declaration gate; duplicate registrations at the same location are not automatically treated as one input fact.</en></lang>
  const unique = [];
  for (const candidate of candidates) {
    if (candidate.member.semantic?.documentationCommentId !== member.memberName) continue;
    if (assembly && candidate.assembly && candidate.assembly !== 'DotNetDoc.SourceExtraction' && candidate.assembly !== assembly) continue;
    unique.push(candidate.member);
  }
  return unique.length === 1 ? { status: 'resolved', declaration: unique[0] } : { status: unique.length === 0 ? 'missing' : 'ambiguous' };
}

/**
 * @lang zh-CN 在既有HIA输出路径补全源码/签名；原XML extraction wire及文档字段不修改。
 * @lang en Enriches source/signature at existing HIA output paths without changing raw XML extraction wire data or documentation fields.
 * @param {object[]} records <lang><zh-CN>当前请求抽取记录。</zh-CN><en>Extraction records from this request.</en></lang>
 * @param {object} request <lang><zh-CN>规范化工作区/输出根。</zh-CN><en>Normalized workspace/output roots.</en></lang>
 * @returns {Promise<object[]>} <lang><zh-CN>每个XML输入至多一条未定位警告，无正文或绝对路径。</zh-CN><en>At most one unresolved warning per XML input, without bodies or absolute paths.</en></lang>
 */
export async function enrichXmlSourceLocations(records, request) {
  // <lang><zh-CN>只使用已配置发现结果或XML输入显式绑定的projectPath；不扫描整个业务工作区。</zh-CN><en>Use configured discovery results or an XML input's explicit projectPath only, without scanning the target workspace.</en></lang>
  const projects = new Map(records.filter(record => record.artifact.contract === DOTNETDOC_PROJECT_DISCOVERY_CONTRACT).flatMap(record => record.artifact.projects ?? []).map(project => [project.path, project]));
  const explicit = records.filter(record => record.artifact.contract === DOTNETDOC_CSHARP_SOURCE_EXTRACTION_CONTRACT).flatMap(record => candidatesFrom(record.artifact));
  const cache = new Map();
  const diagnostics = [];
  for (const record of records) {
    if (record.artifact.contract !== DOTNETDOC_XML_DOC_EXTRACTION_CONTRACT) continue;
    // <lang><zh-CN>程序集匹配先于源码抽取；同名不同工程不能按文件顺序决定归属。</zh-CN><en>Assembly matching precedes source extraction; input order cannot resolve ownership between projects.</en></lang>
    const assembly = record.artifact.assembly?.name;
    let available = [...projects.values()];
    if (record.input.projectPath) {
      try {
        await assertContainedFile(request.workspaceRoot, record.input.projectPath);
        const discovery = await extractDotnetProjectDiscovery({ workspaceRoot: request.workspaceRoot, paths: [record.input.projectPath] });
        available = discovery.projects;
      } catch { available = []; }
    }
    const matches = assembly ? available.filter(project => (project.assemblyName ?? project.name) === assembly) : [];
    // <lang><zh-CN>每项目串行抽取并缓存一次；失败也是本请求缓存结果，不反复启动helper。</zh-CN><en>Extract each project serially once and cache failures too, preventing repeated helper launches.</en></lang>
    let discovered = [];
    if (matches.length === 1) {
      const project = matches[0];
      if (!cache.has(project.path)) cache.set(project.path, await readProjectCandidates(project, request.workspaceRoot));
      discovered = cache.get(project.path);
    }
    // <lang><zh-CN>显式输入对其成员ID优先；自动项目发现不重复注册同一显式身份，显式输入之间的重复仍拒绝。</zh-CN><en>Explicit inputs take precedence for their member IDs; automatic discovery never duplicates an explicit identity, while duplicates between explicit inputs remain refused.</en></lang>
    const explicitIds = new Set(explicit.filter(candidate => !assembly || !candidate.assembly || candidate.assembly === assembly || candidate.assembly === 'DotNetDoc.SourceExtraction').map(candidate => candidate.member.semantic?.documentationCommentId));
    const candidates = [...explicit, ...discovered.filter(candidate => !explicitIds.has(candidate.member.semantic?.documentationCommentId))];
    const byId = new Map();
    for (const candidate of candidates) {
      const id = candidate.member.semantic?.documentationCommentId;
      if (!id) continue;
      const bucket = byId.get(id) ?? [];
      bucket.push(candidate);
      byId.set(id, bucket);
    }
    // <lang><zh-CN>统计是有界元数据；每个符号保留XML原文/i18n，只合并验证后的代码声明。
    // </zh-CN><en>Counts are bounded metadata; each symbol retains XML text/i18n and merges only verified code declarations.</en></lang>
    const summary = { strategy: 'assembly-and-documentation-id', resolved: 0, ambiguous: 0, missing: 0 };
    const members = [];
    for (const member of record.artifact.members) {
      const selected = selectExactDeclaration(member, byId.get(member.memberName) ?? [], assembly);
      if (selected.status !== 'resolved') { summary[selected.status] += 1; members.push(member); continue; }
      const declaration = selected.declaration;
      try {
        await assertContainedFile(request.workspaceRoot, declaration.source.path);
        if (!/\.cs$/iu.test(declaration.source.path) || !validRange(declaration.source.range)) throw new Error('Not a bounded C# declaration');
        summary.resolved += 1;
        members.push({ ...member, source: declaration.source, semantic: { ...member.semantic, ...declaration.semantic } });
      } catch { summary.missing += 1; members.push(member); }
    }
    const document = dotnetXmlDocsToHiaDocument({ ...record.artifact, members }, { id: record.input.hiaDocumentId, title: record.input.title });
    document.metadata.sourceLocationResolution = summary;
    record.hiaDocument = document;
    await writeFile(path.join(request.outputDirectory, record.hiaPath), `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    if (summary.missing || summary.ambiguous) diagnostics.push({ code: 'DOTNETDOC_SOURCE_LOCATION_UNRESOLVED', message: 'Some XML members have no unique C# declaration. Configure the matching project/source inputs and resolve missing references; XML origins are not exposed as code.', severity: 'warning', source: { path: record.input.path }, metadata: summary });
  }
  return diagnostics;
}

/** @lang zh-CN 从已有抽取结果取身份和定位，不复制方法体。 @lang en Selects identities/locators from existing extraction results without copying method bodies. */
function candidatesFrom(artifact) {
  return artifact.members.map(member => ({ member, assembly: artifact.assembly?.name ?? member.semantic?.containingAssembly }));
}

/** @lang zh-CN 受限项目只读抽取；任何路径/工具失败都变为未定位，不泄露底层错误。 @lang en Performs bounded read-only project extraction, mapping path/tool failures to unresolved locations without leaking underlying errors. */
async function readProjectCandidates(project, root) {
  try {
    await assertContainedFile(root, project.path);
    // <lang><zh-CN>显式Compile条目先验证真实路径；SDK默认遍历不跟随symlink，项目根仍须在工作区内。</zh-CN><en>Validate real paths of explicit Compile items first; SDK enumeration does not follow symlinks and its project root must remain inside the workspace.</en></lang>
    for (const item of project.compileItems ?? []) {
      if (typeof item.include !== 'string' || !/\.cs$/iu.test(item.include)) continue;
      const sourcePath = path.posix.normalize(path.posix.join(path.posix.dirname(project.path), item.include.replaceAll('\\', '/')));
      await assertContainedFile(root, sourcePath);
    }
    return candidatesFrom(await extractDotnetSourceFiles({ workspaceRoot: root, projectPath: project.path }));
  } catch { return []; }
}

/** @lang zh-CN 双重路径包含检查，不读取越界symlink目标正文。 @lang en Checks lexical and real-path containment without reading bodies behind escaping symlinks. */
async function assertContainedFile(root, relative) {
  if (typeof relative !== 'string' || /^(?:[/\\]|[a-z][a-z0-9+.-]*:)/iu.test(relative) || relative.replaceAll('\\', '/').split('/').includes('..')) throw new Error('Unsafe source locator');
  const [realRoot, realFile] = await Promise.all([realpath(root), realpath(path.resolve(root, relative))]);
  const inside = path.relative(realRoot, realFile);
  if (path.isAbsolute(inside) || inside === '..' || inside.startsWith(`..${path.sep}`)) throw new Error('Source leaves workspace');
}

/** @lang zh-CN 只接受一基有序物理范围；不从XML默认第一行。 @lang en Accepts one-based ordered physical ranges without defaulting XML to line one. */
function validRange(range) {
  const start = range?.start;
  const end = range?.end;
  return Number.isSafeInteger(start?.line) && start.line > 0 && Number.isSafeInteger(end?.line) && end.line >= start.line && (start.column === undefined || Number.isSafeInteger(start.column) && start.column > 0) && (end.column === undefined || Number.isSafeInteger(end.column) && end.column > 0) && (end.line !== start.line || end.column === undefined || start.column === undefined || end.column >= start.column);
}
