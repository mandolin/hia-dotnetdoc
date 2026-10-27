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
import { hasUnpairedSurrogate } from './doc-source-map.mjs';

/**
 * @lang zh-CN 按完整成员ID选声明；同次抽取的真实partial类型选主声明，重复注册/跨抽取冲突仍拒绝。
 * @lang en Selects declarations by complete member ID; genuine partial types from one extraction select a primary declaration, while duplicates and cross-extraction conflicts remain refused.
 * @param {object} member <lang><zh-CN>XML成员身份。</zh-CN><en>XML member identity.</en></lang>
 * @param {object[]} candidates <lang><zh-CN>声明及其程序集身份。</zh-CN><en>Declarations with assembly identities.</en></lang>
 * @param {string|null} assembly <lang><zh-CN>XML声明的程序集。</zh-CN><en>Assembly declared by the XML input.</en></lang>
 * @returns {{declaration?:object,origin?:object,status:string,candidateCount:number,selectionRule?:string}} <lang><zh-CN>精确/partial主声明及其抽取事实，或missing/ambiguous；不按简称或参数数量回退。</zh-CN><en>Exact/partial primary declaration and its extraction fact, or missing/ambiguous; no short-name or arity fallback.</en></lang>
 */
export function selectExactDeclaration(member, candidates, assembly) {
  // <lang><zh-CN>完整ID及签名类型先验证；相同位置重复注册不自动合并为同一输入事实。</zh-CN><en>Validate complete IDs and signature types first; duplicate registrations at the same location do not automatically become one input fact.</en></lang>
  const unique = [];
  for (const candidate of candidates) {
    if (candidate.member.semantic?.documentationCommentId !== member.memberName || candidate.member.semantic?.hasUnresolvedSignatureTypes === true) continue;
    if (assembly && candidate.assembly && candidate.assembly !== 'DotNetDoc.SourceExtraction' && candidate.assembly !== assembly) continue;
    unique.push(candidate);
  }
  if(unique.length===1) return {status:'resolved',declaration:unique[0].member,origin:unique[0].origin,candidateCount:1,selectionRule:'exact-documentation-id'};
  // <lang><zh-CN>partial必须来自同一编译事实、同一程序集且位置各异；普通重复不能靠排序变成有效声明。</zh-CN><en>Partial declarations must share a compilation and assembly with distinct locations; ordering cannot legitimize ordinary duplicates.</en></lang>
  const first=unique[0];
  const locations=new Set(unique.map(candidate=>`${candidate.member.source?.path}:${candidate.member.source?.range?.start?.line}:${candidate.member.source?.range?.start?.column}`));
  if(unique.length>1 && first.origin && locations.size===unique.length && unique.every(candidate=>candidate.origin===first.origin && candidate.assembly===first.assembly && candidate.member.kind==='dotnet-type' && candidate.member.semantic?.declaration?.isPartialType===true && candidate.member.semantic.declaration.declarationCount===unique.length)){
    const ranked=[...unique].sort(compareDeclarations);
    return {status:'resolved',declaration:ranked[0].member,origin:ranked[0].origin,candidateCount:unique.length,selectionRule:'non-generated-path-line'};
  }
  return {status:unique.length===0?'missing':'ambiguous',candidateCount:unique.length};
}

