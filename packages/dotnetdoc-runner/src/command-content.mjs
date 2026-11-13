/**
 * @file
 * @lang zh-CN DotNetDoc命令的纯双语内容，供静态帮助及开发期core投影共同使用。
 * @lang en Pure bilingual DotNetDoc command content shared by static help and development-time core projection.
 */
import { DOTNETDOC_RUNNER_VERSION } from "./metadata.mjs";

/** @lang zh-CN 创建独立的原生字段语言模型，键名及两语正文精确保留。
 * @lang en Create an independent native field locale model retaining exact keys and both localized texts.
 * @param {object} fields <lang><zh-CN>中文/英文文本对。</zh-CN><en>Chinese/English text pairs.</en></lang>
 * @returns {object} <lang><zh-CN>1.0.0字段语言模型。</zh-CN><en>A 1.0.0 field locale model.</en></lang>
 */
function localized(fields) {
  return {
    enabled: true,
    model: "hia-text-i18n",
    modelVersion: "1.0.0",
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"],
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        {
          fieldPath: key,
          kind: "text",
          defaultLocale: "zh-CN",
          localizedText: { "zh-CN": value[0], en: value[1] },
        },
      ]),
    ),
  };
}

/** @lang zh-CN 构造参数内容；其名称/类型/短名另由真实parseArgs调用观察。
 * @lang en Construct parameter content, with names, types and short names independently observed from the actual parseArgs call.
 * @param {string} name <lang><zh-CN>原生参数名。</zh-CN><en>Native parameter name.</en></lang>
 * @param {string} zh <lang><zh-CN>中文说明。</zh-CN><en>Chinese description.</en></lang>
 * @param {string} en <lang><zh-CN>英文说明。</zh-CN><en>English description.</en></lang>
 * @param {object} settings <lang><zh-CN>原生类型、短名、显示槽及默认规则。</zh-CN><en>Native type, short name, display slot and default rule.</en></lang>
 * @returns {object} <lang><zh-CN>带未绑定来源的参数内容。</zh-CN><en>Parameter content awaiting provenance binding.</en></lang>
 */
function parameter(name, zh, en, settings = {}) {
  // <lang><zh-CN>显示槽属于文案，位置参数名保留Node原生positionals身份。</zh-CN><en>The displayed slot is prose, while positional names retain Node's native positionals identity.</en></lang>
  const fields = { summary: [zh, en], description: [zh, en] };
  if (settings.metavar) fields.metavar = [settings.metavar, settings.metavar];
  return {
    id: name,
    kind: settings.kind ?? "option",
    name,
    ...(settings.short ? { short: settings.short } : {}),
    valueType: settings.valueType ?? "string",
    required: false,
    multiple: settings.multiple ?? false,
    ...(settings.choices ? { choices: settings.choices } : {}),
    defaultRule: settings.defaultRule ?? {
      kind: "conditional",
      conditions: ["description"],
    },
    i18n: localized(fields),
    evidence: [],
  };
}

/**
 * @lang zh-CN 返回两个包内调用名的独立内容图，规范入口和别名使用既有aliasOf关系。
 * @lang en Return independent content graphs for both packaged invocation names, joining the canonical entry and alias with existing aliasOf semantics.
 * @returns {object[]} <lang><zh-CN>规范入口及其别名，无IO或执行副作用。</zh-CN><en>The canonical entry and its alias without IO or execution effects.</en></lang>
 */
