/** @file 已确认B的新配置schema；原schema完整保留在schema-legacy.mjs，读取/迁移不原位放宽历史。 @lang en Confirmed B current config schema; the original remains intact in schema-legacy.mjs and reading/migration never loosens history in place. */
/** 新配置精确版本，独立于npm与领域工件身份。 @lang en Exact current config version, independent from npm and domain-artifact identities. */
export const DOTNETDOC_CONFIG_SCHEMA_VERSION = "1.0.0";
/** 稳定资源ID，不代表已发布到网络，也不会被loader下载。 @lang en Stable resource ID, neither a claim of online publication nor a loader download target. */
export const DOTNETDOC_CONFIG_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/dotnetdoc-config-1.0.0.schema.json";

const relativePath = {
  type: "string",
  minLength: 1,
  not: {
    anyOf: [
      { pattern: "^(?:[A-Za-z]:|/|\\\\|[A-Za-z][A-Za-z0-9+.-]*:)" },
      { pattern: ":" },
      { pattern: "(?:^|[\\\\/])\\.\\.(?:[\\\\/]|$)" }
    ]
  }
};

const relativePathArray = {
  type: "array",
  minItems: 1,
  items: relativePath
};

/** 保留五种显式输入和原目录默认；省略目录允许，显式null仍拒绝。 @lang en Retains five explicit input kinds and original directory defaults; omissions are allowed while explicit null is rejected. */
export const DOTNETDOC_CONFIG_JSON_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOTNETDOC_CONFIG_SCHEMA_ID,
  $comment: "中文：当前配置保留目录省略默认、要求显式输入kind并拒绝null；验证不授权执行。 English: Current config retains omission defaults, requires explicit input kinds and rejects null; validation grants no execution permission.",
  title: "DotNetDoc Config",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "inputs"],
  properties: {
    $schema: { const: DOTNETDOC_CONFIG_SCHEMA_ID },
    schemaVersion: { const: DOTNETDOC_CONFIG_SCHEMA_VERSION },
    workspaceRoot: relativePath,
    outputDirectory: relativePath,
    inputs: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind"],
        anyOf: [
          { required: ["path"] },
          { required: ["paths"] },
          { required: ["projectPath"] },
          { required: ["glob"] },
          { required: ["globs"] }
        ],
        properties: {
          kind: { enum: ["dotnet-xml-doc", "dotnet-csharp-source", "dotnet-aspnet-surface", "dotnet-markup-comments", "dotnet-project"] },
          path: relativePath,
          paths: relativePathArray,
          projectPath: relativePath,
          glob: relativePath,
          globs: relativePathArray,
          excludeGlobs: relativePathArray,
          applicationRoot: relativePath,
          artifactBasePath: relativePath,
          hiaDocumentId: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 }
        }
      }
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        writeResultManifest: { type: "boolean" },
        writeSourceRelationArtifact: { type: "boolean" },
        writeDocSourceMapArtifact: { type: "boolean" }
      }
    },
    profileIds: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", pattern: "^[a-z0-9][a-z0-9._-]*$" }
    }
  }
});
