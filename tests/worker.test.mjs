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
