/** @file 同步/检查随包16个本地schema资源，不读取URL或重写冻结旧产物。 @lang en Synchronizes/checks sixteen bundled local schema resources without reading URLs or rewriting frozen legacy artifacts. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOTNETDOC_ARTIFACT_CONTRACTS, getDotnetDocArtifactSchema } from '../packages/dotnetdoc-spec/src/index.mjs';
import { getDotnetDocConfigSchema } from '../packages/dotnetdoc-runner/src/index.mjs';

/** 唯一允许写入的模式需显式--write；默认只读检查。 @lang en Writing requires explicit --write; read-only checking is the default. */
const mode = process.argv[2] ?? '--check';
assert.ok(['--write', '--check'].includes(mode), 'Expected --write or --check.');
/** 资源位置固定owner packages目录，不接受用户路径。 @lang en Resource locations are fixed within the owner's packages directory, with no user-supplied paths. */
const root = fileURLToPath(new URL('../', import.meta.url));
const resources = [];
for (const version of ['0.1.0-draft', '1.0.0']) {
  for (const contract of DOTNETDOC_ARTIFACT_CONTRACTS) resources.push({ directory: 'dotnetdoc-spec', name: `${contract}-${version}.schema.json`, schema: getDotnetDocArtifactSchema(contract, version) });
  resources.push({ directory: 'dotnetdoc-runner', name: `dotnetdoc-config-${version}.schema.json`, schema: getDotnetDocConfigSchema(version) });
}
for (const resource of resources) {
  // <lang><zh-CN>每份资源由其精确内存schema序列化；检查比较结构，不受检出CRLF影响。</zh-CN><en>Serialize each resource from its exact in-memory schema; check structural equality independently of checkout CRLF.</en></lang>
  const directory = path.join(root, 'packages', resource.directory, 'src/schemas');
  const target = path.join(directory, resource.name);
  if (mode === '--write') {
    await mkdir(directory, { recursive: true });
    await writeFile(target, JSON.stringify(resource.schema, null, 2) + '\n');
  } else {
    assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), resource.schema, `Bundled schema drift: ${resource.name}`);
  }
}
console.log(`DotNetDoc bundled contract schemas ${mode === '--write' ? 'written' : 'checked'}: ${resources.length}.`);
