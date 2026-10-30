/** @file XML公开API的ESM声明；保守字段类型不代替schema校验。 @lang en ESM declarations for the public XML API; conservative field types do not replace schema validation. */
import type { DotnetDocXmlArtifact } from '@hia-doc/dotnetdoc-spec';
/** 同步读取调用方已提供的XML正文，不执行文件I/O；默认path=documentation.xml、语言en；无doc.members抛错，文档内容需宿主授权公开。 @lang en Synchronously parses caller-supplied XML without file I/O; defaults to path documentation.xml and locale en, throws without doc.members, and requires host permission to publish documentation content. */
export function extractDotnetXmlDocs(xmlText: string, options?: { path?: string; defaultLocale?: string }): DotnetDocXmlArtifact<'1.0.0'>;
/** 按现有规则生成成员身份，纯函数且不查源码；不是全局唯一性认证。 @lang en Purely creates a member identity using existing rules without source lookup; not a certification of global uniqueness. */
export function createDotnetMemberId(memberName: string): string;
