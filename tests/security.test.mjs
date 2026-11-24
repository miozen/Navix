import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPasswordHash, verifyPassword, signSession, verifySession,
  bytesToBase64Url, base64UrlToBytes, constantTimeEqual, generateSalt
} from '../src/lib/crypto.mjs';
import { sanitizeConfig, normalizeUrl } from '../src/lib/validation.mjs';
import { getSiteConfig, saveSiteConfig, getAdminAuth, saveAdminAuth } from '../src/lib/config.mjs';
import { isSameOrigin, json } from '../src/lib/http.mjs';

const SECRET = 'test-session-secret';

test('密码只保存哈希，错误密码无法通过校验', async () => {
  const record = await createPasswordHash('correct-password');
  assert.ok(record.salt);
  assert.ok(record.hash);
  assert.ok(!JSON.stringify(record).includes('correct-password'));
  assert.equal(await verifyPassword('correct-password', record), true);
  assert.equal(await verifyPassword('wrong-password', record), false);
});

test('会话签名可验证，篡改后失效', async () => {
  const token = await signSession({ v: 1, exp: Date.now() + 60000 }, SECRET);
  const payload = await verifySession(token, SECRET);
  assert.equal(payload.v, 1);
  const tampered = token.slice(0, -2) + 'xx';
  assert.equal(await verifySession(tampered, SECRET), null);
  assert.equal(await verifySession(token, 'other-secret'), null);
});

test('过期会话被拒绝', async () => {
  const token = await signSession({ v: 1, exp: Date.now() - 1000 }, SECRET);
  assert.equal(await verifySession(token, SECRET), null);
});

test('配置白名单拒绝凭据字段', () => {
  const result = sanitizeConfig({ wallpaper: '', adminPwd: 'leaked' });
  assert.equal(result.error, '不允许的字段: adminPwd');
});

test('配置白名单拒绝非 http(s) URL', () => {
  const result = sanitizeConfig({ wallpaper: 'javascript:alert(1)' });
  assert.ok(result.error);
  assert.match(result.error, /wallpaper/);
});

test('配置白名单接受合法字段', () => {
  const result = sanitizeConfig({
    wallpaper: 'https://example.com/bg.jpg',
    friendLinks: [{ name: 'Example', url: 'https://example.com' }],
    dynamicSections: []
  });
  assert.equal(result.error, undefined);
  assert.equal(result.value.wallpaper, 'https://example.com/bg.jpg');
  assert.equal(result.value.friendLinks.length, 1);
});

