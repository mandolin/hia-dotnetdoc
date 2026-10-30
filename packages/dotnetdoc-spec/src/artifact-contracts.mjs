/** @file 七种.NET领域产物的精确双版本schema/profile、纯读取与无损迁移；不读取URL/源码，不授予执行或公开权限。 @lang en Exact dual-version schemas/profiles, pure reading and lossless migration for seven .NET artifacts; never reads URLs/sources or grants execution/publication rights. */
import Ajv2020 from 'ajv/dist/2020.js';
import { createRequire } from 'node:module';
import { cloneDotnetDocJson } from './json-value.mjs';

/** 七个自有身份闭集，与npm包版本及主SDK身份分开。 @lang en Closed set of seven owned identities, independent from npm package and main SDK identities. */
export const DOTNETDOC_ARTIFACT_CONTRACTS = Object.freeze([
  'dotnetdoc-xml-doc-extraction', 'dotnetdoc-csharp-source-extraction', 'dotnetdoc-source-relation',
  'dotnetdoc-aspnet-endpoint-extraction', 'dotnetdoc-markup-comment-extraction', 'dotnetdoc-project-discovery',
  'dotnetdoc-build-warning-classification'
]);
/** 旧身份精确保留，禁止把draft视为任意版本范围。 @lang en Exact legacy identity, never interpreted as a version range. */
export const DOTNETDOC_LEGACY_ARTIFACT_VERSION = '0.1.0-draft';
/** 已确认B新增的稳定wire/profile身份。 @lang en Stable wire/profile identity introduced by confirmed option B. */
export const DOTNETDOC_ARTIFACT_VERSION = '1.0.0';
/** 每个已知身份只编译一次随包schema；不启用网络加载、coercion或defaults。 @lang en Compile bundled schemas once per known identity without network loading, coercion or defaults. */
const validators = new Map();
/** 固定公开失败不含Ajv原始路径、输入或getter异常。 @lang en Fixed public failure excludes raw Ajv paths, inputs and getter exceptions. */
const failure = 'DotNetDoc artifact must match an exact supported contract, version and JSON structure.';
/** 共用字段schema均描述现有静态数据，不承诺完整语言或运行时语义。 @lang en Shared field schemas describe existing static data without promising complete-language or runtime semantics. */
const text = { type: 'string' };
const nonempty = { type: 'string', minLength: 1 };
const nullableText = { type: ['string', 'null'] };
const object = { type: 'object' };
const strings = { type: 'array', items: text };
/** 传输层保留既有整数坐标和可省略列，不将未核XML出处当成可导航代码；精度/有效范围仍由专门源码地图层裁决。 @lang en Transport retains existing integer coordinates and optional columns without treating unverified XML provenance as navigable code; the dedicated source-map layer decides precision and valid ranges. */
const position = { type: 'object', required: ['line'], properties: { line: { type: 'integer' }, column: { type: 'integer' } } };
const range = { type: ['object', 'null'], required: ['start'], properties: { start: position, end: position } };
/** 公开locator仍为数据，不是文件读取授权；可选扩展字段保留但须通过普通JSON检查。 @lang en Locators remain data rather than file-read authorization; optional extensions are retained but must pass ordinary-JSON checks. */
const locator = { type: 'object', properties: { path: nonempty, language: text, range, confidence: text, rangeSource: text } };
const producer = { type: 'object', required: ['name', 'version'], properties: { name: nonempty, version: nonempty, engine: nonempty, engineVersion: nonempty } };
/** 编译器文本诊断允许只含起点；这不承诺可导航的完整代码范围。 @lang en Compiler text diagnostics may contain only a start point without promising a complete navigable code range. */
const diagnosticRange = { type: ['object', 'null'], required: ['start'], properties: { start: position, end: position } };
const diagnostic = { type: 'object', required: ['code', 'message', 'severity'], properties: { id: text, code: nonempty, message: text, severity: { enum: ['error', 'warning', 'info', 'hint'] }, path: nullableText, range: diagnosticRange } };
/** 成员文档正文/参数/异常属于允许的文档内容，不等于整份源码公开。 @lang en Member prose, parameters and exceptions are documentation content, distinct from publishing entire source files. */
const documentedValue = { type: 'object', properties: { name: text, summary: text, cref: nullableText } };
const member = { type: 'object', required: ['id', 'memberName', 'kind', 'name'], properties: { id: nonempty, memberName: nonempty, kind: nonempty, name: text, summary: text, remarks: text, returns: text, parameters: { type: 'array', items: documentedValue }, typeParameters: { type: 'array', items: documentedValue }, exceptions: { type: 'array', items: documentedValue }, see: { type: 'array' }, seeAlso: { type: 'array' }, i18n: object, semantic: object, signature: text, source: locator } };
/** 现有隐私标志不能被新旧reader接受为“已嵌入源码”。 @lang en Existing privacy flags cannot be accepted by either reader as permission to embed source text. */
const privacy = { type: 'object', properties: { sourcesContentPolicy: { const: 'none' }, sourcePreviewPolicy: { const: 'none' }, embedsSourcesContent: { const: false } } };
const identityPolicy = { type: 'object', properties: { policy: { const: 'project-relative-owner-resolved' }, pathKind: { const: 'project-relative' }, absolutePathInIdentity: { const: false }, displayLabelInIdentity: { const: false }, localeInIdentity: { const: false } } };
/** 各领域的必要集合固定现有结构；扩展JSON可保留，跨对象业务一致性仍由生成器/宿主语义检查负责。 @lang en Required collections fix existing structures while retaining JSON extensions; producers/host semantic checks remain responsible for cross-object domain consistency. */
const payloads = {
  'dotnetdoc-xml-doc-extraction': { required: ['source', 'assembly', 'members'], properties: { source: locator, assembly: { type: 'object', properties: { name: nullableText } }, members: { type: 'array', items: member } } },
  'dotnetdoc-csharp-source-extraction': { required: ['source', 'assembly', 'members'], properties: { source: { type: 'object', required: ['files'], properties: { files: { type: 'array', items: locator } } }, assembly: { type: 'object', properties: { name: nullableText } }, members: { type: 'array', items: member } } },
  'dotnetdoc-source-relation': { required: ['source', 'relations', 'unresolved', 'privacy', 'identityPolicy'], properties: { source: object, relations: { type: 'array', items: { type: 'object', required: ['id', 'relation', 'documentation', 'declaration'], properties: { id: nonempty, relation: { const: 'documents-declaration' }, documentation: locator, declaration: locator } } }, unresolved: { type: 'array', items: object }, privacy, identityPolicy } },
  'dotnetdoc-aspnet-endpoint-extraction': { required: ['source', 'endpoints', 'summary'], properties: { source: object, endpoints: { type: 'array', items: { type: 'object', required: ['id', 'kind', 'route', 'httpMethods', 'routable', 'source'], properties: { id: nonempty, kind: nonempty, framework: nonempty, route: { type: 'object', properties: { template: nullableText, normalizedPath: nullableText } }, httpMethods: strings, routable: { type: 'boolean' }, handler: object, source: locator, metadata: object } } } } },
  'dotnetdoc-markup-comment-extraction': { required: ['source', 'comments', 'privacy'], properties: { source: object, comments: { type: 'array', items: { type: 'object', required: ['id', 'kind', 'content', 'commentKind', 'source'], properties: { id: nonempty, kind: { const: 'dotnet-markup-comment' }, content: text, commentKind: nonempty, source: locator, i18n: object, summary: text, visibility: text } } }, privacy } },
  'dotnetdoc-project-discovery': { required: ['source', 'projects', 'solutions', 'privacy', 'identityPolicy'], properties: { source: object, projects: { type: 'array', items: { type: 'object', required: ['id', 'path', 'identity', 'targetFrameworks'], properties: { id: nonempty, path: nonempty, identity: { type: 'object', required: ['id', 'path', 'policy'], properties: { id: nonempty, path: nonempty, policy: { const: 'project-relative-owner-resolved' } } }, targetFrameworks: strings, source: locator } } }, solutions: { type: 'array', items: { type: 'object', required: ['id', 'path', 'projects'], properties: { id: nonempty, path: nonempty, projects: { type: 'array', items: object } } } }, privacy, identityPolicy } },
  'dotnetdoc-build-warning-classification': { required: ['policy', 'summary'], properties: { policy: { type: 'object', required: ['name', 'version'], properties: { name: { const: 'dotnetdoc-generated-designer-warning-policy' }, version: { enum: ['0.1.0-draft', '1.0.0'] }, sourcesContentPolicy: { const: 'none' } } } } }
};
/** 私有schema集合通过函数暴露精确身份，不能用调用者传入URL加载远端schema。 @lang en Private schema set exposes exact identities through functions and never loads a caller-supplied schema URL. */
const schemas = new Map();
/** 旧schema资源在本模块初始化时从随包闭集加载，不由新payload定义重新生成历史。 @lang en Load the closed set of bundled legacy schemas at module initialization, never regenerating history from current payload definitions. */
const require = createRequire(import.meta.url);
for (const contract of DOTNETDOC_ARTIFACT_CONTRACTS) {
  for (const version of [DOTNETDOC_LEGACY_ARTIFACT_VERSION, DOTNETDOC_ARTIFACT_VERSION]) {
    if (version === DOTNETDOC_LEGACY_ARTIFACT_VERSION) {
      // <lang><zh-CN>合同名称来自内部七项闭集，不能让调用方控制文件路径或远端URL。</zh-CN><en>Contract names come from the internal seven-item set, never caller-controlled paths or remote URLs.</en></lang>
      schemas.set(`${contract}@${version}`, freezeSchema(require(`./schemas/${contract}-${version}.schema.json`)));
      continue;
    }
    // <lang><zh-CN>每种身份拥有独立资源ID；根字段闭集身份精确，扩展内容仍保留为普通JSON。</zh-CN><en>Each identity has a distinct resource ID; root identity fields are exact while extension contents remain ordinary JSON.</en></lang>
    const id = `https://mandolin.github.io/HIA-Documentation/schemas/${contract}-${version}.schema.json`;
    const payload = payloads[contract];
    schemas.set(`${contract}@${version}`, freezeSchema({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: id,
      $comment: '中文：已确认静态领域产物的精确版本与传输结构，不授权源码读取/执行或精确导航。 English: Exact version and transport structure for the confirmed static domain artifact, without authorizing source reads/execution or exact navigation.',
      title: `${contract} ${version}`,
      type: 'object',
      required: ['contract', 'contractVersion', 'producer', 'diagnostics', ...payload.required],
      properties: {
        contract: { const: contract },
        contractVersion: { const: version },
        $schema: { const: id },
        producer,
        diagnostics: { type: 'array', items: diagnostic },
        defaultLocale: nonempty,
        locales: strings,
        summary: object,
        ...payload.properties
      }
    }));
  }
}

