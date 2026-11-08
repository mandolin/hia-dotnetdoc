/** @file 将.NET运行器以已确认主SDK1.0.0生产者身份暴露；领域wire独立版本化，不额外授予目标执行权限。 @lang en Exposes the .NET runner under the confirmed main SDK 1.0.0 producer identity; domain wires remain independently versioned without granting target execution rights. */
import {runDotnetDoc} from '@hia-doc/dotnetdoc-runner';
/** @lang zh-CN 复用纯模块的同一描述符对象。 @lang en Reuses the same descriptor object from its pure module. */
import {dotnetdocProducerDescriptor} from './descriptor.mjs';
export {dotnetdocProducerDescriptor} from './descriptor.mjs';

/**
 * @lang zh-CN 委托相同公开runner并传递宿主上下文；不把descriptor当执行许可。
 * @lang en Delegates to the same public runner and forwards host context without treating the descriptor as execution permission.
 */
export const dotnetdocProducer = Object.freeze({
  descriptor: dotnetdocProducerDescriptor,
  /**
   * @lang zh-CN 按runner既有边界处理输入并写配置输出，异步返回当前SDK结果。
   * @lang en Processes inputs and writes configured output under existing runner boundaries, returning a current SDK result asynchronously.
   * @param {object} request <lang><zh-CN>显式工作区/输入/输出请求。</zh-CN><en>Explicit workspace/input/output request.</en></lang>
   * @param {object} [context] <lang><zh-CN>宿主进度与中止上下文，默认空对象。</zh-CN><en>Host progress/abort context, defaulting to an empty object.</en></lang>
   * @returns {Promise<object>} <lang><zh-CN>documentation-producer-result，不修改目标输入。</zh-CN><en>documentation-producer-result without target-input mutation.</en></lang>
   */
  produce(request, context = {}) {
    return runDotnetDoc(request, context);
  }
});

export default dotnetdocProducer;
