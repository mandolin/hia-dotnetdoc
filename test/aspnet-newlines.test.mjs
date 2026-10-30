/** @file 静态控制器扫描在LF/CRLF/混合换行下保持路由、属性与原始位置。 @lang en Keeps static controller routes, attributes and original positions consistent across LF, CRLF and mixed newlines. */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { extractAspNetEndpoints } from '../packages/dotnet-source-extractor/src/index.mjs';

/** 固定自有控制器fixture，只替换行分隔符，不修改声明或属性语义。 @lang en Owned controller fixture with only line separators varied, leaving declarations and attributes unchanged. */
const fixture = (await readFile(new URL('../fixtures/source/Portal.Web/Controllers/BooksController.cs', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
for (const mode of ['LF', 'CRLF', 'mixed']) {
  it(`preserves controller attributes and source positions with ${mode} newlines`, async (context) => {
    // <lang><zh-CN>临时输入只由本测试拥有，结束后清理；不触及业务仓或原fixture。</zh-CN><en>The test owns and cleans its temporary input without touching business repositories or the original fixture.</en></lang>
    const root = await mkdtemp(path.join(tmpdir(), 'dotnetdoc-route-newlines-'));
    context.after(() => rm(root, { recursive: true, force: true }));
    // <lang><zh-CN>混合模式交替保存1与2个UTF-16单元的换行，检验累计偏移而非只核文本。</zh-CN><en>Mixed mode alternates one- and two-code-unit separators to test accumulated offsets rather than text alone.</en></lang>
    let separator = 0;
    const text = fixture.replace(/\n/gu, () => mode === 'CRLF' || (mode === 'mixed' && separator++ % 2 === 0) ? '\r\n' : '\n');
    await writeFile(path.join(root, 'BooksController.cs'), text);
    const artifact = await extractAspNetEndpoints({ workspaceRoot: root, applicationRoot: '.', paths: ['BooksController.cs'] });
    assert.equal(artifact.endpoints.length, 2);
    // <lang><zh-CN>每个动作都保留属性路由、授权与原始行列；不接受丢动作后只改计数。</zh-CN><en>Every action must retain its route, authorization and original position; changing counts after losing an action is not accepted.</en></lang>
    for (const name of ['Get', 'Create']) {
      const endpoint = artifact.endpoints.find((item) => item.displayName === `BooksController.${name}`);
      assert.ok(endpoint, name);
      const offset = text.indexOf(`public IActionResult ${name}`);
      const lines = text.slice(0, offset).split(/\r?\n/u);
      assert.deepEqual(endpoint.source.range.start, { line: lines.length, column: lines.at(-1).length + 1 });
      assert.equal(endpoint.route.template, name === 'Get' ? 'api/Books/{id}' : 'api/Books');
      assert.equal(endpoint.httpMethods[0], name === 'Get' ? 'GET' : 'POST');
      assert.equal(endpoint.metadata.aspnetCore.authorization.allowAnonymous, name === 'Get');
    }
  });
}