/**
 * 选择精确合同/版本或对应schema ID，不读取URL。
 * @lang en Selects an exact contract/version or matching schema ID without reading URLs.
 * @param {string} contract <lang><zh-CN>七种已知合同名称之一。</zh-CN><en>One of the seven known contract names.</en></lang>
 * @param {string} identity <lang><zh-CN>精确旧/新版本或该合同schema ID。</zh-CN><en>Exact old/new version or that contract's schema ID.</en></lang>
 * @returns {object|undefined} <lang><zh-CN>随包schema；未知或错配返回undefined。</zh-CN><en>Bundled schema; undefined for unknown or mismatched identities.</en></lang>
 */
export function getDotnetDocArtifactSchema(contract, identity) {
  if (!DOTNETDOC_ARTIFACT_CONTRACTS.includes(contract)) return undefined;
  for (const version of [DOTNETDOC_LEGACY_ARTIFACT_VERSION, DOTNETDOC_ARTIFACT_VERSION]) {
    // <lang><zh-CN>只比较相同合同的两种精确身份，不猜兼容版本范围。</zh-CN><en>Compare only two exact identities for the same contract, never guessing a compatible version range.</en></lang>
    const schema = schemas.get(`${contract}@${version}`);
    if (identity === version || identity === schema.$id) return schema;
  }
  return undefined;
}

