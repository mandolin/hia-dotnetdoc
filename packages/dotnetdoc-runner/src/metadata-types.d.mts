/** @file @lang zh-CN 运行器纯元数据子入口的精确类型，与旧根声明相同。 @lang en Exact types of the pure runner metadata subpath, matching existing root declarations. */
/** @lang zh-CN 独立的精确版本身份，不用于推断其它契约版本（DOTNETDOC_RUNNER_VERSION）。 @lang en Exact DOTNETDOC_RUNNER_VERSION registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_RUNNER_VERSION: "1.0.0";
/** @lang zh-CN 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_INPUT_KINDS）。 @lang en Exact DOTNETDOC_INPUT_KINDS registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_INPUT_KINDS: readonly ["dotnet-xml-doc","dotnet-csharp-source","dotnet-aspnet-surface","dotnet-markup-comments","dotnet-project"];
/** @lang zh-CN 当前支持的固定登记集合，不推断额外语法（DOTNETDOC_OUTPUT_KINDS）。 @lang en Exact DOTNETDOC_OUTPUT_KINDS registry value, independent from other version, authority and precision decisions. */
export const DOTNETDOC_OUTPUT_KINDS: readonly ["dotnetdoc-extraction","hia-document","doc-source-map","dotnetdoc-source-relation","dotnetdoc-aspnet-endpoint-extraction","dotnetdoc-markup-comment-extraction","dotnetdoc-project-discovery"];
