/** @file 将.NET运行器以已确认主SDK1.0.0生产者身份暴露；领域wire独立版本化，不额外授予目标执行权限。 @lang en Exposes the .NET runner under the confirmed main SDK 1.0.0 producer identity; domain wires remain independently versioned without granting target execution rights. */
import {
  DOTNETDOC_INPUT_KINDS,
  DOTNETDOC_OUTPUT_KINDS,
  DOTNETDOC_RUNNER_VERSION,
  runDotnetDoc
} from "@hia-doc/dotnetdoc-runner";

/** .NET静态文档输入/输出描述，不支持watch/incremental；精确来源能力由实际产物声明。 @lang en Static .NET documentation input/output descriptor without watch/incremental support; actual artifacts declare exact source capabilities. */
export const dotnetdocProducerDescriptor = Object.freeze({
  contract: "documentation-producer",
  contractVersion: "1.0.0",
  id: "dotnetdoc",
  version: DOTNETDOC_RUNNER_VERSION,
  displayName: "DotNetDoc",
  inputKinds: [...DOTNETDOC_INPUT_KINDS],
  outputKinds: [...DOTNETDOC_OUTPUT_KINDS],
  capabilities: {
    sourceLinkage: true,
    incremental: false,
    watch: false
  }
});

/** 委托相同公开runner并传递宿主上下文；不把descriptor当执行许可。 @lang en Delegates to the same public runner and forwards host context without treating the descriptor as execution permission. */
export const dotnetdocProducer = Object.freeze({
  descriptor: dotnetdocProducerDescriptor,
  /**
   * 按runner既有边界处理输入并写配置输出，异步返回当前SDK结果。
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