/** @lang zh-CN 排序仅用于已证明的同一partial语义符号，不使用宿主locale。 @lang en Orders only proven parts of the same semantic symbol, independently of host locale. */
function compareDeclarations(left,right){
  const a=left.member,b=right.member;
  const generated=Number(a.semantic.declaration.isGenerated)-Number(b.semantic.declaration.isGenerated);
  const aPath=a.source.path.replaceAll('\\','/'),bPath=b.source.path.replaceAll('\\','/');
  return generated || (aPath<bPath?-1:aPath>bPath?1:0) || a.source.range.start.line-b.source.range.start.line || (a.source.range.start.column??1)-(b.source.range.start.column??1);
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
    let referenceDiagnosticCodes = [];
    if (matches.length === 1) {
      const project = matches[0];
      const referenceDirectory=path.posix.dirname(record.input.path.replaceAll('\\','/'));
      const cacheKey=`${project.path}\n${referenceDirectory}`;
      if (!cache.has(cacheKey)) cache.set(cacheKey, await readProjectCandidates(project, request.workspaceRoot, referenceDirectory));
      const extracted=cache.get(cacheKey);
      discovered = extracted.candidates;
      referenceDiagnosticCodes=extracted.referenceDiagnosticCodes;
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
    const summary = { strategy: 'assembly-and-documentation-id', resolved: 0, ambiguous: 0, missing: 0, resolvedPartial: 0, referenceDiagnosticCodes };
    const members = [];
    // <lang><zh-CN>逐成员记录与计数在同一循环生成，避免诊断和source事实漂移。</zh-CN><en>Generate per-member records and counts in one loop to keep diagnostics aligned with source facts.</en></lang>
    const resolutions=[];
    for (const member of record.artifact.members) {
      const selected = selectExactDeclaration(member, byId.get(member.memberName) ?? [], assembly);
      if (selected.status !== 'resolved') { summary[selected.status] += 1; members.push(member); resolutions.push({status:selected.status,candidateCount:selected.candidateCount,reason:selected.status,detail:referenceDiagnosticCodes.length?'metadata-reference-or-project-unavailable':'no-unique-exact-declaration'}); continue; }
      const declaration = selected.declaration;
      try {
        await assertContainedFile(request.workspaceRoot, declaration.source.path);
        if (!/\.cs$/iu.test(declaration.source.path) || !validRange(declaration.source.range)) throw new Error('Not a bounded C# declaration');
        summary.resolved += 1;
        if(selected.selectionRule==='non-generated-path-line') summary.resolvedPartial+=1;
        members.push({ ...member, source: declaration.source, semantic: { ...member.semantic, ...declaration.semantic } });
        // <lang><zh-CN>只记录当前 Roslyn 事实的固定类别和错误存在性，映射不能凭 XML 或外来名称自行升格。</zh-CN><en>Record only the current Roslyn fact category and error presence, so maps cannot promote XML or foreign labels on their own.</en></lang>
        resolutions.push({status:'resolved',candidateCount:selected.candidateCount,selectionRule:selected.selectionRule,...(request.options?.writeDocSourceMapArtifact ? {sourceRangeSource:declaration.source.rangeSource,sourceHasErrors:(selected.origin?.diagnostics??[]).some(item=>item.severity==='error')} : {})});
      } catch { summary.missing += 1; members.push(member); resolutions.push({status:'missing',reason:'missing',detail:'unsafe-or-invalid-declaration-location',candidateCount:selected.candidateCount}); }
    }
    const document = dotnetXmlDocsToHiaDocument({ ...record.artifact, members }, { id: record.input.hiaDocumentId, title: record.input.title });
    document.metadata.sourceLocationResolution = summary;
    for(const [index,symbol] of document.symbols.entries()){
      const resolution=resolutions[index];
      symbol.metadata.dotnetdoc.sourceLocationResolution=resolution;
      if(resolution.status!=='resolved') symbol.diagnostics.push({code:resolution.status==='ambiguous'?'DOTNETDOC_SOURCE_LOCATION_AMBIGUOUS':'DOTNETDOC_SOURCE_LOCATION_MISSING',message:'No unique verified C# location is available for this documentation member.',severity:'warning',data:{symbolId:symbol.id,memberName:symbol.metadata.dotnetdoc.memberName,...resolution}});
    }
    if(summary.missing||summary.ambiguous) document.diagnostics.push({code:'DOTNETDOC_SOURCE_LOCATION_UNRESOLVED',message:'Some documentation members have no unique verified C# location; inspect member diagnostics and metadata.sourceLocationResolution.',severity:'warning',data:summary});
    record.hiaDocument = document;
    await writeFile(path.join(request.outputDirectory, record.hiaPath), `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    if (summary.missing || summary.ambiguous) diagnostics.push({ code: 'DOTNETDOC_SOURCE_LOCATION_UNRESOLVED', message: 'Some XML members have no unique C# declaration. Configure the matching project/source inputs and resolve missing references; XML origins are not exposed as code.', severity: 'warning', source: { path: record.input.path }, metadata: summary });
  }
  return diagnostics;
}

/** @lang zh-CN 从已有抽取结果取身份和定位，不复制方法体。 @lang en Selects identities/locators from existing extraction results without copying method bodies. */
function candidatesFrom(artifact) {
  return artifact.members.map(member => ({ member, assembly: artifact.assembly?.name ?? member.semantic?.containingAssembly, origin: artifact }));
}

/** @lang zh-CN 受限项目只读抽取；任何路径/工具失败都变为未定位，不泄露底层错误。 @lang en Performs bounded read-only project extraction, mapping path/tool failures to unresolved locations without leaking underlying errors. */
async function readProjectCandidates(project, root, referenceDirectory) {
  try {
    await assertContainedFile(root, project.path);
    // <lang><zh-CN>显式Compile条目先验证真实路径；SDK默认遍历不跟随symlink，项目根仍须在工作区内。</zh-CN><en>Validate real paths of explicit Compile items first; SDK enumeration does not follow symlinks and its project root must remain inside the workspace.</en></lang>
    for (const item of project.compileItems ?? []) {
      if (typeof item.include !== 'string' || !/\.cs$/iu.test(item.include)) continue;
      const sourcePath = path.posix.normalize(path.posix.join(path.posix.dirname(project.path), item.include.replaceAll('\\', '/')));
      await assertContainedFile(root, sourcePath);
    }
    const artifact=await extractDotnetSourceFiles({ workspaceRoot: root, projectPath: project.path, referenceDirectory });
    return {candidates:candidatesFrom(artifact),referenceDiagnosticCodes:[...new Set((artifact.diagnostics??[]).filter(item=>/^DOTNETDOC_(?:METADATA|FRAMEWORK)_REFERENCE/u.test(item.code)).map(item=>item.code))].sort()};
  } catch { return {candidates:[],referenceDiagnosticCodes:['DOTNETDOC_SOURCE_PROJECT_UNAVAILABLE']}; }
}

/** @lang zh-CN 双重路径包含检查，不读取越界symlink目标正文。 @lang en Checks lexical and real-path containment without reading bodies behind escaping symlinks. */
async function assertContainedFile(root, relative) {
  if (typeof relative !== 'string' || hasUnpairedSurrogate(relative) || relative.includes(':') || /^(?:[/\\]|[a-z][a-z0-9+.-]*:)/iu.test(relative) || relative.replaceAll('\\', '/').split('/').includes('..')) throw new Error('Unsafe source locator');
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
