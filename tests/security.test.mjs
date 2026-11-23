import test from 'node:test';
import assert from 'node:assert/strict';
import { createPasswordHash, verifyPassword, signSession, verifySession } from '../src/lib/crypto.mjs';
import { sanitizeConfig } from '../src/lib/validation.mjs';
import { getSiteConfig, saveSiteConfig } from '../src/lib/config.mjs';
import { isSameOrigin } from '../src/lib/http.mjs';

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
