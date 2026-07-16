export const DOTNETDOC_CONFIG_SCHEMA_VERSION = "0.1.0-draft";
export const DOTNETDOC_CONFIG_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/dotnetdoc-config-0.1.0-draft.schema.json";

const relativePath = {
  type: "string",
  minLength: 1,
  not: {
    anyOf: [
      { pattern: "^(?:[A-Za-z]:|/|\\\\|[A-Za-z][A-Za-z0-9+.-]*:)" },
      { pattern: "(?:^|[\\\\/])\\.\\.(?:[\\\\/]|$)" }
    ]
  }
};

export const DOTNETDOC_CONFIG_JSON_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOTNETDOC_CONFIG_SCHEMA_ID,
  title: "DotNetDoc Config",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "workspaceRoot", "outputDirectory", "inputs"],
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
        required: ["kind", "path"],
        properties: {
          kind: { enum: ["dotnet-xml-doc", "dotnet-csharp-source", "dotnet-aspnet-surface"] },
          path: relativePath,
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
        writeSourceRelationArtifact: { type: "boolean" }
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
