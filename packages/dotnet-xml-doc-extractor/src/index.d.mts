/**
 * @file
 * @lang zh-CN XML公开API的ESM声明；保守字段类型不代替schema校验。
 * @lang en ESM declarations for the public XML API; conservative field types do not replace schema validation.
 */
import type { DotnetDocXmlArtifact } from '@hia-doc/dotnetdoc-spec';
/**
 * @lang zh-CN 同步读取调用方已提供的XML正文，不执行文件I/O；默认path=documentation.xml、语言en；无doc.members抛错，文档内容需宿主授权公开。
 * @lang en Synchronously parses caller-supplied XML without file I/O; defaults to path documentation.xml and locale en, throws without doc.members, and requires host permission to publish documentation content.
 * @param xmlText <lang><zh-CN>调用方已读取并获授权处理的XML正文。</zh-CN><en>XML text already read and authorized for processing by the caller.</en></lang>
 * @param options <lang><zh-CN>可选源path与默认语言，默认documentation.xml和en。</zh-CN><en>Optional source path and default locale, defaulting to documentation.xml and en.</en></lang>
 * @returns <lang><zh-CN>当前1.0.0 XML成员文档工件。</zh-CN><en>The current 1.0.0 XML member-documentation artifact.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function extractDotnetXmlDocs(xmlText: string, options?: { path?: string; defaultLocale?: string }): DotnetDocXmlArtifact<'1.0.0'>;
/**
 * @lang zh-CN 按现有规则生成成员身份，纯函数且不查源码；不是全局唯一性认证。
 * @lang en Purely creates a member identity using existing rules without source lookup; not a certification of global uniqueness.
 * @param memberName <lang><zh-CN>原始XML文档成员名或带种类前缀的成员身份。</zh-CN><en>Original XML documentation member name or kind-prefixed member identity.</en></lang>
 * @returns <lang><zh-CN>依现有规则生成的成员身份字符串。</zh-CN><en>A member identity string generated under the existing rules.</en></lang>
 */
export function createDotnetMemberId(memberName: string): string;
