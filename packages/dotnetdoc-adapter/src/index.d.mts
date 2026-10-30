/** @file 精确旧新领域输入到HIA的纯投影声明；不做I/O或自动迁移。 @lang en Pure projection declarations from exact legacy/current domain inputs to HIA, without I/O or automatic migration. */
import type { DotnetDocXmlArtifact, DotnetDocCSharpArtifact, DotnetDocEndpointArtifact, DotnetDocMarkupArtifact, DotnetDocProjectArtifact, DotnetDocHiaDocument } from '@hia-doc/dotnetdoc-spec';
/** 可选文档身份/标题/语言；省略时沿各适配器既有默认。 @lang en Optional document identity/title/locales, using each adapter's existing defaults when omitted. */
export interface DotnetDocAdapterOptions { id?: string; title?: string; defaultLocale?: string; locales?: string[]; }
/** 验证精确两代XML或C#工件；错误抛出且不改变输入；不认证metadata可公开性。 @lang en Validates exact legacy/current XML or C# artifacts, throwing without mutation on error; does not certify metadata as public-safe. */
export function assertDotnetXmlDocArtifact(artifact: unknown): asserts artifact is DotnetDocXmlArtifact | DotnetDocCSharpArtifact;
/** 验证静态端点工件，错误抛出，无I/O。 @lang en Validates a static-endpoint artifact, throwing on errors without I/O. */
export function assertDotnetAspNetEndpointArtifact(artifact: unknown): asserts artifact is DotnetDocEndpointArtifact;
/** 验证标记注释工件，错误抛出，无I/O。 @lang en Validates a markup-comment artifact, throwing on errors without I/O. */
export function assertDotnetMarkupCommentArtifact(artifact: unknown): asserts artifact is DotnetDocMarkupArtifact;
/** 验证项目发现工件，错误抛出，不执行项目。 @lang en Validates a project-discovery artifact, throwing on errors without executing projects. */
export function assertDotnetProjectDiscoveryArtifact(artifact: unknown): asserts artifact is DotnetDocProjectArtifact;
/** XML/C#成员转HIA0.2，保留完整字段i18n/签名/来源；错误抛出，不修改输入。 @lang en Converts XML/C# members to HIA 0.2 with complete field i18n/signatures/provenance, throwing on errors without input mutation. */
export function dotnetXmlDocsToHiaDocument(artifact: unknown, options?: DotnetDocAdapterOptions): DotnetDocHiaDocument;
/** 静态端点转HIA0.2，沿用验证拒绝和无I/O边界。 @lang en Converts static endpoints to HIA 0.2 under the same rejection and no-I/O boundaries. */
export function dotnetAspNetEndpointsToHiaDocument(artifact: unknown, options?: DotnetDocAdapterOptions): DotnetDocHiaDocument;
/** 标记文档注释转HIA0.2，沿用验证拒绝和无I/O边界。 @lang en Converts markup documentation comments to HIA 0.2 under the same rejection and no-I/O boundaries. */
export function dotnetMarkupCommentsToHiaDocument(artifact: unknown, options?: DotnetDocAdapterOptions): DotnetDocHiaDocument;
/** 项目metadata转HIA0.2，沿用验证拒绝和无I/O边界。 @lang en Converts project metadata to HIA 0.2 under the same rejection and no-I/O boundaries. */
export function dotnetProjectDiscoveryToHiaDocument(artifact: unknown, options?: DotnetDocAdapterOptions): DotnetDocHiaDocument;