export function createDotnetDocCommands() {
  // <lang><zh-CN>规范入口完整陈述现有六开关与条件XML输入，版本取真实纯元数据。</zh-CN><en>The canonical entry describes all six existing switches and conditional XML inputs, taking its version from actual pure metadata.</en></lang>
  const command = {
    id: "hia-dotnetdoc",
    executable: "hia-dotnetdoc",
    path: [],
    kind: "command",
    signature: "hia-dotnetdoc [options] <documentation.xml...>",
    i18n: localized({
      summary: [
        "生成.NET XML及配置驱动文档",
        "Generate .NET XML and configuration-driven documentation",
      ],
      description: [
        "从显式XML输入或JSON配置生成.NET文档工件及结果清单。",
        "Generate .NET documentation artifacts and a result manifest from explicit XML inputs or JSON configuration.",
      ],
      configUsage: [
        "hia-dotnetdoc --config dotnetdoc.config.json",
        "hia-dotnetdoc --config dotnetdoc.config.json",
      ],
      aliases: [
        "dotnetdoc与hia-dotnetdoc是同一实现的等价调用名，帮助展示规范入口。",
        "dotnetdoc and hia-dotnetdoc are equivalent names for one implementation; help displays the canonical entry.",
      ],
      configOverrides: [
        "配置模式仅非空out-dir覆盖输出；空字符串保留配置。",
        "In config mode only a nonempty out-dir overrides output; an empty string retains the configuration.",
      ],
      directOnly: [
        "workspace-root、title及XML位置输入仅用于直接模式，配置模式忽略。",
        "workspace-root, title and positional XML inputs apply only to direct mode and are ignored in config mode.",
      ],
      paths: [
        "配置路径相对调用目录，配置工作区相对配置目录；直接工作区相对调用目录，输出相对工作区。",
        "Config paths use cwd and configured workspaces use the config directory; direct workspaces use cwd and output uses the workspace.",
      ],
      writes: [
        "运行会创建目录、覆盖工件并写结果清单；partial或failed可能保留已成功写入。",
        "Runs create directories, replace artifacts and write a result manifest; partial or failed results may retain successful writes.",
      ],
      parsing: [
        "Node严格解析先于帮助，未知开关或缺值返回1；重复带值选项取末值，--后作为XML位置输入。",
        "Node strict parsing precedes help; unknown switches or missing values exit 1. Repeated value options use the last value, and tokens after -- are positional XML inputs.",
      ],
      prerequisites: [
        "纯XML抽取无需SDK。配置中的C#抽取或项目源码解析使用.NET10 SDK/helper，其构建可能按SDK设置进行还原及工作负载清单下载。",
        "Plain XML extraction needs no SDK. Configured C# extraction or project source resolution uses the .NET 10 SDK/helper; its build may restore dependencies or download workload manifests according to SDK settings.",
      ],
      offline: [
        "@hia-doc/dotnetdoc-runner/README.md",
        "@hia-doc/dotnetdoc-runner/README.md",
      ],
    }),
    displayVersion: { kind: "runner", value: DOTNETDOC_RUNNER_VERSION },
    parsing: {
      helpOrder: "after-argument-validation",
      unknownOptions: "reject",
    },
    options: [
      parameter(
        "config",
        "从JSON配置构造请求。",
        "Build a request from JSON configuration.",
        {
          short: "c",
          metavar: "path",
          defaultRule: { kind: "not-applicable" },
        },
      ),
      parameter(
        "out-dir",
        "输出相对工作区，直接模式缺省dist/dotnetdoc；直接空字符串指向工作区根。",
        "Output is workspace-relative and defaults to dist/dotnetdoc in direct mode; an empty direct-mode string selects the workspace root.",
        { short: "o", metavar: "path" },
      ),
      parameter(
        "workspace-root",
        "直接模式相对调用目录，省略时为当前目录；配置模式忽略。",
        "Direct mode resolves from cwd and defaults to cwd; ignored in config mode.",
        { metavar: "path" },
      ),
      parameter(
        "title",
        "仅直接模式，为每个XML输入提供同一标题；省略时沿适配器默认，配置模式忽略。",
        "Direct mode only, giving every XML input the same title; omission uses adapter defaults and config mode ignores it.",
        { metavar: "title" },
      ),
      parameter("help", "输出帮助并退出0。", "Print help and exit 0.", {
        short: "h",
        valueType: "boolean",
        defaultRule: { kind: "not-applicable" },
      }),
      parameter(
        "version",
        "输出运行器版本并退出0。",
        "Print runner version and exit 0.",
        {
          short: "v",
          valueType: "boolean",
          defaultRule: { kind: "not-applicable" },
        },
      ),
    ],
    positionals: [
      parameter(
        "positionals",
        "直接模式至少一个相对工作区的XML输入；配置模式忽略。",
        "Direct mode requires at least one workspace-relative XML input; ignored in config mode.",
        {
          kind: "positional",
          metavar: "documentation.xml...",
          multiple: true,
          defaultRule: { kind: "not-applicable" },
        },
      ),
    ],
    examples: [
      "hia-dotnetdoc --config dotnetdoc.config.json",
      "dotnetdoc --title SampleAPI sample.xml",
    ],
    effects: { filesystem: "read-write", network: "explicit" },
    exitCodes: [
      {
        code: 0,
        i18n: localized({
          summary: ["成功、帮助或版本", "Success, help or version"],
          description: ["成功、帮助或版本", "Success, help or version"],
        }),
      },
      {
        code: 1,
        i18n: localized({
          summary: [
            "参数、配置或构建失败",
            "Argument, configuration or build failure",
          ],
          description: [
            "参数/配置错误或partial/failed构建",
            "Argument/configuration errors or partial/failed builds",
          ],
        }),
      },
    ],
    evidence: [],
  };
  // <lang><zh-CN>复制完整别名图，保留独立节点身份和规范入口的帮助正文。</zh-CN><en>Copy the complete alias graph, retaining independent node identities and the canonical entry's help prose.</en></lang>
  const alias = structuredClone(command);
  alias.id = "dotnetdoc";
  alias.executable = "dotnetdoc";
  alias.aliasOf = command.id;
  alias.signature = "dotnetdoc [options] <documentation.xml...>";
  for (const item of [...alias.options, ...alias.positionals])
    item.id = alias.id + "." + item.name;
  return [command, alias];
}
