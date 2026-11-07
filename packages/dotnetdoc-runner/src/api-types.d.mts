/**
 * @file
 * @lang zh-CN 运行器内存请求/配置/结果类型；独立于领域与包版本。
 * @lang en Runner in-memory request/config/result types, independent from domain and package versions.
 */
import type { DotnetDocRecord, DotnetDocSource } from '@hia-doc/dotnetdoc-spec';
/**
 * @lang zh-CN 五种显式输入，未知kind由运行时拒绝。
 * @lang en Five explicit inputs, with unknown kinds rejected at runtime.
 */
export type DotnetDocInputKind = 'dotnet-xml-doc' | 'dotnet-csharp-source' | 'dotnet-aspnet-surface' | 'dotnet-markup-comments' | 'dotnet-project';
/**
 * @lang zh-CN 至少一种定位器；路径仅为相对表达式，实际安全仍需运行时验证。
 * @lang en At least one locator; paths are relative expressions whose actual safety still requires runtime checks.
 * @remarks <lang><zh-CN>类型要求至少满足一个定位器分支，可同时满足多个分支。实际输入类别与路径权限由运行时检查。</zh-CN><en>The type requires at least one locator branch and permits overlapping branches. Runtime checks the actual input kind and path authority.</en></lang>
 */
export type DotnetDocInput = {
    /**
     * @lang zh-CN 五种已登记输入类别之一，决定后续领域处理器。
     * @lang en One of five registered input kinds selecting the subsequent domain handler.
     */
    kind: DotnetDocInputKind;
    /**
     * @lang zh-CN ASP.NET输入的应用根定位器，适用范围由运行器核验。
     * @lang en Application-root locator for ASP.NET input, with applicability checked by the runner.
     */
    applicationRoot?: string;
    /**
     * @lang zh-CN 可选输出工件前缀，路径边界由运行器校验。
     * @lang en Optional output-artifact prefix whose path boundary is validated by the runner.
     */
    artifactBasePath?: string;
    /**
     * @lang zh-CN 该输入投影的HIA文档身份覆盖值。
     * @lang en HIA-document identity override for this input's projection.
     */
    hiaDocumentId?: string;
    /**
     * @lang zh-CN 该输入输出文档的可选标题。
     * @lang en Optional title for this input's output document.
     */
    title?: string;
    /**
     * @lang zh-CN 可选排除模式，其适用输入及匹配规则由领域处理器解释。
     * @lang en Optional exclusion patterns whose applicable inputs and matching rules are interpreted by the domain handler.
     */
    excludeGlobs?: string[];
} & ({
    /**
     * @lang zh-CN 单一路径定位器，满足一个输入定位分支。
     * @lang en Single-path locator satisfying one input-location branch.
     */
    path: string;
} | {
    /**
     * @lang zh-CN 多路径定位器，由对应领域处理器解释。
     * @lang en Multiple-path locator interpreted by the corresponding domain handler.
     */
    paths: string[];
} | {
    /**
     * @lang zh-CN 静态项目定位器，具体适用类别由运行时检查。
     * @lang en Static project locator whose applicable kind is checked at runtime.
     */
    projectPath: string;
} | {
    /**
     * @lang zh-CN 单个路径匹配模式，匹配与授权范围分别核验。
     * @lang en Single path-matching pattern with matching and authorization checked separately.
     */
    glob: string;
} | {
    /**
     * @lang zh-CN 多个路径匹配模式，展开后的文件仍须通过路径检查。
     * @lang en Multiple path-matching patterns whose expanded files still require path checks.
     */
    globs: string[];
});
/**
 * @lang zh-CN 输出控制默认前两项true、地图false；不隐式发布源码正文。
 * @lang en Output controls default the first two to true and maps to false, without implicit source-body publication.
 */
export interface DotnetDocOptions {
    /**
     * @lang zh-CN 是否写结果清单，省略时默认true。
     * @lang en Whether to write the result manifest, defaulting to true when omitted.
     */
    writeResultManifest?: boolean;
    /**
     * @lang zh-CN 是否写来源关系工件，省略时默认true。
     * @lang en Whether to write the source-relation artifact, defaulting to true when omitted.
     */
    writeSourceRelationArtifact?: boolean;
    /**
     * @lang zh-CN 是否写独立文档源码地图，省略时默认false。
     * @lang en Whether to write the independent documentation source map, defaulting to false when omitted.
     */
    writeDocSourceMapArtifact?: boolean;
}
/**
 * @lang zh-CN 内存请求可省略目录并沿cwd/dist默认；宿主上下文路径不可直接序列化为公开wire。
 * @lang en In-memory requests may omit directories for cwd/dist defaults; host context paths must not be directly serialized as public wire data.
 */
