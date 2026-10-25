/**
 * @file
 * @lang zh-CN 从已声明项目引用选择只读元数据文件，不执行MSBuild或枚举任意DLL目录。
 * @lang en Selects read-only metadata from declared project references without executing MSBuild or scanning arbitrary DLL directories.
 */
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

/** @lang zh-CN 与项目发现相同的静态XML形态；不求值MSBuild表达式。 @lang en Static project XML shape without evaluating MSBuild expressions. */
const parser = new XMLParser({ignoreAttributes:false,attributeNamePrefix:'',parseTagValue:false,trimValues:true,processEntities:false});

/**
 * @lang zh-CN 为配置项目解析有界元数据引用；所有项目文件/二进制真实路径必须在工作区内。
 * @lang en Resolves bounded metadata references for a configured project; project/binary real paths must stay inside the workspace.
 * @param {object} request <lang><zh-CN>工作区、项目路径与可选XML旁引用目录。</zh-CN><en>Workspace/project paths and an optional XML-adjacent reference directory.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>相对路径、框架版本及固定诊断；不返回二进制内容或绝对路径。</zh-CN><en>Relative paths, framework version and fixed diagnostics without binary contents or absolute paths.</en></lang>
 */
export async function resolveProjectMetadataReferences({workspaceRoot, projectPath, referenceDirectory}) {
  // <lang><zh-CN>同一请求独立积累引用与诊断；项目根先做真实路径验证。</zh-CN><en>References and diagnostics belong to this request; validate the project real path before reading it.</en></lang>
  const project = await readProject(workspaceRoot,projectPath);
  const paths = new Set();
  const diagnostics = [];
  const targetFrameworkVersion = properties(project,'TargetFrameworkVersion').find(value=>/^v\d+(?:\.\d+){1,2}$/u.test(value));
  // <lang><zh-CN>XML所在目录绑定同次构建的copy-local引用；不读取目录中未声明的DLL。</zh-CN><en>The XML directory binds copy-local references from the same build without reading undeclared DLLs in that directory.</en></lang>
  const adjacent = referenceDirectory === undefined ? [] : [referenceDirectory];
  const ownerOutputs = outputDirectories(project,projectPath);
  for(const group of array(project.ItemGroup)) {
    for(const reference of array(group?.Reference)) {
      // <lang><zh-CN>仅带HintPath的程序集在此解析；系统框架引用交由helper对应版本的reference pack处理。</zh-CN><en>Resolve assemblies with HintPath here; the helper handles system references using the matching reference pack.</en></lang>
      if(typeof reference?.HintPath!=='string') continue;
      const declared=relativeFrom(projectPath,reference.HintPath);
      const selected=await chooseExisting(workspaceRoot,[declared],diagnostics);
      if(selected) paths.add(selected);
      else diagnostics.push(referenceDiagnostic('DOTNETDOC_METADATA_REFERENCE_UNAVAILABLE'));
    }
    for(const reference of array(group?.ProjectReference)) {
      if(typeof reference?.Include!=='string') continue;
      try {
        // <lang><zh-CN>程序集名来自被引用项目而非文件名猜测；外部/表达式路径不能进入读取。</zh-CN><en>Read the assembly name from the referenced project rather than guessing it from a filename; external/expression paths cannot be read.</en></lang>
        const referencedPath=relativeFrom(projectPath,reference.Include);
        const referenced=await readProject(workspaceRoot,referencedPath);
        const name=properties(referenced,'AssemblyName')[0] ?? path.posix.basename(referencedPath,'.csproj');
        if(!name || /[/\\:$]/u.test(name)) throw new Error('Unsupported assembly name');
        const local=adjacent.map(directory=>path.posix.join(directory,`${name}.dll`));
        const localPath=await chooseExisting(workspaceRoot,local,diagnostics);
        if(localPath){paths.add(localPath);continue;}
        const candidates=[...ownerOutputs,...outputDirectories(referenced,referencedPath)].map(directory=>path.posix.join(directory,`${name}.dll`));
        const selected=await chooseExisting(workspaceRoot,candidates,diagnostics);
        if(selected) paths.add(selected);
        else diagnostics.push(referenceDiagnostic('DOTNETDOC_METADATA_REFERENCE_UNAVAILABLE'));
      } catch { diagnostics.push(referenceDiagnostic('DOTNETDOC_METADATA_REFERENCE_UNSAFE_OR_UNAVAILABLE')); }
    }
  }
  return {paths:[...paths].sort(),targetFrameworkVersion,diagnostics};
}