/**
 * 深冻结内部无环schema，防止公开嵌套属性被改写后影响读取。
 * @lang en Deep-freezes internal acyclic schemas so public nested-property mutations cannot change later reads.
 * @param {object} value <lang><zh-CN>本模块构造的数据对象/数组。</zh-CN><en>Data object/array constructed by this module.</en></lang>
 * @returns {object} <lang><zh-CN>原只读对象，共享子节点只冻结一次。</zh-CN><en>Original read-only object, freezing shared children only once.</en></lang>
 */
function freezeSchema(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  // <lang><zh-CN>只遍历内部schema数据，先冻结子节点再冻结根。</zh-CN><en>Traverse only internal schema data, freezing children before the root.</en></lang>
  for (const child of Object.values(value)) freezeSchema(child);
  return Object.freeze(value);
}

/**
 * 获取既有静态能力的版本化profile，不改变产物内容或授予执行能力。
 * @lang en Gets a versioned profile for existing static capabilities without changing artifacts or granting execution.
 * @param {string} contract <lang><zh-CN>已知领域合同。</zh-CN><en>Known domain contract.</en></lang>
 * @param {string} identity <lang><zh-CN>精确版本或schema ID。</zh-CN><en>Exact version or schema ID.</en></lang>
 * @returns {object|undefined} <lang><zh-CN>只读profile或undefined；不是完整编译/运行时端点承诺。</zh-CN><en>Read-only profile or undefined, without full-compilation/runtime-endpoint promises.</en></lang>
 */
