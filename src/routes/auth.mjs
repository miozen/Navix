import { createPasswordHash, verifyPassword, signSession, verifySession } from '../lib/crypto.mjs';
import { getAdminAuth, saveAdminAuth } from '../lib/config.mjs';
import { json } from '../lib/http.mjs';

const COOKIE_NAME = 'nav_session';
const SESSION_MAX_AGE = 60 * 60 * 24;

function cookieAttributes(request, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function sessionCookie(request, token) {
  return `${COOKIE_NAME}=${token}; ${cookieAttributes(request, SESSION_MAX_AGE)}`;
}

function clearSessionCookie(request) {
  return `${COOKIE_NAME}=; ${cookieAttributes(request, 0)}`;
}

export function getSessionToken(request) {
  const cookie = request.headers.get('Cookie') || '';
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) return rest.join('=');
  }
  return '';
}

export async function isAuthenticated(request, env) {
  if (!env.SESSION_SECRET) return false;
  const payload = await verifySession(getSessionToken(request), env.SESSION_SECRET);
  if (!payload || typeof payload.v !== 'number') return false;
  const auth = await getAdminAuth(env);
  if (!auth) return false;
  return payload.v === auth.sessionVersion;
}

// 是否仍在使用内置默认密码（首次登录后必须改密）。
export async function isUsingDefaultAuth(env) {
  const auth = await getAdminAuth(env);
  return auth ? auth.isDefault === true : false;
}

async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

export async function handleLogin(request, env) {
  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);
  if (!env.SESSION_SECRET) return json({ success: false, message: '会话密钥未配置' }, 500);

  const body = await readJson(request);
  if (!body || typeof body.password !== 'string') {
    return json({ success: false, message: '密码不能为空' }, 400);
  }

  const auth = await getAdminAuth(env);
  if (!auth || !(await verifyPassword(body.password, auth))) {
    return json({ success: false, message: '未授权或密码错误' }, 401);
  }

  const token = await signSession(
    { v: auth.sessionVersion, exp: Date.now() + SESSION_MAX_AGE * 1000 },
    env.SESSION_SECRET
  );
  return json(
    {
      success: true,
      message: '登录成功',
      sessionVersion: auth.sessionVersion,
      mustChangePassword: auth.isDefault === true
    },
    200,
    { 'Set-Cookie': sessionCookie(request, token), 'Cache-Control': 'no-store' }
  );
}

export async function handleLogout(request, env) {
  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);
  return json(
    { success: true, message: '已退出登录' },
    200,
    { 'Set-Cookie': clearSessionCookie(request), 'Cache-Control': 'no-store' }
  );
}

export async function handlePassword(request, env) {
  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);
  if (!(await isAuthenticated(request, env))) {
    return json({ success: false, message: '未授权或会话已失效' }, 401);
  }

  const body = await readJson(request);
  if (!body || typeof body.oldPassword !== 'string' || typeof body.newPassword !== 'string') {
    return json({ success: false, message: '旧密码与新密码不能为空' }, 400);
  }
  if (body.newPassword.length < 8) {
    return json({ success: false, message: '新密码至少 8 位' }, 400);
  }

  const auth = await getAdminAuth(env);
  if (!auth || !(await verifyPassword(body.oldPassword, auth))) {
    return json({ success: false, message: '旧密码错误' }, 401);
  }

  const next = await createPasswordHash(body.newPassword);
  await saveAdminAuth(env, {
    salt: next.salt,
    hash: next.hash,
    sessionVersion: auth.sessionVersion + 1
  });

  return json(
    {
      success: true,
      message: '密码已修改，旧会话已失效。KV 最终一致性可能导致失效存在短暂延迟。'
    },
    200,
    { 'Set-Cookie': clearSessionCookie(request), 'Cache-Control': 'no-store' }
  );
}
