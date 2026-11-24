const ALLOWED_KEYS = new Set([
  'wallpaper', 'dynamicSections', 'friendLinks', 'version', 'updatedAt',
  'siteTitle', 'footerText', 'engines'
]);

function validateString(value, label, maxLength, allowEmpty = true) {
  if (typeof value !== 'string') return { error: `${label} 必须是字符串` };
  if (value.length > maxLength) return { error: `${label} 过长` };
  if (!allowEmpty && value.trim() === '') return { error: `${label} 不能为空` };
  return { value };
}

export function normalizeUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return '';
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

function validateLink(link, label) {
  if (!link || typeof link !== 'object' || Array.isArray(link)) return { error: `${label} 格式无效` };
  const name = validateString(link.name, `${label}.name`, 200, false);
  if (name.error) return name;
  const url = normalizeUrl(link.url);
  if (url === null || url === '') return { error: `${label}.url 必须是 http(s) URL` };
  return { value: { name: name.value, url } };
}

function validateSection(section, index) {
  const label = `dynamicSections[${index}]`;
  if (!section || typeof section !== 'object' || Array.isArray(section)) return { error: `${label} 格式无效` };
  const id = validateString(section.id, `${label}.id`, 100, false);
  if (id.error) return id;
  const title = validateString(section.title, `${label}.title`, 200, false);
  if (title.error) return title;
  if (!Array.isArray(section.links) || section.links.length > 200) return { error: `${label}.links 格式无效` };
  const links = [];
  for (let i = 0; i < section.links.length; i += 1) {
    const result = validateLink(section.links[i], `${label}.links[${i}]`);
    if (result.error) return result;
    links.push(result.value);
  }
  return { value: { id: id.value, title: title.value, links } };
}

export function sanitizeConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: '配置必须是对象' };
  const unknown = Object.keys(input).filter((key) => !ALLOWED_KEYS.has(key));
  if (unknown.length > 0) return { error: `不允许的字段: ${unknown.join(',')}` };

  const value = {};

  if ('wallpaper' in input) {
    const url = normalizeUrl(input.wallpaper);
    if (url === null) return { error: 'wallpaper 必须是 http(s) URL 或空字符串' };
    value.wallpaper = url;
  }

  if ('dynamicSections' in input) {
    if (!Array.isArray(input.dynamicSections) || input.dynamicSections.length > 50) {
      return { error: 'dynamicSections 格式无效' };
    }
    const sections = [];
    for (let i = 0; i < input.dynamicSections.length; i += 1) {
      const result = validateSection(input.dynamicSections[i], i);
      if (result.error) return result;
      sections.push(result.value);
    }
    value.dynamicSections = sections;
  }

  if ('friendLinks' in input) {
    if (!Array.isArray(input.friendLinks) || input.friendLinks.length > 200) {
      return { error: 'friendLinks 格式无效' };
    }
    const links = [];
    for (let i = 0; i < input.friendLinks.length; i += 1) {
      const result = validateLink(input.friendLinks[i], `friendLinks[${i}]`);
      if (result.error) return result;
      links.push(result.value);
    }
    value.friendLinks = links;
  }

  if ('version' in input) {
    if (typeof input.version !== 'number' || !Number.isFinite(input.version) || input.version < 0) {
      return { error: 'version 无效' };
    }
    value.version = input.version;
  }

  if ('updatedAt' in input) {
    const result = validateString(input.updatedAt, 'updatedAt', 40);
    if (result.error) return result;
    value.updatedAt = result.value;
  }

  if ('siteTitle' in input) {
    const result = validateString(input.siteTitle, 'siteTitle', 120);
    if (result.error) return result;
    value.siteTitle = result.value;
  }

  if ('footerText' in input) {
    const result = validateString(input.footerText, 'footerText', 300);
    if (result.error) return result;
    value.footerText = result.value;
  }

  // engines 为 null（旧客户端/未初始化配置）时视为未提供：忽略该字段，
  // 避免校验报错，也避免用 null 覆盖云端已有的有效引擎配置。
  if ('engines' in input && input.engines !== null) {
    if (!Array.isArray(input.engines) || input.engines.length < 1 || input.engines.length > 12) {
      return { error: 'engines 格式无效' };
    }
    const engines = [];
    const seen = new Set();
    for (let i = 0; i < input.engines.length; i += 1) {
      const entry = input.engines[i];
      const label = `engines[${i}]`;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { error: `${label} 格式无效` };
      const id = validateString(entry.id, `${label}.id`, 40, false);
      if (id.error) return id;
      if (!/^[a-z0-9_-]+$/i.test(id.value)) return { error: `${label}.id 只能包含字母数字下划线和连字符` };
      if (seen.has(id.value)) return { error: `${label}.id 重复` };
      seen.add(id.value);
      const name = validateString(entry.name, `${label}.name`, 60, false);
      if (name.error) return name;
      const url = normalizeUrl(entry.url);
      if (!url || !url.includes('{q}')) return { error: `${label}.url 必须是含 {q} 占位符的 http(s) 网址` };
      const icon = entry.icon ? validateString(entry.icon, `${label}.icon`, 120).value : '';
      engines.push({ id: id.value, name: name.value, url, icon: icon || '' });
    }
    value.engines = engines;
  }

  return { value };
}
