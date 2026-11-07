/**
 * @file
 * @lang zh-CN 六包共享的保守结构类型；不替代运行时schema/权限/源码精度校验。
 * @lang en Conservative structural types shared by six packages, not a substitute for runtime schemas, authority or source-precision checks.
 */
/**
 * @lang zh-CN 普通JSON值；运行时另拒绝代理、隐藏字段与循环。
 * @lang en Ordinary JSON values; runtime additionally rejects proxies, hidden fields and cycles.
 */
export type DotnetDocJson = null | boolean | number | string | DotnetDocJson[] | {
    /**
     * @lang zh-CN 字符串键对应递归JSON值，运行时另检查普通对象及循环。
     * @lang en String keys map to recursive JSON values, with ordinary-object and cycle checks performed at runtime.
     */
    [key: string]: DotnetDocJson;
};
/**
 * @lang zh-CN 兼容读取的两个精确领域身份。
 * @lang en Two exact domain identities accepted for compatibility reading.
 */
export type DotnetDocArtifactVersion = '0.1.0-draft' | '1.0.0';
/**
 * @lang zh-CN 允许的七类领域合同，非任意插件身份。
 * @lang en Seven permitted domain contracts, not arbitrary plugin identities.
 */
export type DotnetDocArtifactContract = 'dotnetdoc-xml-doc-extraction' | 'dotnetdoc-csharp-source-extraction' | 'dotnetdoc-source-relation' | 'dotnetdoc-aspnet-endpoint-extraction' | 'dotnetdoc-markup-comment-extraction' | 'dotnetdoc-project-discovery' | 'dotnetdoc-build-warning-classification';
/**
 * @lang zh-CN 可扩展字段只读取消费前仍需缩窄；unknown不表示任意对象可通过JSON读取。
 * @lang en Extensible fields require narrowing before consumption; unknown does not mean arbitrary objects pass JSON reading.
 */
export interface DotnetDocRecord {
    /**
     * @lang zh-CN 可扩展字符串键及unknown值，消费前需缩窄具体结构。
     * @lang en Extensible string keys and unknown values requiring structural narrowing before consumption.
     */
    [key: string]: unknown;
}
/**
 * @lang zh-CN 来源位置是transport，不保证可信代码位置或字符单位。
 * @lang en A transport position, without trusted-code-location or character-unit guarantees.
 */
export interface DotnetDocPosition {
    /**
     * @lang zh-CN 来源行号，其有效范围与精度由对应契约检查。
     * @lang en Source line number whose valid range and precision are checked by the corresponding contract.
     */
    line: number;
    /**
     * @lang zh-CN 可选列号，须结合来源声明的单位解释。
     * @lang en Optional column number interpreted with the source-declared unit.
     */
    column?: number;
}
/**
 * @lang zh-CN 原始范围可缺终点；精度以独立源码映射声明为准。
 * @lang en A raw range may omit its end; independent source-map declarations govern precision.
 */
export interface DotnetDocRange {
    /**
     * @lang zh-CN 原始范围的起始位置。
     * @lang en Starting position of the raw range.
     */
    start: DotnetDocPosition;
    /**
     * @lang zh-CN 可选终点，缺失时不能推断完整范围。
     * @lang en Optional end position whose absence cannot establish a complete range.
     */
    end?: DotnetDocPosition;
}
/**
 * @lang zh-CN 领域来源metadata可能缺range，XML位置不自动转代码位置。
 * @lang en Domain provenance may omit range; XML positions do not automatically become code locations.
 */
export interface DotnetDocSource extends DotnetDocRecord {
    /**
     * @lang zh-CN 生产者提供的路径元数据，不授予读取或公开权限。
     * @lang en Producer-supplied path metadata granting no read or publication authority.
     */
    path?: string;
    /**
     * @lang zh-CN 可选来源语言标签。
     * @lang en Optional source-language label.
     */
    language?: string;
    /**
     * @lang zh-CN 可选原始范围，不能自动提升为可信代码位置。
     * @lang en Optional raw range that cannot automatically become a trusted code location.
     */
    range?: DotnetDocRange;
    /**
     * @lang zh-CN 原生产者使用的定位方法标签。
     * @lang en Location-method label supplied by the original producer.
     */
    rangeSource?: string;
}
/**
 * @lang zh-CN 根身份和领域扩展；专用schema校验具体集合。
 * @lang en Root identity and domain extensions; dedicated schemas validate concrete collections.
 * @typeParam C - <lang><zh-CN>精确领域契约名，受已登记契约联合约束。</zh-CN><en>Exact domain contract name constrained by the registered contract union.</en></lang>
 * @typeParam V - <lang><zh-CN>精确领域版本，默认保留两代身份联合。</zh-CN><en>Exact domain version, defaulting to the union of both supported identities.</en></lang>
 */
