const PUBLIC_KEYS = [
  'wallpaper', 'dynamicSections', 'friendLinks', 'version', 'updatedAt',
  'siteTitle', 'footerText', 'engines'
];

// 内置默认管理员凭据（D-015）：KV 未写入 admin_auth 时生效，首次登录后必须改密。
// 密码明文 navix666 是公开的初始钥匙；哈希只用于校验，改密后写入 KV 即失效。
const DEFAULT_ADMIN_AUTH = {
  salt: 'KKq8R9kqpu5SnRX_jwjJmw',
  hash: 'eTV180vdugPBulIX0v5Dyn9-LfGS8qUi2Yxt65dHW4c',
  sessionVersion: 1,
  isDefault: true
};

export function getDefaultAdminAuth() {
  return { ...DEFAULT_ADMIN_AUTH };
}

async function kvGet(env, key) {
  if (!env || !env.NAV_DB || typeof env.NAV_DB.get !== 'function') return null;
  return env.NAV_DB.get(key);
}

async function kvPut(env, key, value) {
  if (!env || !env.NAV_DB || typeof env.NAV_DB.put !== 'function') {
    throw new Error('NAV_DB 绑定不可用');
  }
  await env.NAV_DB.put(key, value);
}

export async function getSiteConfig(env) {
  const raw = await kvGet(env, 'site_config');
  if (!raw) return { config: {}, version: 0 };
  try {
    const parsed = JSON.parse(raw);
    const config = {};
    for (const key of PUBLIC_KEYS) {
      if (key in parsed) config[key] = parsed[key];
    }
    const version = typeof parsed.version === 'number' && Number.isFinite(parsed.version) ? parsed.version : 0;
    return { config, version };
  } catch {
    return { config: {}, version: 0 };
  }
}

export async function saveSiteConfig(env, input) {
  const current = await getSiteConfig(env);
  const clean = {};
  for (const key of PUBLIC_KEYS) {
    if (key in input) clean[key] = input[key];
  }
  clean.version = current.version + 1;
  clean.updatedAt = new Date().toISOString();
  await kvPut(env, 'site_config', JSON.stringify(clean));
  return clean;
}

export async function getAdminAuth(env) {
  const raw = await kvGet(env, 'admin_auth');
  if (!raw) return getDefaultAdminAuth();
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.salt !== 'string' || typeof parsed.hash !== 'string') return getDefaultAdminAuth();
    if (typeof parsed.sessionVersion !== 'number' || !Number.isFinite(parsed.sessionVersion)) return getDefaultAdminAuth();
    return parsed;
  } catch {
    return getDefaultAdminAuth();
  }
}

export async function saveAdminAuth(env, record) {
  await kvPut(env, 'admin_auth', JSON.stringify({
    salt: record.salt,
    hash: record.hash,
    sessionVersion: record.sessionVersion,
    updatedAt: new Date().toISOString()
  }));
  return record;
}
