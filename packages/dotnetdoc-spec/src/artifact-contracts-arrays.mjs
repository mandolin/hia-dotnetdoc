/** @file @lang zh-CN 包内冻结数组纯数据定义，无导入和运行器副作用。 @lang en Owner-local frozen-array plain-data definitions without imports or runner side effects. */

/** @lang zh-CN 七个自有身份闭集，与npm包版本及主SDK身份分开。
 * @lang en Closed set of seven owned identities, independent from npm package and main SDK identities. */
export const DOTNETDOC_ARTIFACT_CONTRACTS = Object.freeze([
  'dotnetdoc-xml-doc-extraction', 'dotnetdoc-csharp-source-extraction', 'dotnetdoc-source-relation',
  'dotnetdoc-aspnet-endpoint-extraction', 'dotnetdoc-markup-comment-extraction', 'dotnetdoc-project-discovery',
  'dotnetdoc-build-warning-classification'
]);
