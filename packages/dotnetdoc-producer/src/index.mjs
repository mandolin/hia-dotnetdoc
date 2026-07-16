import {
  DOTNETDOC_INPUT_KINDS,
  DOTNETDOC_OUTPUT_KINDS,
  DOTNETDOC_RUNNER_VERSION,
  runDotnetDoc
} from "@hia-doc/dotnetdoc-runner";

export const dotnetdocProducerDescriptor = Object.freeze({
  contract: "documentation-producer",
  contractVersion: "0.1.0-draft",
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

export const dotnetdocProducer = Object.freeze({
  descriptor: dotnetdocProducerDescriptor,
  produce(request, context = {}) {
    return runDotnetDoc(request, context);
  }
});

export default dotnetdocProducer;