/** @lang zh-CN 静态属性值来自项目原文，不解析条件/变量。 @lang en Reads static property values without evaluating conditions or variables. */
function properties(project,name){return [...new Set(array(project.PropertyGroup).map(group=>group?.[name]).filter(value=>typeof value==='string' && value && !value.includes('$(')))];}
/** @lang zh-CN 单节点与列表统一，但不接受空节点作为事实。 @lang en Normalizes singleton/list nodes without treating empty nodes as facts. */
function array(value){return value==null?[]:Array.isArray(value)?value:[value];}
/** @lang zh-CN 合并项目相对路径并拒绝绝对路径/未求值表达式。 @lang en Joins project-relative paths while refusing absolute paths and unevaluated expressions. */
function relativeFrom(project,value){if(typeof value!=='string'||/^(?:[/\\]|[a-z][a-z0-9+.-]*:)/iu.test(value)||value.includes('$('))throw new Error('Unsafe metadata path');return path.posix.normalize(path.posix.join(path.posix.dirname(project),value.replaceAll('\\','/')));}
/** @lang zh-CN 输出目录只来自显式静态属性，条件冲突由候选唯一性裁决。 @lang en Takes output directories from explicit static properties; candidate uniqueness resolves conditional conflicts. */
function outputDirectories(project,projectPath){return properties(project,'OutputPath').map(value=>relativeFrom(projectPath,value));}
/** @lang zh-CN 文件读取前同时验证词法/真实路径包含关系。 @lang en Validates lexical/real-path containment before a file read. */
async function contained(root,relative){
  if(typeof relative!=='string'||/^(?:[/\\]|[a-z][a-z0-9+.-]*:)/iu.test(relative)||relative.split('/').includes('..'))throw new Error('Escaping metadata path');
  const [base,file]=await Promise.all([realpath(root),realpath(path.resolve(root,relative))]);
  const inside=path.relative(base,file);
  if(path.isAbsolute(inside)||inside==='..'||inside.startsWith(`..${path.sep}`))throw new Error('Escaping metadata real path');
  return file;
}
/** @lang zh-CN 只读已验证项目XML，不执行imports或targets。 @lang en Reads validated project XML without executing imports or targets. */
async function readProject(root,relative){return parser.parse(await readFile(await contained(root,relative),'utf8')).Project ?? {};}
/** @lang zh-CN 多配置输出必须唯一；不凭顺序选择不同二进制。 @lang en Requires a unique output across configurations rather than selecting different binaries by order. */
async function chooseExisting(root,candidates,diagnostics){
  const existing=new Map();
  for(const candidate of new Set(candidates)){
    try{if(!/\.dll$/iu.test(candidate))continue;const file=await contained(root,candidate);existing.set(file,candidate);}
    catch(error){if(error.code!=='ENOENT')diagnostics.push(referenceDiagnostic('DOTNETDOC_METADATA_REFERENCE_UNSAFE_OR_UNAVAILABLE'));}
  }
  if(existing.size>1){diagnostics.push(referenceDiagnostic('DOTNETDOC_METADATA_REFERENCE_AMBIGUOUS'));return undefined;}
  return existing.values().next().value;
}
/** @lang zh-CN 固定诊断不含绝对路径、异常正文或二进制内容。 @lang en Fixed diagnostics contain no absolute paths, exception text or binary bodies. */
function referenceDiagnostic(code){return {code,message:'A declared metadata reference is unavailable, unsafe or ambiguous; unresolved types are not guessed.',severity:'warning'};}
