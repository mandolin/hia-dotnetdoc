/**
 * @file
 * @lang zh-CN 将权威声明或C#文档ID投影为显示签名；不从注释推导类型，不执行源码。
 * @lang en Projects authoritative declarations or C# documentation IDs into display signatures, without inferring types from prose or executing source.
 */

// <lang><zh-CN>只缩写精确的框架类型原子；包含同名字段的业务命名空间不受替换。</zh-CN><en>Abbreviate only exact framework type atoms, leaving similarly named business namespaces unchanged.</en></lang>
const typeAliases = new Map(Object.entries({
  "System.Boolean": "bool", "System.Byte": "byte", "System.SByte": "sbyte", "System.Int16": "short", "System.UInt16": "ushort",
  "System.Int32": "int", "System.UInt32": "uint", "System.Int64": "long", "System.UInt64": "ulong", "System.Single": "float",
  "System.Double": "double", "System.Decimal": "decimal", "System.Char": "char", "System.String": "string", "System.Object": "object", "System.Void": "void"
}));

/**
 * @lang zh-CN 优先显式/Roslyn声明；否则只显示文档ID能够证明的成员名与参数类型。
 * @lang en Prefers explicit/Roslyn declarations, otherwise displaying only member names and parameter types established by the documentation ID.
 * @param {object} member <lang><zh-CN>调用者拥有的抽取成员；不修改，returns自然语言从不作为类型输入。</zh-CN><en>Caller-owned extracted member, never modified; natural-language returns content is never a type input.</en></lang>
 * @returns {{text: string, source: string, missingInformation: string[]}} <lang><zh-CN>新显示记录；XML未知返回/类型、参数名和ref修饰精度明确保留，不构成C#编译或权限证明。</zh-CN><en>New display record retaining unknown XML return/type, parameter-name and ref-modifier precision; not proof of C# compilation or permission.</en></lang>
 */