test('配置校验接受站点标题、页脚与自定义搜索引擎', () => {
  const result = sanitizeConfig({
    siteTitle: 'Mio 导航',
    footerText: '自定义页脚',
    engines: [
      { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={q}', icon: 'fab fa-google' },
      { id: 'my-engine', name: '自建', url: 'https://example.com/s?word={q}&lang=zh', icon: '' }
    ]
  });
  assert.equal(result.error, undefined);
  assert.equal(result.value.siteTitle, 'Mio 导航');
  assert.equal(result.value.footerText, '自定义页脚');
  assert.equal(result.value.engines.length, 2);
  assert.equal(result.value.engines[1].icon, '');
  assert.match(result.value.engines[1].url, /lang=zh/);
});

test('配置校验拒绝缺少 {q} 或非 http(s) 的引擎模板', () => {
  assert.ok(sanitizeConfig({ engines: [{ id: 'x', name: 'X', url: 'https://example.com/search' }] }).error);
  assert.ok(sanitizeConfig({ engines: [{ id: 'x', name: 'X', url: 'javascript:{q}' }] }).error);
});

test('配置校验拒绝重复或非法引擎 id、空列表与过多引擎', () => {
  const base = { name: 'X', url: 'https://example.com/?q={q}' };
  assert.ok(sanitizeConfig({ engines: [{ ...base, id: 'dup' }, { ...base, id: 'dup' }] }).error);
  assert.ok(sanitizeConfig({ engines: [{ ...base, id: 'bad id!' }] }).error);
  assert.ok(sanitizeConfig({ engines: [] }).error);
  assert.ok(sanitizeConfig({ engines: Array.from({ length: 13 }, (_, i) => ({ ...base, id: 'e' + i })) }).error);
});

test('URL 规范化保留 {q} 占位符与额外查询参数', () => {
  assert.equal(normalizeUrl('https://example.com/s?word={q}&lang=zh'), 'https://example.com/s?word={q}&lang=zh');
});

test('公开配置读取会剔除旧 adminPwd', async () => {
  const kv = {
    get: async () => JSON.stringify({ wallpaper: '', adminPwd: 'leaked', dynamicSections: [], friendLinks: [] })
  };
  const { config } = await getSiteConfig({ NAV_DB: kv });
  assert.equal('adminPwd' in config, false);
});

test('保存配置不会写回 adminPwd', async () => {
  let written = '';
  const kv = { put: async (_key, value) => { written = value; } };
  await saveSiteConfig({ NAV_DB: kv }, { wallpaper: '', adminPwd: 'leaked', dynamicSections: [], friendLinks: [] });
  assert.equal('adminPwd' in JSON.parse(written), false);
});

test('跨源写请求被拒绝', () => {
  const request = new Request('https://nav.example.com/api/config', {
    method: 'POST',
    headers: { Origin: 'https://evil.example.com' }
  });
  assert.equal(isSameOrigin(request), false);
});

test('同源写请求被允许', () => {
  const request = new Request('https://nav.example.com/api/config', {
    method: 'POST',
    headers: { Origin: 'https://nav.example.com' }
  });
  assert.equal(isSameOrigin(request), true);
});

test('Referer 可作为同源校验依据，缺失头信息时拒绝', () => {
  const byReferer = new Request('https://nav.example.com/api/config', {
    method: 'POST',
    headers: { Referer: 'https://nav.example.com/page' }
  });
  assert.equal(isSameOrigin(byReferer), true);
  const noHeaders = new Request('https://nav.example.com/api/config', { method: 'POST' });
  assert.equal(isSameOrigin(noHeaders), false);
  const malformed = new Request('https://nav.example.com/api/config', {
    method: 'POST',
    headers: { Origin: 'not a url' }
  });
  assert.equal(isSameOrigin(malformed), false);
});

test('Base64Url 编解码往返一致且不含填充符', () => {
  const bytes = new Uint8Array([0, 1, 2, 251, 252, 253, 254, 255]);
  const encoded = bytesToBase64Url(bytes);
  assert.equal(encoded.includes('='), false);
  assert.equal(encoded.includes('+'), false);
  assert.equal(encoded.includes('/'), false);
  assert.deepEqual(Array.from(base64UrlToBytes(encoded)), Array.from(bytes));
});

test('常量时间比较对长度与类型差异返回 false', () => {
  assert.equal(constantTimeEqual('abc', 'abc'), true);
  assert.equal(constantTimeEqual('abc', 'abcd'), false);
  assert.equal(constantTimeEqual('abc', null), false);
  assert.notEqual(generateSalt(), generateSalt());
});

test('URL 规范化拒绝非 http(s) 与畸形输入', () => {
  assert.equal(normalizeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(normalizeUrl('  https://example.com/  '), 'https://example.com/');
  assert.equal(normalizeUrl(''), '');
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
  assert.equal(normalizeUrl('ftp://example.com'), null);
  assert.equal(normalizeUrl(123), null);
});

test('配置校验拒绝非对象、超长字段与畸形链接', () => {
  assert.ok(sanitizeConfig(null).error);
  assert.ok(sanitizeConfig([]).error);
  assert.ok(sanitizeConfig({ wallpaper: 'x'.repeat(3000) }).error);
  assert.ok(sanitizeConfig({ friendLinks: [{ name: '', url: 'https://a.com' }] }).error);
  assert.ok(sanitizeConfig({ dynamicSections: [{ id: 's1', title: 't', links: [{ name: 'n', url: 'javascript:x' }] }] }).error);
  assert.ok(sanitizeConfig({ friendLinks: 'nope' }).error);
  assert.ok(sanitizeConfig({ version: -1 }).error);
});

test('损坏的 KV 数据被安全降级，版本递增写入', async () => {
  const kv = { get: async () => '{broken json', put: async () => {} };
  const empty = await getSiteConfig({ NAV_DB: kv });
  assert.deepEqual(empty.config, {});
  assert.equal(empty.version, 0);

  let written = '';
  const store = {
    get: async () => JSON.stringify({ wallpaper: '', version: 4 }),
    put: async (_k, v) => { written = v; }
  };
  const saved = await saveSiteConfig({ NAV_DB: store }, { friendLinks: [] });
  assert.equal(saved.version, 5);
  assert.equal(JSON.parse(written).version, 5);
});

test('管理员记录校验字段完整性，保存时剔除多余字段', async () => {
  const bad = { get: async () => JSON.stringify({ salt: 's', hash: 'h' }) };
  assert.equal((await getAdminAuth({ NAV_DB: bad })).isDefault, true, '无效记录应回退默认凭据');
  const good = { get: async () => JSON.stringify({ salt: 's', hash: 'h', sessionVersion: 2 }) };
  assert.equal((await getAdminAuth({ NAV_DB: good })).sessionVersion, 2);

  let written = '';
  await saveAdminAuth({ NAV_DB: { put: async (_k, v) => { written = v; } } }, {
    salt: 's', hash: 'h', sessionVersion: 3, injected: 'admin888'
  });
  assert.equal('injected' in JSON.parse(written), false);
});

test('json 工具设置 JSON 内容类型与状态码', () => {
  const res = json({ ok: true }, 201, { 'X-Test': '1' });
  assert.equal(res.status, 201);
  assert.match(res.headers.get('Content-Type'), /application\/json/);
  assert.equal(res.headers.get('X-Test'), '1');
});