export interface DotnetDocRequest {
    /**
     * @lang zh-CN 输入工作区根，省略时沿既有cwd默认。
     * @lang en Input workspace root using the existing cwd default when omitted.
     */
    workspaceRoot?: string;
    /**
     * @lang zh-CN 输出目录定位器，省略时沿既有dist默认。
     * @lang en Output-directory locator using the existing dist default when omitted.
     */
    outputDirectory?: string;
    /**
     * @lang zh-CN 显式领域输入列表，逐项处理并记录结果。
     * @lang en Explicit domain inputs processed and recorded individually.
     */
    inputs: DotnetDocInput[];
    /**
     * @lang zh-CN 可选输出控制，省略项使用运行器默认。
     * @lang en Optional output controls whose omitted members use runner defaults.
     */
    options?: DotnetDocOptions;
    /**
     * @lang zh-CN 可选文档化profile选择，不授予额外执行权限。
     * @lang en Optional documentation-profile selection granting no additional execution authority.
     */
    profileIds?: string[];
}
/**
 * @lang zh-CN 当前配置身份，目录安全性由schema及loader保证。
 * @lang en Current config identity, with directory safety enforced by schema and loader.
 */
export interface DotnetDocCurrentConfig extends DotnetDocRequest {
    /**
     * @lang zh-CN 当前配置的精确1.0.0身份。
     * @lang en Exact 1.0.0 identity of the current configuration.
     */
    schemaVersion: '1.0.0';
    /**
     * @lang zh-CN 可选配置schema标识，实际匹配由本地读者检查。
     * @lang en Optional configuration schema identity checked by the local reader.
     */
    $schema?: string;
}
/**
 * @lang zh-CN 旧配置保留原有null默认兼容；其它行为性输入仍拒绝。
 * @lang en Legacy config retains null-default compatibility while still refusing behavioral inputs.
 */
export interface DotnetDocLegacyConfig {
    /**
     * @lang zh-CN 旧配置的精确0.1.0-draft身份，保持兼容读取。
     * @lang en Exact legacy 0.1.0-draft configuration identity retained for compatibility reading.
     */
    schemaVersion: '0.1.0-draft';
    /**
     * @lang zh-CN 可选旧配置schema标识。
     * @lang en Optional legacy configuration schema identity.
     */
    $schema?: string;
    /**
     * @lang zh-CN 旧工作区定位器，省略或null沿既有默认处理。
     * @lang en Legacy workspace locator whose omission or null uses existing defaults.
     */
    workspaceRoot?: string | null;
    /**
     * @lang zh-CN 旧输出定位器，省略或null保留原默认行为。
     * @lang en Legacy output locator retaining original defaults for omission or null.
     */
    outputDirectory?: string | null;
    /**
     * @lang zh-CN 显式输入列表，按各输入类别分别验证。
     * @lang en Explicit input list validated separately by input kind.
     */
    inputs: DotnetDocInput[];
    /**
     * @lang zh-CN 旧输出选项，null保持既有默认兼容。
     * @lang en Legacy output options retaining existing null-default compatibility.
     */
    options?: DotnetDocOptions | null;
    /**
     * @lang zh-CN 旧profile选择，null或省略保留原处理规则。
     * @lang en Legacy profile selection retaining original rules for null or omission.
     */
    profileIds?: string[] | null;
}
/**
 * @lang zh-CN 两代读取联合；显式迁移另返回当前版本。
 * @lang en Dual-generation reading union; explicit migration separately returns the current version.
 */
export type DotnetDocConfig = DotnetDocCurrentConfig | DotnetDocLegacyConfig;
/**
 * @lang zh-CN 进度数为输入项计数而非百分比；回调可能抛错。
 * @lang en Progress numbers count input items rather than percentages; callbacks may throw.
 */
export interface DotnetDocProgress {
    /**
     * @lang zh-CN 当前处理阶段的提供者标签。
     * @lang en Producer-supplied label for the current processing phase.
     */
    phase: string;
    /**
     * @lang zh-CN 可选当前输入项计数，使用输入项单位。
     * @lang en Optional current count measured in input items.
     */
    current?: number;
    /**
     * @lang zh-CN 可选输入项总数，使用输入项单位。
     * @lang en Optional total count measured in input items.
     */
    total?: number;
    /**
     * @lang zh-CN 可选本地进度说明，公开范围由宿主决定。
     * @lang en Optional local progress prose whose publication scope is determined by the host.
     */
    message?: string;
}
/**
 * @lang zh-CN 可选中止只检查已aborted状态，不强杀helper或回滚已写文件。
 * @lang en Optional cancellation checks the aborted state without killing helpers or rolling back written files.
 */
