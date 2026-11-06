/** @file @lang zh-CN 包内冻结数组纯数据定义，无导入和运行器副作用。 @lang en Owner-local frozen-array plain-data definitions without imports or runner side effects. */

/** @lang zh-CN 显式.NET/XML/C#/ASP.NET/标记/项目输入种类；列出能力不授予执行目标项目的权限。 @lang en Explicit .NET/XML/C#/ASP.NET/markup/project input kinds; listing capabilities grants no permission to execute targets. */
export const DOTNETDOC_INPUT_KINDS = Object.freeze(["dotnet-xml-doc", "dotnet-csharp-source", "dotnet-aspnet-surface", "dotnet-markup-comments", "dotnet-project"]);

/** @lang zh-CN 运行器可能产出的工件种类；具体清单仅以每次成功构建的实际结果为准。 @lang en Artifact kinds the runner may produce; each successful build's actual result is authoritative for its concrete manifest. */
export const DOTNETDOC_OUTPUT_KINDS = Object.freeze(["dotnetdoc-extraction", "hia-document", "doc-source-map", "dotnetdoc-source-relation", "dotnetdoc-aspnet-endpoint-extraction", "dotnetdoc-markup-comment-extraction", "dotnetdoc-project-discovery"]);
