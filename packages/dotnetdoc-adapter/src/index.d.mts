/**
 * @file
 * @lang zh-CN 精确旧新领域输入到HIA的纯投影声明；不做I/O或自动迁移。
 * @lang en Pure projection declarations from exact legacy/current domain inputs to HIA, without I/O or automatic migration.
 */
import type { DotnetDocXmlArtifact, DotnetDocCSharpArtifact, DotnetDocEndpointArtifact, DotnetDocMarkupArtifact, DotnetDocProjectArtifact, DotnetDocHiaDocument } from '@hia-doc/dotnetdoc-spec';
/**
 * @lang zh-CN 可选文档身份/标题/语言；省略时沿各适配器既有默认。
 * @lang en Optional document identity/title/locales, using each adapter's existing defaults when omitted.
 */
export interface DotnetDocAdapterOptions {
    /**
     * @lang zh-CN 输出文档身份的可选覆盖值，省略时沿适配器既有默认。
     * @lang en Optional output-document identity override, using the adapter's existing default when omitted.
     */
    id?: string;
    /**
     * @lang zh-CN 输出文档标题的可选覆盖值。
     * @lang en Optional output-document title override.
     */
    title?: string;
    /**
     * @lang zh-CN 文档默认语言的可选覆盖值。
     * @lang en Optional override for the document's default locale.
     */
    defaultLocale?: string;
    /**
     * @lang zh-CN 输出语言列表，不会自动生成缺失译文。
     * @lang en Output locale list, without automatic generation of missing translations.
     */
    locales?: string[];
}
/**
 * @lang zh-CN 验证精确两代XML或C#工件；错误抛出且不改变输入；不认证metadata可公开性。
 * @lang en Validates exact legacy/current XML or C# artifacts, throwing without mutation on error; does not certify metadata as public-safe.
 * @param artifact <lang><zh-CN>需按此入口支持的契约验证或转换的外部工件。</zh-CN><en>External artifact to validate or convert under the contract supported by this entry.</en></lang>
 * @returns <lang><zh-CN>验证成功时收窄输入类型，不返回另一个工件。</zh-CN><en>Narrows the input type on successful validation without returning another artifact.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function assertDotnetXmlDocArtifact(artifact: unknown): asserts artifact is DotnetDocXmlArtifact | DotnetDocCSharpArtifact;
/**
 * @lang zh-CN 验证静态端点工件，错误抛出，无I/O。
 * @lang en Validates a static-endpoint artifact, throwing on errors without I/O.
 * @param artifact <lang><zh-CN>需按此入口支持的契约验证或转换的外部工件。</zh-CN><en>External artifact to validate or convert under the contract supported by this entry.</en></lang>
 * @returns <lang><zh-CN>验证成功时收窄输入类型，不返回另一个工件。</zh-CN><en>Narrows the input type on successful validation without returning another artifact.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function assertDotnetAspNetEndpointArtifact(artifact: unknown): asserts artifact is DotnetDocEndpointArtifact;
/**
 * @lang zh-CN 验证标记注释工件，错误抛出，无I/O。
 * @lang en Validates a markup-comment artifact, throwing on errors without I/O.
 * @param artifact <lang><zh-CN>需按此入口支持的契约验证或转换的外部工件。</zh-CN><en>External artifact to validate or convert under the contract supported by this entry.</en></lang>
 * @returns <lang><zh-CN>验证成功时收窄输入类型，不返回另一个工件。</zh-CN><en>Narrows the input type on successful validation without returning another artifact.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function assertDotnetMarkupCommentArtifact(artifact: unknown): asserts artifact is DotnetDocMarkupArtifact;
/**
 * @lang zh-CN 验证项目发现工件，错误抛出，不执行项目。
 * @lang en Validates a project-discovery artifact, throwing on errors without executing projects.
 * @param artifact <lang><zh-CN>需按此入口支持的契约验证或转换的外部工件。</zh-CN><en>External artifact to validate or convert under the contract supported by this entry.</en></lang>
 * @returns <lang><zh-CN>验证成功时收窄输入类型，不返回另一个工件。</zh-CN><en>Narrows the input type on successful validation without returning another artifact.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function assertDotnetProjectDiscoveryArtifact(artifact: unknown): asserts artifact is DotnetDocProjectArtifact;
/**
 * @lang zh-CN XML/C#成员转HIA0.2，保留完整字段i18n/签名/来源；错误抛出，不修改输入。
 * @lang en Converts XML/C# members to HIA 0.2 with complete field i18n/signatures/provenance, throwing on errors without input mutation.
 * @param artifact <lang><zh-CN>需按此入口支持的契约验证或转换的外部工件。</zh-CN><en>External artifact to validate or convert under the contract supported by this entry.</en></lang>
 * @param options <lang><zh-CN>可选HIA文档转换配置，字段含义见DotnetDocAdapterOptions。</zh-CN><en>Optional HIA document-conversion settings described by DotnetDocAdapterOptions.</en></lang>
 * @returns <lang><zh-CN>保留受支持字段、签名与来源的HIA0.2文档。</zh-CN><en>A HIA 0.2 document retaining supported fields, signatures and provenance.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function dotnetXmlDocsToHiaDocument(artifact: unknown, options?: DotnetDocAdapterOptions): DotnetDocHiaDocument;
/**
 * @lang zh-CN 静态端点转HIA0.2，沿用验证拒绝和无I/O边界。
 * @lang en Converts static endpoints to HIA 0.2 under the same rejection and no-I/O boundaries.
 * @param artifact <lang><zh-CN>需按此入口支持的契约验证或转换的外部工件。</zh-CN><en>External artifact to validate or convert under the contract supported by this entry.</en></lang>
 * @param options <lang><zh-CN>可选HIA文档转换配置，字段含义见DotnetDocAdapterOptions。</zh-CN><en>Optional HIA document-conversion settings described by DotnetDocAdapterOptions.</en></lang>
 * @returns <lang><zh-CN>保留受支持字段、签名与来源的HIA0.2文档。</zh-CN><en>A HIA 0.2 document retaining supported fields, signatures and provenance.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function dotnetAspNetEndpointsToHiaDocument(artifact: unknown, options?: DotnetDocAdapterOptions): DotnetDocHiaDocument;
/**
 * @lang zh-CN 标记文档注释转HIA0.2，沿用验证拒绝和无I/O边界。
 * @lang en Converts markup documentation comments to HIA 0.2 under the same rejection and no-I/O boundaries.
 * @param artifact <lang><zh-CN>需按此入口支持的契约验证或转换的外部工件。</zh-CN><en>External artifact to validate or convert under the contract supported by this entry.</en></lang>
 * @param options <lang><zh-CN>可选HIA文档转换配置，字段含义见DotnetDocAdapterOptions。</zh-CN><en>Optional HIA document-conversion settings described by DotnetDocAdapterOptions.</en></lang>
 * @returns <lang><zh-CN>保留受支持字段、签名与来源的HIA0.2文档。</zh-CN><en>A HIA 0.2 document retaining supported fields, signatures and provenance.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function dotnetMarkupCommentsToHiaDocument(artifact: unknown, options?: DotnetDocAdapterOptions): DotnetDocHiaDocument;
/**
 * @lang zh-CN 项目metadata转HIA0.2，沿用验证拒绝和无I/O边界。
 * @lang en Converts project metadata to HIA 0.2 under the same rejection and no-I/O boundaries.
 * @param artifact <lang><zh-CN>需按此入口支持的契约验证或转换的外部工件。</zh-CN><en>External artifact to validate or convert under the contract supported by this entry.</en></lang>
 * @param options <lang><zh-CN>可选HIA文档转换配置，字段含义见DotnetDocAdapterOptions。</zh-CN><en>Optional HIA document-conversion settings described by DotnetDocAdapterOptions.</en></lang>
 * @returns <lang><zh-CN>保留受支持字段、签名与来源的HIA0.2文档。</zh-CN><en>A HIA 0.2 document retaining supported fields, signatures and provenance.</en></lang>
 * @throws <lang><zh-CN>输入不满足此入口的已声明身份、结构或数据边界时抛出错误。</zh-CN><en>Throws when input violates this entry's declared identity, structure or data boundaries.</en></lang>
 */
export function dotnetProjectDiscoveryToHiaDocument(artifact: unknown, options?: DotnetDocAdapterOptions): DotnetDocHiaDocument;
