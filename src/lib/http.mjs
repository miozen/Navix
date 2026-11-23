export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}

export function isSameOrigin(request) {
  const expected = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      return new URL(origin).origin === expected;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      return new URL(referer).origin === expected;
    } catch {
      return false;
    }
  }
  return false;
}
