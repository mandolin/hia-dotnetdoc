/** @file 安装后NodeNext类型消费样本，仅静态编译，不执行或发布。 @lang en Installed NodeNext type-consumer fixture for static compilation only, without execution or publication. */
import * as spec from '@hia-doc/dotnetdoc-spec';
import * as xml from '@hia-doc/dotnet-xml-doc-extractor';
import * as source from '@hia-doc/dotnet-source-extractor';
import * as adapter from '@hia-doc/dotnetdoc-adapter';
import * as runner from '@hia-doc/dotnetdoc-runner';
import producer, { dotnetdocProducer, dotnetdocProducerDescriptor } from '@hia-doc/dotnetdoc-producer';
import type { DocumentationProducer } from '@hia-doc/plugin-sdk';

/** 与真实SDK结构兼容，不用类型断言掩盖配对错误。 @lang en Structural compatibility with the actual SDK, without type assertions hiding pairing errors. */
const sdkProducer: DocumentationProducer = producer;
/** XML公开返回的当前身份须是字面量而非任意string。 @lang en The XML API's current identity must be a literal rather than an arbitrary string. */
const xmlArtifact = xml.extractDotnetXmlDocs('<doc><members><member name="T:Sample.Widget" /></members></doc>');
/** 当前领域版本与来源映射版本分别验证。 @lang en Check current domain and source-map versions independently. */
const current: '1.0.0' = xmlArtifact.contractVersion;
/** 配置省略目录按实际默认处理，不把内存绝对路径当配置必需字段。 @lang en Config directory omissions use actual defaults instead of requiring in-memory absolute paths. */
const config: runner.DotnetDocCurrentConfig = { schemaVersion: '1.0.0', inputs: [{ kind: 'dotnet-xml-doc', path: 'input.xml' }] };
/** 纯读取保留两代联合，使用前须按版本缩窄。 @lang en Pure reading retains both generations, requiring version narrowing before use. */
const read = runner.readDotnetDocConfig(config);
if (read.schemaVersion === '1.0.0') {
  // <lang><zh-CN>缩窄后才将根身份交给当前配置消费者。</zh-CN><en>Pass the root identity to a current-config consumer only after narrowing.</en></lang>
  const version: '1.0.0' = read.schemaVersion;
  void version;
}
/** 未知扩展不是隐式动态类型；使用前必须验证。 @lang en Unknown extensions are not implicit dynamic types; validate before use. */
const extensions = spec.readDotnetDocArtifact(xmlArtifact);
// @ts-expect-error 中文：metadata扩展未知。 English: Metadata extensions are unknown.
const unsafe: string = extensions.arbitraryMetadata;
// @ts-expect-error 中文：配置未知版本应被拒绝。 English: Unknown config versions must be refused.
const wrongVersion: runner.DotnetDocCurrentConfig = { ...config, schemaVersion: '99.0.0' };
// @ts-expect-error 中文：新版显式null不是目录默认。 English: Explicit current null is not a directory default.
const nullDirectory: runner.DotnetDocCurrentConfig = { ...config, outputDirectory: null };
// @ts-expect-error 中文：未知kind不应进入runner类型。 English: Unknown kinds must not enter runner types.
const wrongKind: runner.DotnetDocInput = { kind: 'other', path: 'input.xml' };
// @ts-expect-error 中文：地图版本独立为1.1.0。 English: The independent map version is 1.1.0.
const wrongMap: '1.0.0' = runner.DOTNETDOC_DOC_SOURCE_MAP_CONTRACT_VERSION;
// <lang><zh-CN>只建立函数引用，不运行会写文件或调用helper的API。</zh-CN><en>Create function references only, without executing file-writing or helper-invoking APIs.</en></lang>
void [sdkProducer, current, unsafe, wrongVersion, nullDirectory, wrongKind, wrongMap, xml.createDotnetMemberId, source.extractDotnetSourceFiles, source.extractAspNetEndpoints, source.extractDotnetMarkupComments, source.extractDotnetProjectDiscovery, adapter.assertDotnetXmlDocArtifact, adapter.assertDotnetAspNetEndpointArtifact, adapter.assertDotnetMarkupCommentArtifact, adapter.assertDotnetProjectDiscoveryArtifact, adapter.dotnetXmlDocsToHiaDocument, adapter.dotnetAspNetEndpointsToHiaDocument, adapter.dotnetMarkupCommentsToHiaDocument, adapter.dotnetProjectDiscoveryToHiaDocument, runner.runDotnetDoc, runner.loadDotnetDocConfig, runner.migrateDotnetDocConfig, runner.getDotnetDocConfigSchema, runner.classifyDotnetBuildDiagnostics, runner.createDotnetDocSourceMap, dotnetdocProducer, dotnetdocProducerDescriptor];
