/** @file 将.NET运行器以已确认主SDK1.0.0生产者身份暴露；领域wire独立版本化，不额外授予目标执行权限。 @lang en Exposes the .NET runner under the confirmed main SDK 1.0.0 producer identity; domain wires remain independently versioned without granting target execution rights. */
import {
  DOTNETDOC_INPUT_KINDS,
  DOTNETDOC_OUTPUT_KINDS,
  DOTNETDOC_RUNNER_VERSION,
  runDotnetDoc
} from "@hia-doc/dotnetdoc-runner";

/** .NET静态文档输入/输出描述，不支持watch/incremental；精确来源能力由实际产物声明。 @lang en Static .NET documentation input/output descriptor without watch/incremental support; actual artifacts declare exact source capabilities. */
export const dotnetdocProducerDescriptor = Object.freeze({
  /**
   * @lang zh-CN 生产器协议身份，用于宿主发现和校验。
   * @lang en Producer contract identity used for host discovery and validation.
   */
  contract: "documentation-producer",
  /**
   * @lang zh-CN 生产器协议版本，用于主SDK精确匹配。
   * @lang en Producer contract version used for exact matching by the main SDK.
   */
  contractVersion: "1.0.0",
  /**
   * @lang zh-CN 当前文档生产器的稳定领域标识。
   * @lang en Stable domain identifier of this documentation producer.
   */
  id: "dotnetdoc",
  /**
   * @lang zh-CN 生产器实现版本，取自当前运行器。
   * @lang en Producer implementation version supplied by the current runner.
   */
  version: DOTNETDOC_RUNNER_VERSION,
  /**
   * @lang zh-CN 供宿主显示的生产器名称。
   * @lang en Producer name presented by the host.
   */
  displayName: "DotNetDoc",
  /**
   * @lang zh-CN 当前运行器接受的显式输入种类。
   * @lang en Explicit input kinds accepted by the current runner.
   */
  inputKinds: [...DOTNETDOC_INPUT_KINDS],
  /**
   * @lang zh-CN 当前运行器声明的输出工件种类。
   * @lang en Output artifact kinds declared by the current runner.
   */
  outputKinds: [...DOTNETDOC_OUTPUT_KINDS],
  /**
   * @lang zh-CN 供主SDK校验的来源关联、增量和监视能力声明。
   * @lang en Source-linkage, incremental and watch capability declarations validated by the main SDK.
   */
  capabilities: {
    /**
     * @lang zh-CN 声明支持来源关联，具体定位精度由实际产物描述。
     * @lang en Declares source-linkage support with precision described by the actual artifacts.
     */
    sourceLinkage: true,
    /**
     * @lang zh-CN 取false，每次执行处理完整请求的输入集。
     * @lang en False selects full processing of the requested input set on each invocation.
     */
    incremental: false,
    /**
     * @lang zh-CN 取false，每次构建由宿主的独立请求触发。
     * @lang en False selects individual host-triggered build requests.
     */
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