export function getDotnetDocArtifactProfile(contract, identity) {
  // <lang><zh-CN>schema选择与profile使用同一精确版本裁决，避免跨版本默认。</zh-CN><en>Profile and schema selection share the same exact-version decision without cross-version defaults.</en></lang>
  const schema = getDotnetDocArtifactSchema(contract, identity);
  return schema ? Object.freeze({ id: contract, contract, version: schema.properties.contractVersion.const, schemaId: schema.$id, analysis: 'static', runtimeDiscovery: false, inputProjectBuild: false }) : undefined;
}

/**
 * 精确读取两代普通JSON产物并保留调用方对象身份，不迁移、不执行或读取源码。
 * @lang en Reads two exact generations of ordinary-JSON artifacts while retaining caller object identity, without migration, execution or source reads.
 * @param {unknown} value <lang><zh-CN>普通JSON工件，扩展字段也不得含非JSON行为。</zh-CN><en>Ordinary-JSON artifact, including behavior-free JSON extensions.</en></lang>
 * @returns {object} <lang><zh-CN>原对象，不修改内容。</zh-CN><en>The original object with no content modifications.</en></lang>
 * @throws {TypeError} <lang><zh-CN>未知/错配身份、结构或非JSON被固定消息拒绝；不验证任意metadata可公开性。</zh-CN><en>Fixed refusal for unknown/mismatched identities, shapes or non-JSON; does not certify arbitrary metadata as public-safe.</en></lang>
 */
export function readDotnetDocArtifact(value) {
  try {
    // <lang><zh-CN>验证副本避免Ajv触发getter或修改输入，原对象只在通过后返回。</zh-CN><en>Validate a copy so Ajv cannot invoke getters or modify input, returning the original only on success.</en></lang>
    const json = cloneDotnetDocJson(value);
    const schema = getDotnetDocArtifactSchema(json?.contract, json?.contractVersion);
    if (!schema) throw new TypeError(failure);
    const key = `${json.contract}@${json.contractVersion}`;
    if (!validators.has(key)) validators.set(key, new Ajv2020({ strict: false, allErrors: true }).compile(schema));
    if (!validators.get(key)(json)) throw new TypeError(failure);
    return value;
  } catch { throw new TypeError(failure); }
}

/**
 * 将精确旧工件显式迁移成新对象，只更新根合同/schema身份，保留生成来源与其引用的旧工件版本。
 * @lang en Explicitly migrates an exact legacy artifact into a new object, updating only root contract/schema identity while retaining production provenance and referenced legacy artifact versions.
 * @param {unknown} value <lang><zh-CN>精确旧工件，不接受已迁移/未知版本。</zh-CN><en>Exact legacy artifact; already-migrated/unknown versions are rejected.</en></lang>
 * @returns {object} <lang><zh-CN>已通过新版读取的新对象，不改输入或执行I/O。</zh-CN><en>Fresh object accepted by current reading, without input mutation or I/O.</en></lang>
 * @throws {TypeError} <lang><zh-CN>两代校验或JSON无损条件不满足时固定拒绝。</zh-CN><en>Fixed refusal when either generation's validation or lossless-JSON conditions fail.</en></lang>
 */
export function migrateDotnetDocArtifact(value) {
  try {
    // <lang><zh-CN>先冻结调用方数据视图，要求旧身份，再验证目标；不静默重算领域数据。</zh-CN><en>Copy caller data, require the legacy identity and validate the target, never silently recomputing domain data.</en></lang>
    const json = cloneDotnetDocJson(value);
    if (json?.contractVersion !== DOTNETDOC_LEGACY_ARTIFACT_VERSION) throw new TypeError(failure);
    readDotnetDocArtifact(json);
    json.contractVersion = DOTNETDOC_ARTIFACT_VERSION;
    if (json.$schema !== undefined) json.$schema = getDotnetDocArtifactSchema(json.contract, json.contractVersion).$id;
    readDotnetDocArtifact(json);
    return json;
  } catch { throw new TypeError(failure); }
}
