/** @file @lang zh-CN 包内冻结数组纯数据定义，无导入和运行器副作用。 @lang en Owner-local frozen-array plain-data definitions without imports or runner side effects. */

/**
 * XML documentation tags accepted by the first DotNetDoc intake layer.
 *
 * @lang zh-CN 第一层 DotNetDoc intake 接受的 XML documentation tag。
 */
export const DOTNETDOC_XML_DOCUMENTATION_TAGS = Object.freeze([
  "summary",
  "remarks",
  "param",
  "typeparam",
  "returns",
  "exception",
  "see",
  "seealso",
  "lang",
  "l",
  "div",
  "para"
]);

/**
 * Markup comment syntax kinds recognized by the first DotNetDoc markup intake layer.
 *
 * @lang zh-CN 第一层 DotNetDoc markup intake 识别的标记层注释语法类型。
 */
export const DOTNETDOC_MARKUP_COMMENT_KINDS = Object.freeze([
  "webforms-server-comment",
  "razor-comment",
  "html-comment"
]);
