/**
 * @file
 * @lang zh-CN 只从本次 DotNetDoc 抽取与已核 HIA 声明构造独立文档源码映射，不读取代码正文或推断 XML 位置。
 * @lang en Builds an independent documentation source map only from this DotNetDoc extraction and verified HIA declarations, without reading source bodies or inferring XML positions.
 */

/** @lang zh-CN 独立映射产物身份，与 runner 包版本分离。 @lang en Independent map artifact identity, separate from the runner package version. */
export const DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION = '1.1.0';
const XML_CONTRACT = 'dotnetdoc-xml-doc-extraction';
const CSHARP_CONTRACT = 'dotnetdoc-csharp-source-extraction';
const EXACT_CONVENTION = Object.freeze({ endBoundary: 'exclusive', columnUnit: 'utf16-code-unit' });
const UNKNOWN_CONVENTION = Object.freeze({ endBoundary: 'unknown', columnUnit: 'unknown' });

/**
 * @lang zh-CN 纯数据地构造单个 HIA 文档的源码映射；只有 runner 已核真实路径的 Roslyn 范围可成为代码引用。
 * @lang en Purely builds a source map for one HIA document; only Roslyn ranges with runner-verified real paths can become code references.
 * @param {{record: object, verifiedSourcePaths: Set<string>, producerVersion: string}} options <lang><zh-CN>本次抽取记录、可信调用方已用真实路径核验的工作区相对路径断言，以及实际 runner 包版本。纯函数本身只做词法拒绝，不做 realpath I/O。</zh-CN><en>Current extraction record, workspace-relative paths asserted as real-path verified by the trusted caller, and actual runner package version. This pure function applies lexical rejection only; it does not perform realpath I/O.</en></lang>
 * @returns {object} <lang><zh-CN>无源码正文的 `doc-source-map@1.1.0` 工件。</zh-CN><en>A source-body-free `doc-source-map@1.1.0` artifact.</en></lang>
 * @throws {TypeError} <lang><zh-CN>非成员抽取、缺少工件或不安全输出路径被拒绝。</zh-CN><en>Rejects non-member extraction, missing artifacts, and unsafe output paths.</en></lang>
 */
