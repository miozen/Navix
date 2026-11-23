import { isAuthenticated } from './auth.mjs';
import { getSiteConfig, saveSiteConfig } from '../lib/config.mjs';
import { sanitizeConfig } from '../lib/validation.mjs';
import { json } from '../lib/http.mjs';

export async function handleConfig(request, env) {
  if (request.method === 'GET') {
    try {
      const { config, version } = await getSiteConfig(env);
      return json({ ...config, version }, 200, { 'Cache-Control': 'no-store' });
    } catch {
      return json({ success: false, message: '读取数据失败' }, 500);
    }
  }

  if (request.method === 'POST') {
    if (!(await isAuthenticated(request, env))) {
      return json({ success: false, message: '未授权或会话已失效' }, 401);
    }

    let input;
    try {
      input = await request.json();
    } catch {
      return json({ success: false, message: '数据格式错误' }, 400);
    }

    const sanitized = sanitizeConfig(input);
    if (sanitized.error) return json({ success: false, message: sanitized.error }, 400);

    try {
      const { config: current } = await getSiteConfig(env);
      const merged = { ...current, ...sanitized.value };
      delete merged.version;
      delete merged.updatedAt;
      const saved = await saveSiteConfig(env, merged);
      return json({ success: true, message: '保存成功', version: saved.version });
    } catch {
      return json({ success: false, message: '保存失败' }, 500);
    }
  }

  return json({ success: false, message: 'Method not allowed' }, 405);
}
