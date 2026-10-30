/** @file .NET生产器的ESM结构声明；宿主仍负责执行和公开权限。 @lang en ESM structural declarations for the .NET producer; hosts retain execution and publication authority. */
import type { DotnetDocContext, DotnetDocResult } from '@hia-doc/dotnetdoc-runner';
/** SDK1.0.0描述符；数组保留现有可变性，根对象为只读，不支持watch/incremental。 @lang en SDK 1.0.0 descriptor with existing mutable arrays and a readonly root, without watch/incremental support. */
export const dotnetdocProducerDescriptor: Readonly<{ contract: 'documentation-producer'; contractVersion: '1.0.0'; id: 'dotnetdoc'; version: '1.0.0'; displayName: 'DotNetDoc'; inputKinds: string[]; outputKinds: string[]; capabilities: { sourceLinkage: true; incremental: false; watch: false } }>;
/** 请求由runner实际校验；写配置输出及helper缓存，非法请求/工具/I/O可reject，部分输入失败返回partial/failed。 @lang en The runner validates requests, writes configured outputs/helper caches, may reject invalid requests/tool/I/O failures, and returns partial/failed for individual input failures. */
export const dotnetdocProducer: Readonly<{ descriptor: typeof dotnetdocProducerDescriptor; produce(request: unknown, context?: DotnetDocContext): Promise<DotnetDocResult> }>;
/** default与命名生产器为同一对象，无额外副作用。 @lang en The default and named producer are the same object without additional side effects. */
export default dotnetdocProducer;
