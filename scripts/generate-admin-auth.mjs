import { createPasswordHash } from '../src/lib/crypto.mjs';

const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 8) {
  process.stderr.write('请设置 ADMIN_PASSWORD（至少 8 位）后重试。\n');
  process.exit(1);
}

const record = await createPasswordHash(password);
process.stdout.write(`${JSON.stringify({
  salt: record.salt,
  hash: record.hash,
  sessionVersion: 1
}, null, 2)}\n`);
process.stderr.write('请将以上内容写入 KV 键 admin_auth。不要在公开 API 或仓库中保存明文密码。\n');