export interface DotnetDocContext {
    /**
     * @lang zh-CN 可选中止状态引用，运行器按既有检查点读取。
     * @lang en Optional cancellation-state reference read at existing runner checkpoints.
     */
    signal?: {
        /**
         * @lang zh-CN 已中止标志，只读查询不表示强制终止helper。
         * @lang en Aborted flag whose readonly observation does not force helper termination.
         */
        readonly aborted: boolean;
    };
    /**
     * @lang zh-CN 可选宿主进度回调，回调异常可能传播。
     * @lang en Optional host progress callback whose exceptions may propagate.
     */
    reportProgress?: (progress: DotnetDocProgress) => void;
}
/**
 * @lang zh-CN 结果文件声明不嵌入内容，path相对输出目录。
 * @lang en Output-file declaration without content; path is relative to the output directory.
 */
export interface DotnetDocOutputArtifact {
    /**
     * @lang zh-CN 本结果清单中的工件身份。
     * @lang en Artifact identity within this result manifest.
     */
    id: string;
    /**
     * @lang zh-CN 工件类别，消费时仍需选择对应契约。
     * @lang en Artifact kind whose corresponding contract still needs selection during consumption.
     */
    kind: string;
    /**
     * @lang zh-CN 相对于输出目录的文件定位器。
     * @lang en File locator relative to the output directory.
     */
    path: string;
    /**
     * @lang zh-CN 可选序列化格式标签。
     * @lang en Optional serialization-format label.
     */
    format?: string;
    /**
     * @lang zh-CN 可选媒体类型。
     * @lang en Optional media type.
     */
    mediaType?: string;
    /**
     * @lang zh-CN 与工件关联的可选profile身份。
     * @lang en Optional profile identities associated with the artifact.
     */
    profileIds?: string[];
    /**
     * @lang zh-CN 可选工件契约名，须与版本一起解释。
     * @lang en Optional artifact contract name interpreted together with its version.
     */
    contract?: string;
    /**
     * @lang zh-CN 可选工件精确版本，独立于包版本。
     * @lang en Optional exact artifact version, independent of the package version.
     */
    contractVersion?: string;
}
/**
 * @lang zh-CN 受控运行诊断；任意metadata仍需宿主逐项公开审查。
 * @lang en Controlled runner diagnostics; arbitrary metadata still requires host publication review.
 */
export interface DotnetDocDiagnostic {
    /**
     * @lang zh-CN 诊断提供者给出的机器标识。
     * @lang en Machine-readable identity supplied by the diagnostic producer.
     */
    code: string;
    /**
     * @lang zh-CN 诊断说明文本，发布范围仍由宿主控制。
     * @lang en Diagnostic prose whose publication scope remains host-controlled.
     */
    message: string;
    /**
     * @lang zh-CN info、warning或error级别。
     * @lang en Severity of info, warning or error.
     */
    severity: 'info' | 'warning' | 'error';
    /**
     * @lang zh-CN 可选领域来源元数据，精确代码定位需另行核验。
     * @lang en Optional domain provenance requiring separate verification for precise code locations.
     */
    source?: DotnetDocSource;
    /**
     * @lang zh-CN 可扩展诊断记录，消费和发布前需检查具体值。
     * @lang en Extensible diagnostic record whose values need review before consumption or publication.
     */
    metadata?: DotnetDocRecord;
}
/**
 * @lang zh-CN SDK1.0.0结果；部分失败保留已成功输出，不自动回滚。
 * @lang en SDK 1.0.0 result; partial failures retain successful outputs without automatic rollback.
 */
export interface DotnetDocResult {
    /**
     * @lang zh-CN SDK结果契约的固定名称。
     * @lang en Fixed name of the SDK result contract.
     */
    contract: 'documentation-producer-result';
    /**
     * @lang zh-CN SDK结果的精确1.0.0身份。
     * @lang en Exact 1.0.0 identity of the SDK result.
     */
    contractVersion: '1.0.0';
    /**
     * @lang zh-CN 报告本轮输出的生产者身份。
     * @lang en Producer identity reporting this run's output.
     */
    producer: {
        /**
         * @lang zh-CN 生产者的机器身份。
         * @lang en Machine-readable producer identity.
         */
        id: string;
        /**
         * @lang zh-CN 生产者报告的版本，独立于各工件版本。
         * @lang en Producer-reported version, independent of individual artifact versions.
         */
        version: string;
    };
    /**
     * @lang zh-CN 整轮success、partial或failed状态。
     * @lang en Run-level status of success, partial or failed.
     */
    status: 'success' | 'partial' | 'failed';
    /**
     * @lang zh-CN 本轮登记的成功工件，不包含文件正文。
     * @lang en Successful artifacts registered for this run, without file bodies.
     */
    artifacts: DotnetDocOutputArtifact[];
    /**
     * @lang zh-CN 本轮受控诊断列表，具体公开内容由宿主复核。
     * @lang en Controlled run diagnostics whose publication content is reviewed by the host.
     */
    diagnostics: DotnetDocDiagnostic[];
}
