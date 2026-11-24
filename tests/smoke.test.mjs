import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const HTML = readFileSync(join(PUBLIC, 'index.html'), 'utf8');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test('页面无内联脚本与样式，入口引用有效', () => {
  assert.doesNotMatch(HTML, /<script(?![^>]*\bsrc=)[^>]*>/i, '存在内联 <script>');
  assert.doesNotMatch(HTML, /<style\b/i, '存在内联 <style>');
  assert.match(HTML, /<script\s+type="module"\s+src="\/assets\/js\/main\.js"/);
  assert.match(HTML, /<link[^>]+href="\/assets\/css\/app\.css"/);
  assert.ok(existsSync(join(PUBLIC, 'assets/css/app.css')));
  assert.ok(existsSync(join(PUBLIC, 'assets/js/main.js')));
  assert.ok(existsSync(join(PUBLIC, 'ads.txt')));
});

test('所有 ES Module 的相对导入路径都存在', () => {
  const files = walk(join(PUBLIC, 'assets/js')).filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 10, '前端模块数量异常');
  let checked = 0;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const imports = source.matchAll(/(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]/g);
    for (const match of imports) {
      const target = resolve(dirname(file), match[1]);
      assert.ok(existsSync(target), `${relative(ROOT, file)} 引用了不存在的 ${match[1]}`);
      checked += 1;
    }
  }
  assert.ok(checked > 0, '未发现任何模块导入，检查正则是否失效');
});

test('内联处理器引用的函数均已挂载到 window', () => {
  const mounted = readFileSync(join(PUBLIC, 'assets/js/main.js'), 'utf8');
  const handlers = new Set();
  const attrs = HTML.matchAll(/\son(?:click|change|input|dragstart|dragend|dragover|drop|dblclick|submit)="([^"]+)"/gi);
  for (const attr of attrs) {
    const calls = attr[1].matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g);
    for (const call of calls) handlers.add(call[1]);
  }
  const reserved = new Set(['event', 'this', 'return', 'if', 'alert', 'confirm']);
  for (const name of handlers) {
    if (reserved.has(name)) continue;
    assert.match(mounted, new RegExp(`\\b${name}\\b`), `内联处理器 ${name} 未在 main.js 挂载`);
  }
  assert.ok(handlers.size > 0, '未发现内联处理器，检查正则是否失效');
});

test('公开目录未混入源码、文档或配置等敏感文件', () => {
  const files = walk(PUBLIC).map((f) => relative(PUBLIC, f).replace(/\\/g, '/'));
  for (const file of files) {
    assert.doesNotMatch(file, /(^|\/)(src|docs|tests|scripts|node_modules|\.git)(\/|$)/, `敏感目录泄露: ${file}`);
    assert.doesNotMatch(file, /(wrangler|\.mjs$|\.test\.|AGENTS|HANDOFF|CURRENT_PLAN|DECISIONS|ARCHITECTURE)/i, `敏感文件泄露: ${file}`);
  }
});

test('公开配置响应模板不含任何管理员凭据字段', () => {
  const sources = [
    'src/lib/config.mjs', 'src/routes/config.mjs', 'wrangler.jsonc'
  ];
  for (const file of sources) {
    assert.ok(existsSync(join(ROOT, file)), `${file} 不存在`);
  }
  const routes = readFileSync(join(ROOT, 'src/routes/config.mjs'), 'utf8');
  assert.doesNotMatch(routes, /adminPwd|admin_auth|password/, '配置路由出现凭据字段');
});
