/**
 * @file
 * @lang zh-CN 静态.NET提取API声明；helper依赖.NET10但不执行输入项目。
 * @lang en Static .NET extraction API declarations; the helper requires .NET 10 but does not execute input projects.
 */
import type { DotnetDocCSharpArtifact, DotnetDocEndpointArtifact, DotnetDocMarkupArtifact, DotnetDocProjectArtifact } from '@hia-doc/dotnetdoc-spec';
/**
 * @lang zh-CN 工作区根和安全相对路径；范围/引用仍在运行时校验。
 * @lang en Workspace root and safe relative paths, with range/reference validation still performed at runtime.
 */
export interface DotnetSourceRequest {
    /**
     * @lang zh-CN 解析显式源码定位器的工作区根，实际访问范围由运行时核验。
     * @lang en Workspace root for explicit source locators, with actual access checked at runtime.
     */
    workspaceRoot: string;
    /**
     * @lang zh-CN 显式源码路径列表，安全性与支持的文件种类由提取器检查。
     * @lang en Explicit source paths, checked by the extractor for safety and supported file kinds.
     */
    paths: string[];
    /**
     * @lang zh-CN 可选静态项目定位器，用于读取项目及引用信息。
     * @lang en Optional static project locator for project and reference information.
     */
    projectPath?: string;
    /**
     * @lang zh-CN 可选元数据引用目录，目录归属与引用文件由运行时验证。
     * @lang en Optional metadata-reference directory whose ownership and files are validated at runtime.
     */
    referenceDirectory?: string;
}
/**
 * @lang zh-CN 读取显式C#文件/静态项目引用并调用Roslyn helper；写自身helper构建缓存；无范围保证时仅给provenance；不安全路径/工具/I/O失败reject。
 * @lang en Reads explicit C# files/static project references and invokes Roslyn, writing its own helper build cache; uncertain locations remain provenance, and unsafe paths/tool/I/O failures reject.
 */
export function extractDotnetSourceFiles(request: DotnetSourceRequest): Promise<DotnetDocCSharpArtifact<'1.0.0'>>;
/**
 * @lang zh-CN 静态扫描路由与Web Forms；applicationRoot默认点目录，不运行应用；非法路径或I/O失败reject。
 * @lang en Statically scans routes and Web Forms with applicationRoot defaulting to the dot directory, without running the app; invalid paths or I/O failures reject.
 */
export function extractAspNetEndpoints(request: {
    workspaceRoot: string;
    paths: string[];
    applicationRoot?: string;
}): Promise<DotnetDocEndpointArtifact<'1.0.0'>>;
/**
 * @lang zh-CN 读取显式标记文件中的文档注释，默认en；不嵌整份源码，但注释本身仍需公开授权；I/O失败reject。
 * @lang en Reads documentation comments from explicit markup files, defaulting to en, without embedding whole-source bodies; comments still require publication permission and I/O failures reject.
 */
export function extractDotnetMarkupComments(request: {
    workspaceRoot: string;
    paths: string[];
    defaultLocale?: string;
}): Promise<DotnetDocMarkupArtifact<'1.0.0'>>;
/**
 * @lang zh-CN 只读sln/csproj静态信息；至少提供path或paths，不restore/build输入项目；非法定位器或I/O失败reject。
 * @lang en Reads static sln/csproj information with at least path or paths, without restoring/building input projects; invalid locators or I/O failures reject.
 */
export function extractDotnetProjectDiscovery(request: {
    workspaceRoot: string;
    path?: string | string[];
    paths?: string[];
}): Promise<DotnetDocProjectArtifact<'1.0.0'>>;
