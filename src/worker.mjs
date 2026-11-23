import { handleConfig } from './routes/config.mjs';
import { handleLogin, handleLogout, handlePassword } from './routes/auth.mjs';
import { json, isSameOrigin } from './lib/http.mjs';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;

    if (!path.startsWith('/api/')) {
      return json({ success: false, message: 'Not found' }, 404);
    }

    if (STATE_CHANGING.has(request.method) && !isSameOrigin(request)) {
      return json({ success: false, message: '跨源请求被拒绝' }, 403);
    }

    switch (path) {
      case '/api/config':
        return handleConfig(request, env);
      case '/api/login':
        return handleLogin(request, env);
      case '/api/logout':
        return handleLogout(request, env);
      case '/api/password':
        return handlePassword(request, env);
      case '/api/links':
        return json({ success: false, message: '该接口已废弃' }, 410);
      default:
        return json({ success: false, message: 'Not found' }, 404);
    }
  }
};