export function createDotnetMemberSignature(member) {
  // <lang><zh-CN>显式签名是上游提供的数据，不重新解释为可执行声明；HTML转义归renderer负责。</zh-CN><en>Explicit signatures are upstream data, not reinterpreted as executable declarations; HTML escaping belongs to the renderer.</en></lang>
  if (typeof member.signature === "string" && member.signature.trim()) return { text: member.signature, source: "provided", missingInformation: [] };
  if (typeof member.semantic?.signature === "string" && member.semantic.signature.trim()) return { text: member.semantic.signature, source: "roslyn-declaration", missingInformation: [] };

  // <lang><zh-CN>原始ID只用于显示解析；未知/畸形ID保留原文，不丢成员或声称已解析。</zh-CN><en>The raw ID is used only for display parsing; preserve unknown/malformed IDs rather than dropping members or claiming resolution.</en></lang>
  const raw = typeof member.memberName === "string" ? member.memberName : String(member.name ?? member.id ?? "unknown member");
  const match = /^([NTMPFE]):(.+)$/u.exec(raw);
  if (!match) return { text: raw, source: "documentation-id", missingInformation: ["declaration"] };
  const [, kind, body] = match;
  const conversion = body.lastIndexOf("~");
  const declaration = conversion >= 0 ? body.slice(0, conversion) : body;
  const returnType = typeof member.semantic?.returnType === "string" && member.semantic.returnType.trim()
    ? member.semantic.returnType
    : conversion >= 0 ? body.slice(conversion + 1) : undefined;
  const open = declaration.indexOf("(");
  const closed = declaration.endsWith(")");
  if (open >= 0 && !closed) return { text: raw, source: "documentation-id", missingInformation: ["declaration"] };
  const encodedName = open >= 0 ? declaration.slice(0, open) : declaration;
  const parameters = open >= 0 ? splitParameterTypes(declaration.slice(open + 1, -1)) : [];
  if (!parameters) return { text: raw, source: "documentation-id", missingInformation: ["declaration"] };

  // <lang><zh-CN>构造器无返回类型；普通方法的缺失返回类型不能默认成void。</zh-CN><en>Constructors have no return type; missing ordinary-method return types must never default to void.</en></lang>
  const constructor = /\.#c(?:ctor|tor)$/u.test(encodedName);
  const staticConstructor = encodedName.endsWith(".#cctor");
  const name = displayDeclarationName(constructor ? encodedName.replace(/\.#c(?:ctor|tor)$/u, "") : encodedName);
  const argumentText = parameters.map(displayType).join(", ");
  const suffix = kind === "M" ? `(${argumentText})` : open >= 0 ? `[${argumentText}]` : "";
  const missingInformation = [];
  if (parameters.length) missingInformation.push("parameterNames");
  if (parameters.some((parameter) => parameter.includes("@"))) missingInformation.push("refKind");
  if (declaration.includes("`")) missingInformation.push("genericParameterNames");
  const typedMember = kind === "M" || kind === "P" || kind === "F" || kind === "E";
  const unknownType = typedMember && !constructor && !returnType;
  if (unknownType) missingInformation.push(kind === "M" ? "returnType" : "type");
  const typePrefix = returnType && !constructor ? `${displayType(returnType)} ` : staticConstructor ? "static " : "";
  const unknownSuffix = unknownType ? kind === "M" ? " /* return type unavailable */" : " /* type unavailable */" : "";
  return { text: `${typePrefix}${name}${suffix}${unknownSuffix}`, source: "documentation-id", missingInformation };
}

/** @lang zh-CN 按泛型/数组/嵌套括号深度拆分文档ID参数，保留类型内部的逗号；畸形括号返回undefined。 @lang en Splits ID parameters by generic/array/nested-parenthesis depth, preserving internal commas and returning undefined for malformed delimiters. */
function splitParameterTypes(text) {
  if (!text) return [];
  // <lang><zh-CN>栈只保存当前类型的闭括号，段落边界不改变输入正文。</zh-CN><en>The stack stores only closing delimiters for the current type, and segment boundaries never alter input text.</en></lang>
  const closers = { "{": "}", "[": "]", "(": ")" };
  const stack = [];
  const result = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (Object.hasOwn(closers, character)) stack.push(closers[character]);
    else if ("}])".includes(character)) {
      if (stack.pop() !== character) return undefined;
    } else if (character === "," && stack.length === 0) {
      if (index === start) return undefined;
      result.push(text.slice(start, index));
      start = index + 1;
    }
  }
  if (stack.length || start === text.length) return undefined;
  result.push(text.slice(start));
  return result;
}

/** @lang zh-CN 解码声明名中的泛型元数与显式接口分隔；未知参数名采用明确的序号占位。 @lang en Decodes declaration generic arities and explicit-interface separators, using explicit numbered placeholders for unknown parameter names. */
function displayDeclarationName(text) {
  return text.replace(/(`{1,2})(\d+)/gu, (whole, ticks, count) => {
    // <lang><zh-CN>超大/非法元数保留编码原文，限制占位展开而不伪造较小元数。</zh-CN><en>Preserve oversized/invalid arity text, bounding placeholder expansion without inventing a smaller arity.</en></lang>
    const arity = Number(count);
    if (!Number.isSafeInteger(arity) || arity > 128) return whole;
    return `<${Array.from({ length: arity }, (_, index) => `${ticks.length === 2 ? "TMethod" : "T"}${index + 1}`).join(", ")}>`;
  }).replaceAll("#", ".");
}

/** @lang zh-CN 解码已知类型记法；by-ref以&保留，不将无法区分的ref/out/in猜成某一个。 @lang en Decodes known type notation, retaining by-ref as & rather than guessing one of indistinguishable ref/out/in modifiers. */
function displayType(text) {
  // <lang><zh-CN>超出安全整数范围的序号保留原编码，避免Infinity或舍入伪造参数身份。</zh-CN><en>Preserve indices outside the safe integer range instead of inventing parameter identities through Infinity or rounding.</en></lang>
  return text.replace(/``(\d+)/gu, (whole, index) => Number.isSafeInteger(Number(index) + 1) ? `TMethod${Number(index) + 1}` : whole)
    .replace(/(?<!`)`(\d+)/gu, (whole, index) => Number.isSafeInteger(Number(index) + 1) ? `TType${Number(index) + 1}` : whole)
    .replace(/[A-Za-z_][A-Za-z0-9_.]*/gu, (atom) => typeAliases.get(atom) ?? atom)
    .replaceAll("{", "<").replaceAll("}", ">").replaceAll(",", ", ")
    .replace(/\[[0-9:,\-\s]*\]/gu, (rank) => `[${",".repeat((rank.match(/,/gu) ?? []).length)}]`)
    .replaceAll("@", "&");
}
