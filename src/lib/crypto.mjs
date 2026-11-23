const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashPassword(password, salt) {
  const saltBytes = typeof salt === 'string' ? base64UrlToBytes(salt) : salt;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

export async function createPasswordHash(password) {
  const salt = generateSalt();
  return { salt, hash: await hashPassword(password, salt) };
}

export async function verifyPassword(password, record) {
  if (!record || typeof record.salt !== 'string' || typeof record.hash !== 'string') return false;
  const candidate = await hashPassword(password, record.salt);
  return constantTimeEqual(candidate, record.hash);
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(payload, secret) {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)));
  return `${body}.${bytesToBase64Url(signature)}`;
}

export async function verifySession(token, secret) {
  if (!secret || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [body, signature] = parts;
  try {
    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, base64UrlToBytes(signature), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(base64UrlToBytes(body)));
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
