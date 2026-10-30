/** @file 运行器内存请求/配置/结果类型；独立于领域与包版本。 @lang en Runner in-memory request/config/result types, independent from domain and package versions. */
import type { DotnetDocRecord, DotnetDocSource } from '@hia-doc/dotnetdoc-spec';
/** 五种显式输入，未知kind由运行时拒绝。 @lang en Five explicit inputs, with unknown kinds rejected at runtime. */
export type DotnetDocInputKind = 'dotnet-xml-doc' | 'dotnet-csharp-source' | 'dotnet-aspnet-surface' | 'dotnet-markup-comments' | 'dotnet-project';
/** 至少一种定位器；路径仅为相对表达式，实际安全仍需运行时验证。 @lang en At least one locator; paths are relative expressions whose actual safety still requires runtime checks. */
export type DotnetDocInput = { kind: DotnetDocInputKind; applicationRoot?: string; artifactBasePath?: string; hiaDocumentId?: string; title?: string; excludeGlobs?: string[] } & ({ path: string } | { paths: string[] } | { projectPath: string } | { glob: string } | { globs: string[] });
/** 输出控制默认前两项true、地图false；不隐式发布源码正文。 @lang en Output controls default the first two to true and maps to false, without implicit source-body publication. */
export interface DotnetDocOptions { writeResultManifest?: boolean; writeSourceRelationArtifact?: boolean; writeDocSourceMapArtifact?: boolean; }
/** 内存请求可省略目录并沿cwd/dist默认；宿主上下文路径不可直接序列化为公开wire。 @lang en In-memory requests may omit directories for cwd/dist defaults; host context paths must not be directly serialized as public wire data. */
export interface DotnetDocRequest { workspaceRoot?: string; outputDirectory?: string; inputs: DotnetDocInput[]; options?: DotnetDocOptions; profileIds?: string[]; }
/** 当前配置身份，目录安全性由schema及loader保证。 @lang en Current config identity, with directory safety enforced by schema and loader. */
export interface DotnetDocCurrentConfig extends DotnetDocRequest { schemaVersion: '1.0.0'; $schema?: string; }
/** 旧配置保留原有null默认兼容；其它行为性输入仍拒绝。 @lang en Legacy config retains null-default compatibility while still refusing behavioral inputs. */
export interface DotnetDocLegacyConfig { schemaVersion: '0.1.0-draft'; $schema?: string; workspaceRoot?: string | null; outputDirectory?: string | null; inputs: DotnetDocInput[]; options?: DotnetDocOptions | null; profileIds?: string[] | null; }
/** 两代读取联合；显式迁移另返回当前版本。 @lang en Dual-generation reading union; explicit migration separately returns the current version. */
export type DotnetDocConfig = DotnetDocCurrentConfig | DotnetDocLegacyConfig;
/** 进度数为输入项计数而非百分比；回调可能抛错。 @lang en Progress numbers count input items rather than percentages; callbacks may throw. */
export interface DotnetDocProgress { phase: string; current?: number; total?: number; message?: string; }
/** 可选中止只检查已aborted状态，不强杀helper或回滚已写文件。 @lang en Optional cancellation checks the aborted state without killing helpers or rolling back written files. */
export interface DotnetDocContext { signal?: { readonly aborted: boolean }; reportProgress?: (progress: DotnetDocProgress) => void; }
/** 结果文件声明不嵌入内容，path相对输出目录。 @lang en Output-file declaration without content; path is relative to the output directory. */
export interface DotnetDocOutputArtifact { id: string; kind: string; path: string; format?: string; mediaType?: string; profileIds?: string[]; contract?: string; contractVersion?: string; }
/** 受控运行诊断；任意metadata仍需宿主逐项公开审查。 @lang en Controlled runner diagnostics; arbitrary metadata still requires host publication review. */
export interface DotnetDocDiagnostic { code: string; message: string; severity: 'info' | 'warning' | 'error'; source?: DotnetDocSource; metadata?: DotnetDocRecord; }
/** SDK1.0.0结果；部分失败保留已成功输出，不自动回滚。 @lang en SDK 1.0.0 result; partial failures retain successful outputs without automatic rollback. */
export interface DotnetDocResult { contract: 'documentation-producer-result'; contractVersion: '1.0.0'; producer: { id: string; version: string }; status: 'success' | 'partial' | 'failed'; artifacts: DotnetDocOutputArtifact[]; diagnostics: DotnetDocDiagnostic[]; }
