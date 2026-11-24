import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import { createPasswordHash } from '../src/lib/crypto.mjs';

const BASE = 'https://nav.example.com';
const PASSWORD = 'admin12345';

function setupEnv() {
  const store = new Map();
  return {
    store,
    env: {
      NAV_DB: {
        get: async (key) => store.get(key) ?? null,
        put: async (key, value) => { store.set(key, value); }
      },
      SESSION_SECRET: 'integration-test-secret'
    }
  };
}

async function seedAdmin(env) {
  const record = await createPasswordHash(PASSWORD);
  await env.NAV_DB.put('admin_auth', JSON.stringify({ ...record, sessionVersion: 1 }));
}

function request(path, { headers = {}, ...options } = {}) {
  return new Request(`${BASE}${path}`, {
    headers: { Origin: BASE, ...headers },
    ...options
  });
}

test('匿名 GET /api/config 不返回管理员凭据', async () => {
  const { env } = setupEnv();
  await seedAdmin(env);
  await env.NAV_DB.put('site_config', JSON.stringify({ wallpaper: '', adminPwd: 'leaked' }));
  const res = await worker.fetch(request('/api/config'), env);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal('adminPwd' in body, false);
});

test('登录、白名单校验与配置保存流程', async () => {
  const { env, store } = setupEnv();
  await seedAdmin(env);

  const bad = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong-password' })
  }), env);
  assert.equal(bad.status, 401);

  const login = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD })
  }), env);
  assert.equal(login.status, 200);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  assert.match(login.headers.get('Set-Cookie'), /HttpOnly/);
  assert.match(login.headers.get('Set-Cookie'), /SameSite=Strict/);

  const invalidSave = await worker.fetch(request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ adminPwd: 'injected' })
  }), env);
  assert.equal(invalidSave.status, 400);

  const validSave = await worker.fetch(request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ wallpaper: 'https://example.com/bg.jpg', friendLinks: [] })
  }), env);
  assert.equal(validSave.status, 200);
  assert.equal('adminPwd' in JSON.parse(store.get('site_config')), false);
});

test('跨源写请求被拒绝，遗留接口已关闭', async () => {
  const { env } = setupEnv();
  const cross = await worker.fetch(new Request(`${BASE}/api/config`, {
    method: 'POST',
    headers: { Origin: 'https://evil.example.com' }
  }), env);
  assert.equal(cross.status, 403);

  const legacy = await worker.fetch(request('/api/links'), env);
  assert.equal(legacy.status, 410);
});

test('修改密码后旧会话失效，新密码可登录', async () => {
  const { env } = setupEnv();
  await seedAdmin(env);

  const login = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD })
  }), env);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];

  const change = await worker.fetch(request('/api/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ oldPassword: PASSWORD, newPassword: 'new-password-123' })
  }), env);
  assert.equal(change.status, 200);

  const staleSave = await worker.fetch(request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ friendLinks: [] })
  }), env);
  assert.equal(staleSave.status, 401);

  const relogin = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'new-password-123' })
  }), env);
  assert.equal(relogin.status, 200);
});

test('过期版本触发尽力而为冲突提示', async () => {
  const { env, store } = setupEnv();
  await seedAdmin(env);
  await env.NAV_DB.put('site_config', JSON.stringify({ wallpaper: '', friendLinks: [], version: 7 }));

  const login = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD })
  }), env);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];

  const conflict = await worker.fetch(request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ version: 3, wallpaper: 'https://example.com/old.jpg' })
  }), env);
  const body = await conflict.json();
  assert.equal(conflict.status, 409);
  assert.equal(body.conflict, true);
  assert.equal(body.currentVersion, 7);
  assert.equal(JSON.parse(store.get('site_config')).version, 7);
});

test('写接口拒绝错误方法，未知路径返回 404', async () => {
  const { env } = setupEnv();
  for (const path of ['/api/login', '/api/logout', '/api/password']) {
    const res = await worker.fetch(request(path), env);
    assert.equal(res.status, 405, `${path} 应拒绝 GET`);
  }
  const put = await worker.fetch(request('/api/config', { method: 'PUT' }), env);
  assert.equal(put.status, 405);
  const unknown = await worker.fetch(request('/api/nope'), env);
  assert.equal(unknown.status, 404);
  const notApi = await worker.fetch(request('/'), env);
  assert.equal(notApi.status, 404);
});

test('未授权 POST 配置返回 401，缺少会话密钥返回 500', async () => {
  const { env } = setupEnv();
  await seedAdmin(env);
  const unauthorized = await worker.fetch(request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendLinks: [] })
  }), env);
  assert.equal(unauthorized.status, 401);

  const noSecret = setupEnv();
  noSecret.env.SESSION_SECRET = '';
  const res = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD })
  }), noSecret.env);
  assert.equal(res.status, 500);
});

test('改密拒绝过短新密码与错误旧密码', async () => {
  const { env } = setupEnv();
  await seedAdmin(env);
  const login = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD })
  }), env);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];

  const tooShort = await worker.fetch(request('/api/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ oldPassword: PASSWORD, newPassword: 'short' })
  }), env);
  assert.equal(tooShort.status, 400);

  const wrongOld = await worker.fetch(request('/api/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ oldPassword: 'wrong', newPassword: 'new-password-123' })
  }), env);
  assert.equal(wrongOld.status, 401);
});

test('退出登录清除会话 Cookie', async () => {
  const { env } = setupEnv();
  const res = await worker.fetch(request('/api/logout', { method: 'POST' }), env);
  assert.equal(res.status, 200);
  const cookie = res.headers.get('Set-Cookie');
  assert.match(cookie, /nav_session=;/);
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /HttpOnly/);
});

test('畸形 JSON 请求体返回 400', async () => {
  const { env } = setupEnv();
  await seedAdmin(env);
  const login = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD })
  }), env);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];

  const malformed = await worker.fetch(request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: 'this is not json'
  }), env);
  assert.equal(malformed.status, 400);
});

test('默认密码可登录并标记必须改密', async () => {
  const { env } = setupEnv();
  const login = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'navix666' })
  }), env);
  assert.equal(login.status, 200);
  const body = await login.json();
  assert.equal(body.mustChangePassword, true);
});

test('默认密码态禁止保存配置，改密后放行', async () => {
  const { env, store } = setupEnv();
  const login = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'navix666' })
  }), env);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];

  const blocked = await worker.fetch(request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ friendLinks: [] })
  }), env);
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).mustChangePassword, true);

  const relogin = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'navix666' })
  }), env);
  const cookie2 = relogin.headers.get('Set-Cookie').split(';')[0];
  const change = await worker.fetch(request('/api/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie2 },
    body: JSON.stringify({ oldPassword: 'navix666', newPassword: 'my-own-pass-123' })
  }), env);
  assert.equal(change.status, 200);
  assert.ok(store.get('admin_auth'), '改密后应写入 KV');

  const login2 = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'my-own-pass-123' })
  }), env);
  assert.equal(login2.status, 200);
  assert.equal((await login2.json()).mustChangePassword, false);

  const cookie3 = login2.headers.get('Set-Cookie').split(';')[0];
  const save = await worker.fetch(request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie3 },
    body: JSON.stringify({ friendLinks: [] })
  }), env);
  assert.equal(save.status, 200);
});

test('改密后默认密码失效', async () => {
  const { env } = setupEnv();
  const login = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'navix666' })
  }), env);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  await worker.fetch(request('/api/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ oldPassword: 'navix666', newPassword: 'my-own-pass-123' })
  }), env);

  const stale = await worker.fetch(request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'navix666' })
  }), env);
  assert.equal(stale.status, 401);
});
