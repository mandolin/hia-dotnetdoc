/** @file @lang zh-CN 运行器纯元数据，含版本及冻结输入/输出种类。 @lang en Pure runner metadata containing its version and frozen input/output kinds. */

/** @lang zh-CN 显式.NET/XML/C#/ASP.NET/标记/项目输入种类；列出能力不授予执行目标项目的权限。 @lang en Explicit .NET/XML/C#/ASP.NET/markup/project input kinds; listing capabilities grants no permission to execute targets. */
export const DOTNETDOC_INPUT_KINDS = Object.freeze(["dotnet-xml-doc", "dotnet-csharp-source", "dotnet-aspnet-surface", "dotnet-markup-comments", "dotnet-project"]);

/** @lang zh-CN 运行器可能产出的工件种类；具体清单仅以每次成功构建的实际结果为准。 @lang en Artifact kinds the runner may produce; each successful build's actual result is authoritative for its concrete manifest. */
export const DOTNETDOC_OUTPUT_KINDS = Object.freeze(["dotnetdoc-extraction", "hia-document", "doc-source-map", "dotnetdoc-source-relation", "dotnetdoc-aspnet-endpoint-extraction", "dotnetdoc-markup-comment-extraction", "dotnetdoc-project-discovery"]);

/**
 * @lang zh-CN DotNetDoc runner/producer公开包版本，与领域工件、配置及主SDK各自身份分开。
 * @lang en Public DotNetDoc runner/producer package version, independent from domain-artifact, config and main SDK identities.
 */
export const DOTNETDOC_RUNNER_VERSION = "1.0.0";