export interface DotnetDocArtifactBase<C extends DotnetDocArtifactContract, V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocRecord {
    /**
     * @lang zh-CN 泛型C指定的精确领域契约。
     * @lang en Exact domain contract selected by generic parameter C.
     */
    contract: C;
    /**
     * @lang zh-CN 泛型V指定的精确领域版本。
     * @lang en Exact domain version selected by generic parameter V.
     */
    contractVersion: V;
    /**
     * @lang zh-CN 可选领域schema标识，不触发自动网络读取。
     * @lang en Optional domain schema identity without automatic network retrieval.
     */
    $schema?: string;
    /**
     * @lang zh-CN 生产者提供的可扩展身份记录。
     * @lang en Extensible identity record supplied by the producer.
     */
    producer: DotnetDocRecord;
    /**
     * @lang zh-CN 领域诊断记录，详细字段仍需按契约缩窄。
     * @lang en Domain diagnostic records whose detailed fields still require contract-specific narrowing.
     */
    diagnostics: DotnetDocRecord[];
}
/**
 * @lang zh-CN XML成员提取；成员扩展保留unknown，调用前可进一步按schema缩窄。
 * @lang en XML member extraction; member extensions remain unknown and may be narrowed against the schema.
 * @typeParam V - <lang><zh-CN>精确领域版本，默认保留两代身份联合。</zh-CN><en>Exact domain version, defaulting to the union of both supported identities.</en></lang>
 */
export interface DotnetDocXmlArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-xml-doc-extraction', V> {
    /**
     * @lang zh-CN XML文档成员记录，其字段需按领域schema解释。
     * @lang en XML documentation member records interpreted through the domain schema.
     */
    members: DotnetDocRecord[];
    /**
     * @lang zh-CN XML文档输入的来源元数据，XML位置与代码位置分别核验。
     * @lang en XML input provenance whose XML positions and code positions are verified separately.
     */
    source: DotnetDocRecord;
}
/**
 * @lang zh-CN Roslyn源码成员提取，不等同完整项目编译。
 * @lang en Roslyn source-member extraction, not full project compilation.
 * @typeParam V - <lang><zh-CN>精确领域版本，默认保留两代身份联合。</zh-CN><en>Exact domain version, defaulting to the union of both supported identities.</en></lang>
 */
export interface DotnetDocCSharpArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-csharp-source-extraction', V> {
    /**
     * @lang zh-CN Roslyn静态提取的成员记录，消费前按领域schema缩窄。
     * @lang en Statically extracted Roslyn member records requiring domain-schema narrowing before consumption.
     */
    members: DotnetDocRecord[];
    /**
     * @lang zh-CN 提取输入的来源元数据，精确代码定位另行核验。
     * @lang en Input provenance whose precise code locations require separate verification.
     */
    source: DotnetDocRecord;
}
/**
 * @lang zh-CN 静态ASP.NET端点，不保证运行期完整性。
 * @lang en Static ASP.NET endpoints without runtime-completeness guarantees.
 * @typeParam V - <lang><zh-CN>精确领域版本，默认保留两代身份联合。</zh-CN><en>Exact domain version, defaulting to the union of both supported identities.</en></lang>
 */
export interface DotnetDocEndpointArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-aspnet-endpoint-extraction', V> {
    /**
     * @lang zh-CN 静态发现的ASP.NET端点记录。
     * @lang en Statically discovered ASP.NET endpoint records.
     */
    endpoints: DotnetDocRecord[];
    /**
     * @lang zh-CN 端点提取输入的来源元数据。
     * @lang en Provenance of the endpoint extraction inputs.
     */
    source: DotnetDocRecord;
}
/**
 * @lang zh-CN 标记文档注释，宿主仍负责内容公开权限。
 * @lang en Markup documentation comments; the host still owns publication permission.
 * @typeParam V - <lang><zh-CN>精确领域版本，默认保留两代身份联合。</zh-CN><en>Exact domain version, defaulting to the union of both supported identities.</en></lang>
 */
export interface DotnetDocMarkupArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-markup-comment-extraction', V> {
    /**
     * @lang zh-CN 显式提取的标记文档注释记录。
     * @lang en Explicitly extracted markup documentation-comment records.
     */
    comments: DotnetDocRecord[];
    /**
     * @lang zh-CN 标记注释输入的来源元数据。
     * @lang en Provenance of the markup-comment inputs.
     */
    source: DotnetDocRecord;
}
/**
 * @lang zh-CN 静态项目/解决方案metadata，未执行构建。
 * @lang en Static project/solution metadata without executing a build.
 * @typeParam V - <lang><zh-CN>精确领域版本，默认保留两代身份联合。</zh-CN><en>Exact domain version, defaulting to the union of both supported identities.</en></lang>
 */
export interface DotnetDocProjectArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-project-discovery', V> {
    /**
     * @lang zh-CN 静态项目发现记录，保留项目metadata。
     * @lang en Static project-discovery records retaining project metadata.
     */
    projects: DotnetDocRecord[];
    /**
     * @lang zh-CN 静态解决方案发现记录。
     * @lang en Static solution-discovery records.
     */
    solutions: DotnetDocRecord[];
}
/**
 * @lang zh-CN 来源关系只含metadata；嵌套来源版本独立保留。
 * @lang en Metadata-only source relations with independently preserved nested provenance versions.
 * @typeParam V - <lang><zh-CN>精确领域版本，默认保留两代身份联合。</zh-CN><en>Exact domain version, defaulting to the union of both supported identities.</en></lang>
 */
