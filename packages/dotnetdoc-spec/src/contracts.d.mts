/** @file 六包共享的保守结构类型；不替代运行时schema/权限/源码精度校验。 @lang en Conservative structural types shared by six packages, not a substitute for runtime schemas, authority or source-precision checks. */

/** 普通JSON值；运行时另拒绝代理、隐藏字段与循环。 @lang en Ordinary JSON values; runtime additionally rejects proxies, hidden fields and cycles. */
export type DotnetDocJson = null | boolean | number | string | DotnetDocJson[] | { [key: string]: DotnetDocJson };
/** 兼容读取的两个精确领域身份。 @lang en Two exact domain identities accepted for compatibility reading. */
export type DotnetDocArtifactVersion = '0.1.0-draft' | '1.0.0';
/** 允许的七类领域合同，非任意插件身份。 @lang en Seven permitted domain contracts, not arbitrary plugin identities. */
export type DotnetDocArtifactContract = 'dotnetdoc-xml-doc-extraction' | 'dotnetdoc-csharp-source-extraction' | 'dotnetdoc-source-relation' | 'dotnetdoc-aspnet-endpoint-extraction' | 'dotnetdoc-markup-comment-extraction' | 'dotnetdoc-project-discovery' | 'dotnetdoc-build-warning-classification';
/** 可扩展字段只读取消费前仍需缩窄；unknown不表示任意对象可通过JSON读取。 @lang en Extensible fields require narrowing before consumption; unknown does not mean arbitrary objects pass JSON reading. */
export interface DotnetDocRecord { [key: string]: unknown; }
/** 来源位置是transport，不保证可信代码位置或字符单位。 @lang en A transport position, without trusted-code-location or character-unit guarantees. */
export interface DotnetDocPosition { line: number; column?: number; }
/** 原始范围可缺终点；精度以独立源码映射声明为准。 @lang en A raw range may omit its end; independent source-map declarations govern precision. */
export interface DotnetDocRange { start: DotnetDocPosition; end?: DotnetDocPosition; }
/** 领域来源metadata可能缺range，XML位置不自动转代码位置。 @lang en Domain provenance may omit range; XML positions do not automatically become code locations. */
export interface DotnetDocSource extends DotnetDocRecord { path?: string; language?: string; range?: DotnetDocRange; rangeSource?: string; }
/** 根身份和领域扩展；专用schema校验具体集合。 @lang en Root identity and domain extensions; dedicated schemas validate concrete collections. */
export interface DotnetDocArtifactBase<C extends DotnetDocArtifactContract, V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocRecord {
  contract: C;
  contractVersion: V;
  $schema?: string;
  producer: DotnetDocRecord;
  diagnostics: DotnetDocRecord[];
}
/** XML成员提取；成员扩展保留unknown，调用前可进一步按schema缩窄。 @lang en XML member extraction; member extensions remain unknown and may be narrowed against the schema. */
export interface DotnetDocXmlArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-xml-doc-extraction', V> { members: DotnetDocRecord[]; source: DotnetDocRecord; }
/** Roslyn源码成员提取，不等同完整项目编译。 @lang en Roslyn source-member extraction, not full project compilation. */
export interface DotnetDocCSharpArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-csharp-source-extraction', V> { members: DotnetDocRecord[]; source: DotnetDocRecord; }
/** 静态ASP.NET端点，不保证运行期完整性。 @lang en Static ASP.NET endpoints without runtime-completeness guarantees. */
export interface DotnetDocEndpointArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-aspnet-endpoint-extraction', V> { endpoints: DotnetDocRecord[]; source: DotnetDocRecord; }
/** 标记文档注释，宿主仍负责内容公开权限。 @lang en Markup documentation comments; the host still owns publication permission. */
export interface DotnetDocMarkupArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-markup-comment-extraction', V> { comments: DotnetDocRecord[]; source: DotnetDocRecord; }
/** 静态项目/解决方案metadata，未执行构建。 @lang en Static project/solution metadata without executing a build. */
export interface DotnetDocProjectArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-project-discovery', V> { projects: DotnetDocRecord[]; solutions: DotnetDocRecord[]; }
/** 来源关系只含metadata；嵌套来源版本独立保留。 @lang en Metadata-only source relations with independently preserved nested provenance versions. */
export interface DotnetDocRelationArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-source-relation', V> { relations: DotnetDocRecord[]; }
/** 构建诊断分类不自动证明发行门禁通过。 @lang en Build-diagnostic classification does not automatically prove release readiness. */
export interface DotnetDocWarningArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-build-warning-classification', V> { policy: DotnetDocRecord; summary: DotnetDocRecord; }
/** 两代七类精确联合，保留各集合判别。 @lang en Exact union of seven artifact kinds across two generations, retaining collection discrimination. */
export type DotnetDocArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> = DotnetDocXmlArtifact<V> | DotnetDocCSharpArtifact<V> | DotnetDocEndpointArtifact<V> | DotnetDocMarkupArtifact<V> | DotnetDocProjectArtifact<V> | DotnetDocRelationArtifact<V> | DotnetDocWarningArtifact<V>;
/** 无I/O的静态profile，不能授予项目执行许可。 @lang en Static profile without I/O or authority to execute projects. */
export interface DotnetDocArtifactProfile { readonly id: string; readonly contract: DotnetDocArtifactContract; readonly version: DotnetDocArtifactVersion; readonly schemaId: string; readonly analysis: 'static'; readonly runtimeDiscovery: false; readonly inputProjectBuild: false; }
/** HIA投影的保守根结构；节点/符号详情须用核心reader进一步验证。 @lang en Conservative HIA projection root; core readers must further validate node/symbol details. */
export interface DotnetDocHiaDocument extends DotnetDocRecord { schemaVersion: '0.2.0'; id: string; title: string; defaultLocale: string; locales: string[]; nodes: DotnetDocRecord[]; symbols: DotnetDocRecord[]; diagnostics: DotnetDocRecord[]; }
