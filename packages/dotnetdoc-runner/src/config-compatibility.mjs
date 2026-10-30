/** @file 两代.NET配置的精确身份/新schema验证与纯迁移辅助；旧运行语义由runner纯规范化继续裁决。 @lang en Exact identity/current-schema validation and pure migration support for two .NET config generations; the runner's pure normalization retains authority over legacy runtime semantics. */
import Ajv2020 from 'ajv/dist/2020.js';
import { cloneDotnetDocJson } from '@hia-doc/dotnetdoc-spec';
import { DOTNETDOC_CONFIG_JSON_SCHEMA, DOTNETDOC_CONFIG_SCHEMA_ID } from './schema.mjs';
import { DOTNETDOC_CONFIG_JSON_SCHEMA as legacySchema, DOTNETDOC_CONFIG_SCHEMA_ID as legacyId } from './schema-legacy.mjs';

/** 固定失败不回显文件名、原始配置或validator错误。 @lang en Fixed failure without echoing filenames, raw config or validator errors. */
const failure = 'DotNetDoc config must match an exact supported identity and structure.';
/** 当前schema仅本地编译，不启用coercion/defaults/删除扩展或远端schema。 @lang en Compile only the current local schema without coercion, defaults, extension removal or remote schemas. */
const validateCurrent = new Ajv2020({ strict: false, allErrors: true }).compile(DOTNETDOC_CONFIG_JSON_SCHEMA);

/**
 * 选择精确新/旧配置schema；旧schema原required保留，不宣称它覆盖运行时省略默认。
 * @lang en Selects exact current/legacy config schemas, preserving original legacy required fields without claiming they cover runtime omission defaults.
 * @param {string} identity <lang><zh-CN>精确版本或schema ID。</zh-CN><en>Exact version or schema ID.</en></lang>
 * @returns {object|undefined} <lang><zh-CN>对应schema，未知返回undefined；不访问网络。</zh-CN><en>Matching schema, or undefined for unknown identities; no network access.</en></lang>
 */
export function getDotnetDocConfigSchema(identity) {
  if (identity === '1.0.0' || identity === DOTNETDOC_CONFIG_SCHEMA_ID) return DOTNETDOC_CONFIG_JSON_SCHEMA;
  if (identity === '0.1.0-draft' || identity === legacyId) return legacySchema;
  return undefined;
}

/**
 * 验证JSON与精确schema配对；新版本按schema，旧版由调用者继续按原运行语义校验。
 * @lang en Validates JSON and exact schema pairing, checking current schema while leaving legacy runtime validation to the caller.
 * @param {unknown} value <lang><zh-CN>候选配置，不执行访问器。</zh-CN><en>Candidate config, with no accessor execution.</en></lang>
 * @returns {object} <lang><zh-CN>独立JSON视图，调用方不得当作已执行请求。</zh-CN><en>Independent JSON view, never an executed request.</en></lang>
 * @throws {TypeError} <lang><zh-CN>未知/错配/非JSON或新结构错误时固定拒绝。</zh-CN><en>Fixed refusal for unknown/mismatched/non-JSON/current-structure errors.</en></lang>
 */
export function inspectDotnetDocConfig(value) {
  try {
    // <lang><zh-CN>先复制才能安全读取版本与$schema；不触发用户getter或JSON钩子。</zh-CN><en>Copy before reading version/$schema, avoiding user getters and JSON hooks.</en></lang>
    const json = cloneDotnetDocJson(value);
    const schema = getDotnetDocConfigSchema(json?.schemaVersion);
    if (!schema || (json.$schema !== undefined && json.$schema !== schema.$id)) throw new TypeError(failure);
    if (json.schemaVersion === '1.0.0' && !validateCurrent(json)) throw new TypeError(failure);
    return json;
  } catch { throw new TypeError(failure); }
}