export interface DotnetDocRelationArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-source-relation', V> {
    /**
     * @lang zh-CN 显式来源关系记录，嵌套来源版本分别读取。
     * @lang en Explicit source-relation records whose nested provenance versions are read separately.
     */
    relations: DotnetDocRecord[];
}
/**
 * @lang zh-CN 构建诊断分类不自动证明发行门禁通过。
 * @lang en Build-diagnostic classification does not automatically prove release readiness.
 * @typeParam V - <lang><zh-CN>精确领域版本，默认保留两代身份联合。</zh-CN><en>Exact domain version, defaulting to the union of both supported identities.</en></lang>
 */
export interface DotnetDocWarningArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> extends DotnetDocArtifactBase<'dotnetdoc-build-warning-classification', V> {
    /**
     * @lang zh-CN 本次构建诊断分类使用的策略记录。
     * @lang en Policy record used for this build-diagnostic classification.
     */
    policy: DotnetDocRecord;
    /**
     * @lang zh-CN 分类汇总计数，不自动认证发行门禁。
     * @lang en Classification summary counts without automatic release-gate certification.
     */
    summary: DotnetDocRecord;
}
/**
 * @lang zh-CN 两代七类精确联合，保留各集合判别。
 * @lang en Exact union of seven artifact kinds across two generations, retaining collection discrimination.
 * @typeParam V - <lang><zh-CN>精确领域版本，默认保留两代身份联合。</zh-CN><en>Exact domain version, defaulting to the union of both supported identities.</en></lang>
 */
export type DotnetDocArtifact<V extends DotnetDocArtifactVersion = DotnetDocArtifactVersion> = DotnetDocXmlArtifact<V> | DotnetDocCSharpArtifact<V> | DotnetDocEndpointArtifact<V> | DotnetDocMarkupArtifact<V> | DotnetDocProjectArtifact<V> | DotnetDocRelationArtifact<V> | DotnetDocWarningArtifact<V>;
/**
 * @lang zh-CN 无I/O的静态profile，不能授予项目执行许可。
 * @lang en Static profile without I/O or authority to execute projects.
 */
export interface DotnetDocArtifactProfile {
    /**
     * @lang zh-CN 只读静态profile身份。
     * @lang en Readonly static profile identity.
     */
    readonly id: string;
    /**
     * @lang zh-CN 该profile对应的领域契约。
     * @lang en Domain contract represented by this profile.
     */
    readonly contract: DotnetDocArtifactContract;
    /**
     * @lang zh-CN 该profile对应的精确领域版本。
     * @lang en Exact domain version represented by this profile.
     */
    readonly version: DotnetDocArtifactVersion;
    /**
     * @lang zh-CN 对应本地schema的标识。
     * @lang en Identity of the corresponding local schema.
     */
    readonly schemaId: string;
    /**
     * @lang zh-CN 固定static分析类别。
     * @lang en Fixed static analysis category.
     */
    readonly analysis: 'static';
    /**
     * @lang zh-CN 固定false，当前profile不声明运行期发现能力。
     * @lang en Fixed false, with no runtime-discovery capability declared by this profile.
     */
    readonly runtimeDiscovery: false;
    /**
     * @lang zh-CN 固定false，当前profile不声明构建输入项目。
     * @lang en Fixed false, with no input-project build declared by this profile.
     */
    readonly inputProjectBuild: false;
}
/**
 * @lang zh-CN HIA投影的保守根结构；节点/符号详情须用核心reader进一步验证。
 * @lang en Conservative HIA projection root; core readers must further validate node/symbol details.
 */
export interface DotnetDocHiaDocument extends DotnetDocRecord {
    /**
     * @lang zh-CN 核心HIA文档的精确0.2.0身份。
     * @lang en Exact 0.2.0 identity of the core HIA document.
     */
    schemaVersion: '0.2.0';
    /**
     * @lang zh-CN 投影后文档的身份。
     * @lang en Identity of the projected document.
     */
    id: string;
    /**
     * @lang zh-CN 投影后文档的标题。
     * @lang en Title of the projected document.
     */
    title: string;
    /**
     * @lang zh-CN 文档默认语言。
     * @lang en Default locale of the document.
     */
    defaultLocale: string;
    /**
     * @lang zh-CN 文档登记的语言列表。
     * @lang en Locales registered by the document.
     */
    locales: string[];
    /**
     * @lang zh-CN 核心节点的保守记录，需由核心reader继续验证。
     * @lang en Conservative core-node records requiring further validation by the core reader.
     */
    nodes: DotnetDocRecord[];
    /**
     * @lang zh-CN 核心符号的保守记录，需由核心reader继续验证。
     * @lang en Conservative core-symbol records requiring further validation by the core reader.
     */
    symbols: DotnetDocRecord[];
    /**
     * @lang zh-CN 文档诊断的保守记录。
     * @lang en Conservative document diagnostic records.
     */
    diagnostics: DotnetDocRecord[];
}