export function createDotnetDocSourceMap({ record, verifiedSourcePaths, producerVersion }) {
  if (![XML_CONTRACT, CSHARP_CONTRACT].includes(record?.artifact?.contract) || !Array.isArray(record?.hiaDocument?.symbols)
    || !Array.isArray(record?.artifact?.members) || record.artifact.members.length !== record.hiaDocument.symbols.length
    || !(verifiedSourcePaths instanceof Set) || typeof producerVersion !== 'string' || !producerVersion || hasUnpairedSurrogate(producerVersion)) {
    throw new TypeError('DotNetDoc source map requires a member extraction and HIA document.');
  }
  // <lang><zh-CN>在任何 URI 编码前检查全部成员身份；不接受损坏的 UTF-16，也不把非法身份隐式修复。</zh-CN><en>Check every member identity before URI encoding; reject malformed UTF-16 rather than silently repairing it.</en></lang>
  if (record.hiaDocument.symbols.some(symbol => typeof symbol?.id !== 'string' || hasUnpairedSurrogate(symbol.id))) {
    throw new TypeError('Unsafe DotNetDoc map member identity.');
  }
  const extractionPath = safePath(record.artifactPath);
  const documentPath = safePath(record.hiaPath);
  const extractionId = `artifact:dotnetdoc:${encodeURIComponent(extractionPath)}`;
  const documentId = `artifact:hia:${encodeURIComponent(documentPath)}`;
  const sources = new Map();

  // <lang><zh-CN>每个符号按数组序号建立可逆身份，防止重载、程序集或压缩 slug 相撞。</zh-CN><en>Array ordinals give symbols reversible identities without overload, assembly, or collapsed-slug collisions.</en></lang>
  const entries = record.hiaDocument.symbols.map((symbol, index) => {
    const sourceRefs = [];
    const location = symbol?.source?.definedIn;
    const resolution = symbol?.metadata?.dotnetdoc?.sourceLocationResolution;
    const rawMember = record.artifact.members?.[index];
    const exactXml = record.artifact.contract === XML_CONTRACT && resolution?.status === 'resolved'
      && rawMember?.id === symbol.id && rawMember?.memberName === symbol?.metadata?.dotnetdoc?.memberName;
    const exactCsharp = record.artifact.contract === CSHARP_CONTRACT
      && rawMember?.id === symbol.id
      && rawMember?.source?.path?.replaceAll('\\', '/') === location?.relativePath
      && JSON.stringify(rawMember?.source?.range) === JSON.stringify(location?.range)
      && record.artifact.producer?.name === '@hia-doc/dotnet-source-extractor'
      && record.artifact.producer?.engine === 'roslyn';
    const sourceRangeSource = exactXml ? resolution?.sourceRangeSource : exactCsharp ? rawMember?.source?.rangeSource : null;
    const recovered = exactXml ? resolution?.sourceHasErrors === true : (record.artifact.diagnostics ?? []).some(item => item.severity === 'error');
    const range = boundedRange(location?.range);
    const relativePath = typeof location?.relativePath === 'string' ? location.relativePath.replaceAll('\\', '/') : '';

    // <lang><zh-CN>XML 文本、文件名回退及越根路径都不产生代码 sourceRef；损坏解析的范围保留事实但精度未知。</zh-CN><en>XML text, filename fallbacks, and escaping paths produce no code sourceRef; recovered syntax may retain a range only with unknown precision.</en></lang>
    if ((exactXml || exactCsharp) && location?.language === 'csharp' && sourceRangeSource === 'roslyn-syntax' && range && safeSourcePath(relativePath) && verifiedSourcePaths.has(relativePath)) {
      const sourceId = `source:csharp:${encodeURIComponent(relativePath)}`;
      if (!sources.has(sourceId)) {
        sources.set(sourceId, { id: sourceId, kind: 'csharp-source', path: relativePath, language: 'csharp', role: 'original', sourcesContentPolicy: 'none' });
      }
      const known = !recovered && isPositiveColumnRange(range);
      sourceRefs.push({
        sourceId,
        range,
        rangeConvention: known ? { ...EXACT_CONVENTION } : { ...UNKNOWN_CONVENTION },
        rangeSource: 'compiler',
        rangeSourceDetail: known ? 'roslyn-syntax' : 'roslyn-syntax-unverified',
        confidence: known ? 'medium' : 'low'
      });
    }

    // <lang><zh-CN>诊断仅使用固定公开安全文案；不复用 XML 注释、异常文本或外来 producer 名称。</zh-CN><en>Diagnostics use fixed public-safe text rather than XML comments, exception text, or foreign producer names.</en></lang>
    return {
      id: `entry:${encodeURIComponent(documentPath)}:${index}`,
      kind: 'symbol',
      symbolId: symbol.id,
      symbolKind: symbol.kind,
      sourceRefs,
      artifactRefs: [
        { artifactId: extractionId, rangeSource: 'adapter', confidence: 'high' },
        { artifactId: documentId, rangeSource: 'adapter', confidence: 'high' }
      ],
      diagnostics: sourceRefs.length ? [] : [{ code: 'DOTNETDOC_SOURCE_MAP_CODE_LOCATION_UNAVAILABLE', message: 'No verified C# declaration range is available for this member.', severity: 'warning' }]
    };
  });

  return {
    contract: 'doc-source-map',
    contractVersion: DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION,
    id: `docmap:dotnetdoc:${encodeURIComponent(documentPath)}`,
    producer: { name: '@hia-doc/dotnetdoc-runner', version: producerVersion },
    artifacts: [
      { id: extractionId, kind: 'extraction-artifact', path: extractionPath, format: 'json', role: 'generated', contractRefs: [{ contract: record.artifact.contract, contractVersion: record.artifact.contractVersion, path: extractionPath }] },
      { id: documentId, kind: 'hia-document', path: documentPath, format: 'json', role: 'generated' }
    ],
    sources: [...sources.values()],
    sourceMaps: [],
    chains: [],
    entries,
    privacy: { sourcesContentPolicy: 'none', allowAbsolutePaths: false, allowUncPaths: false, allowPathTraversal: false },
    diagnostics: []
  };
}

/**
 * @lang zh-CN 检查字符串是否含孤立 UTF-16 代理项，避免可逆 URI 编码抛出原生异常。
 * @lang en Detects unpaired UTF-16 surrogates before reversible URI encoding can throw a raw exception.
 * @param {string} value <lang><zh-CN>待编码的路径或身份文本。</zh-CN><en>Path or identity text to be encoded.</en></lang>
 * @returns {boolean} <lang><zh-CN>存在孤立代理项时为 true。</zh-CN><en>True when an unpaired surrogate is present.</en></lang>
 */
