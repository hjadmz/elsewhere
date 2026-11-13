/** Build-time rendering only. No content depends on JavaScript in the browser. */
const ROOT_FIELDS = ['name', 'eyebrow', 'bio', 'location', 'lang', 'direction', 'portrait', 'featured', 'groups', 'sections', 'footer', 'appearance', 'labels', 'site', 'demo'];
const DEFAULT_LABELS = Object.freeze({ skipLink: 'Skip to links', sections: 'Sections', appearance: 'Appearance', system: 'System', light: 'Light', dark: 'Dark' });
const CONTROL = /[\u0000-\u001f\u007f]/u;
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function problem(path, message) { throw new Error(`${path}: ${message}`); }
function object(value, path, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) problem(path, 'must be an object.');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) problem(`${path}.${key}`, 'is not a supported setting. Check its spelling.');
  return value;
}
function text(value, path, required = false, multiline = false) {
  if (value === undefined || value === null) {
    if (required) problem(path, 'is required and must contain text.');
    return undefined;
  }
  if (typeof value !== 'string') problem(path, 'must be text in quotation marks.');
  if (multiline) value = value.replace(/\r\n/g, '\n');
  if (CONTROL.test(multiline ? value.replace(/\n/g, '') : value)) problem(path, multiline ? 'must not contain control characters other than line breaks.' : 'must not contain control characters or line breaks.');
  const result = value.trim();
  if (!result && required) problem(path, 'must not be empty.');
  return result || undefined;
}
function choice(value, path, allowed, fallback) {
  if (value === undefined) return fallback;
  if (!allowed.includes(value)) problem(path, `must be one of: ${allowed.join(', ')}.`);
  return value;
}
function language(value, path, fallback = 'en') {
  const result = text(value, path) || fallback;
  try { Intl.getCanonicalLocales(result); } catch { problem(path, 'must be a valid language tag, such as en, fr, or ar.'); }
  return result;
}
function decodedURL(value, path) {
  let decoded = value;
  // Repeatedly encoded control characters must not evade the safety checks.
  for (let pass = 0; pass < 4; pass++) {
    if (CONTROL.test(decoded) || decoded.includes('\\') || /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(decoded)) problem(path, 'must not contain control characters or backslashes.');
    let next;
    try { next = decodeURIComponent(decoded); } catch {
      if (pass === 0) problem(path, 'has an invalid percent-encoded character.');
      return decoded;
    }
    if (next === decoded) return decoded;
    decoded = next;
  }
  if (/%[0-9a-f]{2}/i.test(decoded)) problem(path, 'has unnecessarily repeated URL encoding.');
  if (CONTROL.test(decoded) || decoded.includes('\\')) problem(path, 'must not contain control characters or backslashes.');
  return decoded;
}
function safeURL(value, path, absoluteOnly = false) {
  const url = text(value, path, true);
  if (url !== value || /\s/u.test(url)) problem(path, 'must not contain whitespace. Encode spaces as %20.');
  const decoded = decodedURL(url, path);
  if (/^https?:\/\//i.test(url)) {
    let parsed;
    try { parsed = new URL(url); } catch { problem(path, 'must be a valid http or https address.'); }
    if (!parsed.hostname || parsed.username || parsed.password) problem(path, 'must have a hostname and no embedded username or password.');
    if (absoluteOnly && (parsed.search || parsed.hash)) problem(path, 'must not include a query or fragment.');
    return url;
  }
  if (absoluteOnly) problem(path, 'must start with https:// or http://.');
  if (/^mailto:/i.test(url)) {
    if (!/^mailto:[^\s?@]+@[^\s?@]+(?:\?.*)?$/i.test(url)) problem(path, 'must contain an email address after mailto:.');
    return url;
  }
  if (/^tel:/i.test(url)) {
    if (!/^tel:\+?[0-9][0-9().-]*(?:;ext=[0-9]+)?$/i.test(url)) problem(path, 'must contain a telephone number after tel:, with no spaces.');
    return url;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(decoded) || decoded.startsWith('//')) problem(path, 'only http, https, mailto, tel, and local page links are supported.');
  const pathPart = decoded.split(/[?#]/u)[0];
  if (pathPart.split('/').some(segment => segment === '..')) problem(path, 'must not traverse a parent directory (..).');
  if (!pathPart && !decoded.startsWith('#') && !decoded.startsWith('?')) problem(path, 'must point to a destination.');
  return url;
}
function asset(value, path) {
  const result = text(value, path, true);
  if (!/^assets\/[A-Za-z0-9_./-]+$/u.test(result) || result.split('/').some(part => !part || part === '.' || part === '..')) {
    problem(path, 'must be a local file under assets/, using letters, numbers, dashes, underscores, and dots; no parent paths.');
  }
  return result;
}
function link(value, path) {
  object(value, path, ['label', 'url', 'description', 'destination']);
  const destination = value.destination === undefined ? false : value.destination;
  if (typeof destination !== 'boolean') problem(`${path}.destination`, 'must be true or false, without quotation marks.');
  return { label: text(value.label, `${path}.label`, true), url: safeURL(value.url, `${path}.url`), description: text(value.description, `${path}.description`), destination };
}

export function validateProfile(input) {
  object(input, 'profile', ROOT_FIELDS);
  const profile = {
    name: text(input.name, 'profile.name', true),
    eyebrow: text(input.eyebrow, 'profile.eyebrow'),
    bio: text(input.bio, 'profile.bio', false, true),
    location: text(input.location, 'profile.location'),
    footer: text(input.footer, 'profile.footer'),
    lang: language(input.lang, 'profile.lang'),
    direction: choice(input.direction, 'profile.direction', ['ltr', 'rtl', 'auto'], 'auto'),
    sections: choice(input.sections, 'profile.sections', ['auto', 'on', 'off'], 'auto'),
    demo: input.demo ?? false,
  };
  if (typeof profile.demo !== 'boolean') problem('profile.demo', 'must be true or false, without quotation marks.');
  if (input.portrait !== undefined && input.portrait !== null) {
    object(input.portrait, 'profile.portrait', ['src', 'alt']);
    profile.portrait = { src: asset(input.portrait.src, 'profile.portrait.src'), alt: text(input.portrait.alt, 'profile.portrait.alt') || '' };
  }
  if (input.featured !== undefined && input.featured !== null) profile.featured = link(input.featured, 'profile.featured');
  if (!Array.isArray(input.groups)) problem('profile.groups', 'must be an array of link groups; use [] if there is only a featured link.');
  profile.groups = input.groups.map((group, index) => {
    const path = `profile.groups[${index}]`;
    object(group, path, ['title', 'links']);
    if (!Array.isArray(group.links) || !group.links.length) problem(`${path}.links`, 'must contain at least one link. Remove empty groups.');
    return { title: text(group.title, `${path}.title`), links: group.links.map((item, itemIndex) => link(item, `${path}.links[${itemIndex}]`)) };
  });
  if (!profile.featured && !profile.groups.length) problem('profile.groups', 'add at least one link or a featured destination.');
  if (profile.sections === 'on' && profile.groups.filter(group => group.title).length < 2) {
    problem('profile.sections', 'needs at least two titled groups when set to "on". Add group titles or use "auto".');
  }
  const appearance = object(input.appearance ?? {}, 'profile.appearance', ['palette', 'accent', 'theme']);
  profile.appearance = {
    palette: choice(appearance.palette, 'profile.appearance.palette', ['paper', 'stone'], 'paper'),
    accent: choice(appearance.accent, 'profile.appearance.accent', ['blue', 'rust', 'forest'], 'blue'),
    theme: choice(appearance.theme, 'profile.appearance.theme', ['system', 'light', 'dark'], 'system'),
  };
  const labels = object(input.labels ?? {}, 'profile.labels', [...Object.keys(DEFAULT_LABELS), 'lang']);
  profile.labels = { lang: language(labels.lang, 'profile.labels.lang') };
  for (const key of Object.keys(DEFAULT_LABELS)) {
    if (labels[key] !== undefined) profile.labels[key] = text(labels[key], `profile.labels.${key}`, true);
  }
  const site = object(input.site ?? {}, 'profile.site', ['url', 'title', 'description', 'image', 'favicon']);
  const siteURL = text(site.url, 'profile.site.url');
  const siteImage = text(site.image, 'profile.site.image');
  profile.site = {
    url: siteURL ? safeURL(siteURL, 'profile.site.url', true) : undefined,
    title: text(site.title, 'profile.site.title') || profile.name,
    description: site.description === undefined || site.description === null
      ? profile.bio?.replace(/\s+/gu, ' ')
      : text(site.description, 'profile.site.description') || '',
    image: siteImage ? asset(siteImage, 'profile.site.image') : undefined,
    favicon: asset(text(site.favicon, 'profile.site.favicon') || 'assets/favicon.svg', 'profile.site.favicon'),
  };
  if (!/\.(?:svg|png|ico)$/i.test(profile.site.favicon)) problem('profile.site.favicon', 'must be a local SVG, PNG, or ICO file.');
  if (profile.site.image && !profile.site.url) problem('profile.site.url', 'is required when site.image is set, so sharing images have an absolute address.');
  return profile;
}

const arrow = '<svg class="arrow" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function destination(url) {
  if (/^https?:/i.test(url)) return new URL(url).hostname.replace(/^www\./u, '');
  if (/^mailto:/i.test(url)) return url.slice(7).split('?')[0];
  if (/^tel:/i.test(url)) return url.slice(4);
  return url;
}
function renderLink(item, featured = false, prefix = '') {
  const localRelative = !/^[a-z][a-z\d+.-]*:/i.test(item.url) && !/^[/?#]/u.test(item.url);
  const href = localRelative ? `${prefix}${item.url}` : item.url;
  return `<a class="${featured ? 'featured-link' : 'link-row'}" href="${escapeHTML(href)}"><span class="link-title">${escapeHTML(item.label)}</span>${item.description ? `<span class="link-description">${escapeHTML(item.description)}</span>` : ''}${item.destination ? `<span class="link-destination">${escapeHTML(destination(item.url))}</span>` : ''}${arrow}</a>`;
}
function demoBar(prefix, current) {
  const examples = [['index.html', 'Overview'], ['examples/minimal.html', 'Minimal'], ['examples/portrait.html', 'Portrait'], ['examples/directory.html', '20 links'], ['guide.html', 'Use this template']];
  return `<aside class="demo-bar" aria-label="Template demonstration" lang="en" dir="ltr"><div><a class="demo-brand" href="${prefix}index.html">Elsewhere<span aria-hidden="true">.</span></a> <span class="demo-label">Example profile · destinations are illustrative</span><nav class="demo-nav" aria-label="Template examples">${examples.map(([path, label]) => `<a href="${prefix}${path}"${path === current ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></div></aside>`;
}

export function sectionGroups(profile) {
  if (profile.sections === 'off') return [];
  const titledGroups = profile.groups.flatMap((group, index) => group.title ? [{ ...group, id: `group-${index + 1}` }] : []);
  if (profile.sections === 'on') return titledGroups;
  const titledLinkCount = titledGroups.reduce((count, group) => count + group.links.length, 0);
  return titledGroups.length >= 3 && titledLinkCount >= 12 ? titledGroups : [];
}

export function renderProfile(input, { assetPrefix = '', currentPath = 'index.html' } = {}) {
  const p = validateProfile(input);
  if (!['', '../'].includes(assetPrefix)) throw new Error('assetPrefix must be empty or ../.');
  const e = escapeHTML;
  const canonical = p.site.url;
  const imageURL = p.site.image && new URL(p.site.image, canonical).href;
  const iconType = { svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon' }[p.site.favicon.split('.').at(-1).toLowerCase()];
  // A partially translated configuration must not mark English fallbacks as another language.
  const labelLang = key => p.labels[key] === undefined ? 'en' : p.labels.lang;
  const labelText = key => p.labels[key] ?? DEFAULT_LABELS[key];
  const titledGroups = sectionGroups(p);
  const showSections = titledGroups.length > 0;
  return `<!doctype html>
<html lang="${e(p.lang)}" dir="${p.direction}" data-palette="${p.appearance.palette}" data-accent="${p.appearance.accent}" data-theme="${p.appearance.theme}" data-default-theme="${p.appearance.theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${e(p.site.title)}</title>
  ${p.site.description ? `<meta name="description" content="${e(p.site.description)}">\n  <meta property="og:description" content="${e(p.site.description)}">` : ''}
  <meta property="og:title" content="${e(p.site.title)}">
  <meta property="og:type" content="website">
  ${canonical ? `<link rel="canonical" href="${e(canonical)}">\n  <meta property="og:url" content="${e(canonical)}">` : ''}
  ${imageURL ? `<meta property="og:image" content="${e(imageURL)}">` : ''}
  ${p.demo ? '<meta name="robots" content="noindex, nofollow">' : ''}
  <link rel="icon" href="${assetPrefix}${e(p.site.favicon)}" type="${iconType}">
  <link rel="stylesheet" href="${assetPrefix}assets/site.css">
  <script src="${assetPrefix}assets/enhance.js" defer></script>
  ${showSections ? `<script src="${assetPrefix}assets/sections.js" defer></script>` : ''}
</head>
<body${p.demo ? ' class="is-demo"' : ''}>
<a class="skip-link" href="#links" lang="${e(labelLang('skipLink'))}" dir="auto">${e(labelText('skipLink'))}</a>
${p.demo ? demoBar(assetPrefix, currentPath) : ''}
<div class="page-frame">
  <div class="profile-layout">
    ${showSections ? '<div class="profile-rail">' : ''}
    <header class="identity">
      ${p.eyebrow ? `<p class="eyebrow">${e(p.eyebrow)}</p>` : ''}
      <div class="identity-heading"><h1>${e(p.name)}</h1>${p.portrait ? `<img class="portrait" src="${assetPrefix}${e(p.portrait.src)}" alt="${e(p.portrait.alt)}" width="88" height="104" decoding="async">` : ''}</div>
      ${p.bio ? `<p class="bio">${e(p.bio)}</p>` : ''}
      ${p.location ? `<p class="location">${e(p.location)}</p>` : ''}
    </header>
    ${showSections ? `<details class="section-navigation">
      <summary><span id="sections-label" lang="${e(labelLang('sections'))}" dir="auto">${e(labelText('sections'))}</span><span class="current-group" lang="${e(p.lang)}" dir="auto" hidden></span></summary>
      <nav aria-labelledby="sections-label">
        <ul>${titledGroups.map(group => `<li><a href="#${group.id}">${e(group.title)}</a></li>`).join('')}</ul>
      </nav>
    </details>
    </div>` : ''}
    <main id="links" class="destinations" tabindex="-1">
      ${p.featured ? renderLink(p.featured, true, assetPrefix) : ''}
      ${p.groups.map((group, index) => `<${group.title ? 'section' : 'div'} class="link-group"${group.title ? ` aria-labelledby="group-${index + 1}"` : ''}>${group.title ? `<h2 class="group-title" id="group-${index + 1}"${showSections ? ' tabindex="-1"' : ''}>${e(group.title)}</h2>` : ''}<ul class="link-list">${group.links.map(item => `<li>${renderLink(item, false, assetPrefix)}</li>`).join('')}</ul></${group.title ? 'section' : 'div'}>`).join('\n      ')}
    </main>
  </div>
  <footer class="page-footer">${p.footer ? `<p>${e(p.footer)}</p>` : ''}<div id="theme-control" class="theme-control" hidden lang="${e(p.labels.lang)}" dir="auto"><label for="theme-choice" lang="${e(labelLang('appearance'))}">${e(labelText('appearance'))}</label><select id="theme-choice" name="appearance">${['system', 'light', 'dark'].map(value => `<option value="${value}" lang="${e(labelLang(value))}"${p.appearance.theme === value ? ' selected' : ''}>${e(labelText(value))}</option>`).join('')}</select></div></footer>
</div>
</body>
</html>
`;
}