export function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xD800 && code <= 0xDBFF) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xDC00 && next <= 0xDFFF)) return true;
      index += 1;
    } else if (code >= 0xDC00 && code <= 0xDFFF) {
      return true;
    }
  }
  return false;
}

/**
 * @lang zh-CN 限制工件引用为安全、可编码的相对路径。
 * @lang en Restricts artifact references to safe, encodable relative paths.
 * @param {unknown} value <lang><zh-CN>候选工件路径。</zh-CN><en>Candidate artifact path.</en></lang>
 * @returns {string} <lang><zh-CN>统一斜杠的安全相对路径。</zh-CN><en>Safe relative path with normalized slashes.</en></lang>
 * @throws {TypeError} <lang><zh-CN>绝对路径、上级跳转、冒号或孤立代理项被拒绝。</zh-CN><en>Rejects absolute paths, traversal, colons, and unpaired surrogates.</en></lang>
 */
function safePath(value) {
  if (typeof value !== 'string' || !value || hasUnpairedSurrogate(value) || value.includes(':') || /^(?:[/\\]|[a-z][a-z0-9+.-]*:)/iu.test(value) || value.replaceAll('\\', '/').split('/').includes('..')) throw new TypeError('Unsafe DotNetDoc map artifact path.');
  return value.replaceAll('\\', '/');
}

/**
 * @lang zh-CN C# 原文件引用再限制扩展名与工作区相对形式；真实路径核验仍由可信调用方负责。
 * @lang en Further restricts C# source references by extension and workspace-relative form; the trusted caller remains responsible for real-path verification.
 * @param {unknown} value <lang><zh-CN>候选源码相对路径。</zh-CN><en>Candidate relative source path.</en></lang>
 * @returns {boolean} <lang><zh-CN>路径词法安全时为 true。</zh-CN><en>True when the path is lexically safe.</en></lang>
 */
function safeSourcePath(value) {
  return typeof value === 'string' && /\.cs$/iu.test(value) && value !== '' && !hasUnpairedSurrogate(value) && !value.includes(':') && !/^(?:[/\\]|[a-z][a-z0-9+.-]*:)/iu.test(value) && !value.split('/').includes('..');
}

/**
 * @lang zh-CN 复制完整有序的一基范围，不借 HIA position 的缺省列。
 * @lang en Copies a complete ordered one-based range without borrowing a default column from HIA position.
 * @param {unknown} value <lang><zh-CN>候选声明范围。</zh-CN><en>Candidate declaration range.</en></lang>
 * @returns {object|null} <lang><zh-CN>有效一基范围或 null。</zh-CN><en>Valid one-based range or null.</en></lang>
 */
function boundedRange(value) {
  const start = value?.start;
  const end = value?.end;
  if (!Number.isSafeInteger(start?.line) || start.line < 1 || !Number.isSafeInteger(end?.line) || end.line < start.line) return null;
  if (start.column !== undefined && (!Number.isSafeInteger(start.column) || start.column < 1)) return null;
  if (end.column !== undefined && (!Number.isSafeInteger(end.column) || end.column < 1)) return null;
  if (end.line === start.line && start.column !== undefined && end.column !== undefined && end.column < start.column) return null;
  return { start: { line: start.line, ...(start.column === undefined ? {} : { column: start.column }) }, end: { line: end.line, ...(end.column === undefined ? {} : { column: end.column }) } };
}

/**
 * @lang zh-CN 只有完整列且严格正长度的范围可采用已证排除终点/UTF-16 约定。
 * @lang en Only complete-column, strictly positive ranges may use the proven exclusive/UTF-16 convention.
 * @param {object} range <lang><zh-CN>已核的一基范围。</zh-CN><en>Validated one-based range.</en></lang>
 * @returns {boolean} <lang><zh-CN>范围有完整列且长度为正时为 true。</zh-CN><en>True when columns are complete and the span has positive length.</en></lang>
 */
function isPositiveColumnRange(range) {
  return Number.isSafeInteger(range.start.column) && Number.isSafeInteger(range.end.column)
    && (range.end.line > range.start.line || range.end.column > range.start.column);
}
