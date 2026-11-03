import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderProfile, validateProfile } from '../src/render.mjs';
import { buildSite } from '../scripts/build.mjs';

const minimal = () => ({ name: 'Alex Morgan', groups: [{ links: [{ label: 'My work', url: 'https://example.com/work' }] }] });

test('core destinations render as ordinary same-tab anchors without a portrait or JavaScript dependency', () => {
  const html = renderProfile(minimal());
  assert.match(html, /<a class="link-row" href="https:\/\/example.com\/work">/);
  assert.match(html, /<h1>Alex Morgan<\/h1>/);
  assert.doesNotMatch(html, /class="portrait"|target=|class="bio"|class="eyebrow"|class="demo-bar"/);
  assert.match(html, /id="theme-control" class="theme-control" hidden/);
  assert.match(html, /data-theme="system"/);
  assert.doesNotMatch(html, /class="link-destination"/);
});

test('destination hints are an explicit per-link option and never replace the visible link label', () => {
  const input = minimal();
  input.groups[0].links.push({ label: 'Email me', url: 'mailto:hello@example.com', destination: true });
  input.featured = { label: 'Portfolio', url: 'https://www.example.org/work', destination: true };
  const html = renderProfile(input);
  assert.equal((html.match(/class="link-destination"/g) || []).length, 2);
  assert.match(html, /class="link-title">Portfolio<\/span><span class="link-destination">example.org<\/span>/);
  assert.match(html, /class="link-destination">hello@example.com<\/span>/);
  assert.throws(() => validateProfile({ ...input, featured: { ...input.featured, destination: 'false' } }), /profile.featured.destination/);
  const local = minimal();
  local.groups[0].links[0] = { label: 'Other view', url: '?view=all', destination: true };
  assert.match(renderProfile(local), /class="link-destination">\?view=all<\/span>/);
});

test('interface labels can be translated without changing the rendering engine', () => {
  const input = { ...minimal(), lang: 'ar', direction: 'rtl', labels: { lang: 'ar', skipLink: 'انتقل إلى الروابط', appearance: 'المظهر', system: 'النظام', light: 'فاتح', dark: 'داكن' } };
  const html = renderProfile(validateProfile(input));
  assert.match(html, /class="skip-link" href="#links" lang="ar" dir="auto">انتقل إلى الروابط/);
  assert.match(html, /for="theme-choice" lang="ar">المظهر<\/label>/);
  assert.match(html, /value="dark" lang="ar">داكن<\/option>/);
  assert.match(html, /value="system" lang="ar" selected>النظام<\/option>/);
  const englishDefaults = renderProfile({ ...minimal(), lang: 'ar' });
  assert.match(englishDefaults, /for="theme-choice" lang="en">Appearance<\/label>/);
  const partial = renderProfile({ ...minimal(), labels: { lang: 'fr', appearance: 'Thème & ambiance' } });
  assert.match(partial, /lang="fr">Thème &amp; ambiance<\/label>/);
  assert.match(partial, /value="light" lang="en">Light<\/option>/);
  const german = renderProfile(validateProfile({ ...minimal(), labels: { lang: 'de', system: 'System' } }));
  assert.match(german, /value="system" lang="de" selected>System<\/option>/);
  assert.match(german, /value="dark" lang="en">Dark<\/option>/);
  assert.throws(() => validateProfile({ ...minimal(), labels: { dark: '' } }), /profile.labels.dark/);
  assert.throws(() => validateProfile({ ...minimal(), labels: { lang: 'not a language' } }), /profile.labels.lang/);
});

test('custom favicon paths use their actual format and resolve from example subdirectories', () => {
  for (const [extension, type] of [['svg', 'image/svg+xml'], ['png', 'image/png'], ['ico', 'image/x-icon']]) {
    const html = renderProfile({ ...minimal(), site: { favicon: `assets/my-icon.${extension}` } }, { assetPrefix: '../' });
    assert.ok(html.includes(`rel="icon" href="../assets/my-icon.${extension}" type="${type}"`));
  }
  assert.throws(() => validateProfile({ ...minimal(), site: { favicon: 'assets/icon.html' } }), /profile.site.favicon.*SVG, PNG, or ICO/);
  assert.throws(() => validateProfile({ ...minimal(), site: { favicon: '../outside.ico' } }), /profile.site.favicon/);
  assert.throws(() => validateProfile({ ...minimal(), site: { favicon: 'https://example.com/icon.ico' } }), /profile.site.favicon/);
});

test('unknown settings and missing required content fail with useful field paths', () => {
  assert.throws(() => validateProfile({ ...minimal(), portraait: {} }), /profile.portraait.*not a supported/);
  assert.throws(() => validateProfile({ ...minimal(), name: ' ' }), /profile.name.*empty/);
  assert.throws(() => validateProfile({ name: 'Alex', groups: [] }), /at least one link/);
  assert.throws(() => validateProfile({ name: 'Alex', groups: [{ links: [] }] }), /groups\[0\].links/);
  assert.throws(() => validateProfile({ ...minimal(), demo: 'false' }), /profile.demo/);
  assert.throws(() => validateProfile({ ...minimal(), appearance: { accent: 'yellow' } }), /profile.appearance.accent/);
  for (const url of ['', ' ', undefined, null, false]) {
    assert.throws(() => validateProfile({ name: 'Alex', groups: [{ links: [{ label: 'Work', url }] }] }), /profile.groups\[0\].links\[0\].url/);
  }
});

test('optional blank fields disappear and featured-only profiles are valid', () => {
  const html = renderProfile({ name: 'Alex', bio: ' ', eyebrow: '', footer: '', groups: [], featured: { label: 'Work', url: '/work/' } });
  assert.match(html, /class="featured-link"/);
  assert.doesNotMatch(html, /class="bio"|class="eyebrow"|class="link-group"/);
});

test('bio line breaks are preserved in page copy and collapsed in metadata', () => {
  const html = renderProfile({ ...minimal(), bio: 'First paragraph.\r\nSecond paragraph.' });
  assert.match(html, /class="bio">First paragraph\.\nSecond paragraph\./);
  assert.match(html, /name="description" content="First paragraph\. Second paragraph\."/);
  assert.throws(() => renderProfile({ ...minimal(), bio: 'Text\u0000more' }), /profile.bio/);
});

test('all plain text is escaped rather than interpreted as markup', () => {
  const input = minimal();
  input.name = '<script>alert("name")</script>';
  input.bio = 'Design & <em>care</em>';
  input.groups[0].title = '<img src=x onerror=alert(1)>';
  input.groups[0].links[0].label = '" onclick="alert(1)';
  input.groups[0].links[0].description = '<strong>Text</strong>';
  const html = renderProfile(input);
  assert.match(html, /&lt;script&gt;alert\(&quot;name&quot;\)&lt;\/script&gt;/);
  assert.match(html, /Design &amp; &lt;em&gt;care&lt;\/em&gt;/);
  assert.doesNotMatch(html, /<img src=x|<strong>| onclick="alert/);
});

test('reject unsafe schemes, controls, protocol-relative links, credentials and local traversal', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '//evil.example', 'https://good.example/\n', 'https://user:pass@example.com/', '../private', '/a/%2e%2e/private', 'java%73cript:alert(1)', 'https://example.com/%0a', 'https://example.com/?q=%25foo%250a', 'mailto:me@example.com?subject=%250d%250aBcc:test', '\\evil.example', 'https://example.com/%zz']) {
    const input = minimal();
    input.groups[0].links[0].url = url;
    assert.throws(() => validateProfile(input), /profile.groups\[0\].links\[0\].url/, url);
  }
});

test('accept common external, contact, and safe local destinations', () => {
  for (const url of ['https://example.com/?a=1&b=2', 'https://example.com/?discount=100%25', 'http://localhost:3000/work', 'mailto:hello@example.com?subject=Hello%20there', 'tel:+15551234567', '/work/', 'work/index.html', './work.html', '#contact']) {
    const input = minimal();
    input.groups[0].links[0].url = url;
    assert.equal(validateProfile(input).groups[0].links[0].url, url);
  }
});

test('twenty links, long labels and non-Latin text remain in the initial HTML', () => {
  const input = { name: 'ليلى · Alex', lang: 'ar', direction: 'rtl', groups: [{ title: 'الأعمال', links: Array.from({ length: 20 }, (_, index) => ({ label: `Destination ${index + 1} — ${'A long descriptive label '.repeat(6)}`, url: `https://example.com/${index + 1}` })) }] };
  const html = renderProfile(input);
  assert.equal((html.match(/class="link-row"/g) || []).length, 20);
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.match(html, /Destination 20/);
  assert.doesNotMatch(html, /<details|<dialog/);
});

test('demo paths resolve assets and navigation from their subdirectory and are not indexed', () => {
  const html = renderProfile({ ...minimal(), demo: true, portrait: { src: 'assets/portrait.svg', alt: '' } }, { assetPrefix: '../', currentPath: 'examples/portrait.html' });
  assert.match(html, /href="\.\.\/assets\/site.css"/);
  assert.match(html, /src="\.\.\/assets\/portrait.svg"/);
  assert.match(html, /href="\.\.\/examples\/portrait.html" aria-current="page"/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /width="88" height="104"/);
  for (const [url, expected] of [['assets/cv.pdf', '../assets/cv.pdf'], ['./work/', '.././work/'], ['/work/', '/work/'], ['#contact', '#contact']]) {
    const input = minimal();
    input.groups[0].links[0].url = url;
    assert.ok(renderProfile(input, { assetPrefix: '../' }).includes(`href="${expected}"`));
  }
});

test('personal builds can replace the default favicon and missing icons preserve the last valid output', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'elsewhere-favicon-test-'));
  try {
    await fs.mkdir(path.join(root, 'public/assets'), { recursive: true });
    for (const file of ['site.css', 'enhance.js', 'personal.ico']) await fs.writeFile(path.join(root, 'public/assets', file), 'fixture');
    const profile = { ...minimal(), site: { favicon: 'assets/personal.ico' } };
    await fs.writeFile(path.join(root, 'profile.json'), JSON.stringify(profile));
    await buildSite(root);
    const original = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8');
    assert.match(original, /href="assets\/personal.ico" type="image\/x-icon"/);
    await fs.writeFile(path.join(root, 'profile.json'), JSON.stringify({ ...profile, site: { favicon: 'assets/missing.png' } }));
    await assert.rejects(buildSite(root), /site.favicon: assets\/missing.png is missing/);
    assert.equal(await fs.readFile(path.join(root, 'dist/index.html'), 'utf8'), original);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('sharing metadata is escaped and local assets cannot escape public assets', () => {
  const html = renderProfile({ ...minimal(), site: { url: 'https://example.com/profile/', title: 'Alex & friends', image: 'assets/share.png' } });
  assert.match(html, /og:image" content="https:\/\/example.com\/profile\/assets\/share.png"/);
  assert.match(html, /<title>Alex &amp; friends<\/title>/);
  assert.throws(() => validateProfile({ ...minimal(), portrait: { src: 'assets/../secret.svg' } }), /profile.portrait.src/);
  assert.throws(() => validateProfile({ ...minimal(), portrait: { src: 'https://example.com/me.png' } }), /profile.portrait.src/);
  assert.throws(() => validateProfile({ ...minimal(), site: { image: 'assets/share.png' } }), /profile.site.url/);
  for (const [url, expected] of [
    ['https://example.com/profile/index.html', 'https://example.com/profile/assets/share.png'],
    ['https://example.com/profile/', 'https://example.com/profile/assets/share.png'],
    ['https://example.com', 'https://example.com/assets/share.png'],
  ]) {
    const rendered = renderProfile({ ...minimal(), site: { url, image: 'assets/share.png' } });
    assert.ok(rendered.includes(`property="og:image" content="${expected}"`));
    assert.ok(rendered.includes(`rel="canonical" href="${url}"`));
  }
});

test('explicitly empty metadata description stays omitted after normalized configuration is rendered', () => {
  const p = validateProfile({ ...minimal(), bio: 'The visible biography.', site: { description: '' } });
  const html = renderProfile(p);
  assert.match(html, /class="bio">The visible biography\./);
  assert.doesNotMatch(html, /name="description"|property="og:description"/);
  assert.match(renderProfile({ ...minimal(), bio: 'Fallback biography.' }), /name="description" content="Fallback biography\."/);
});

test('build validates every profile and image before replacing existing output', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'elsewhere-build-test-'));
  const makeSymlink = async (target, link, type) => {
    try { await fs.symlink(target, link, type); return true; }
    catch (error) {
      if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
      t.diagnostic(`Symlink fixture unavailable on this system (${error.code}); that rejection check was not run.`);
      return false;
    }
  };
  try {
    await fs.mkdir(path.join(root, 'public/assets'), { recursive: true });
    await fs.mkdir(path.join(root, 'examples'));
    for (const file of ['site.css', 'enhance.js', 'favicon.svg']) await fs.writeFile(path.join(root, 'public/assets', file), 'fixture');
    await fs.writeFile(path.join(root, 'profile.json'), JSON.stringify({ ...minimal(), demo: true }));
    await fs.writeFile(path.join(root, 'public/guide.html'), 'Template guide');
    await buildSite(root);
    const original = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8');
    await fs.writeFile(path.join(root, 'examples/broken.json'), JSON.stringify({ ...minimal(), portrait: { src: 'assets/missing.png' } }));
    await assert.rejects(buildSite(root), /missing.png is missing/);
    assert.equal(await fs.readFile(path.join(root, 'dist/index.html'), 'utf8'), original);
    await fs.writeFile(path.join(root, 'examples/broken.json'), JSON.stringify({ ...minimal(), demo: true }));
    const result = await buildSite(root);
    assert.deepEqual(result.pages, ['index.html', 'examples/broken.html']);
    assert.match(await fs.readFile(path.join(root, 'dist/examples/broken.html'), 'utf8'), /\.\.\/assets\/site.css/);
    if (await makeSymlink(path.join(root, 'profile.json'), path.join(root, 'public/assets/outside.json'), 'file')) {
      await assert.rejects(buildSite(root), /symbolic link/);
      assert.equal(await fs.readFile(path.join(root, 'dist/index.html'), 'utf8'), original);
      await fs.unlink(path.join(root, 'public/assets/outside.json'));
    }
    await fs.writeFile(path.join(root, 'profile.json'), JSON.stringify(minimal()));
    await fs.writeFile(path.join(root, 'examples/broken.json'), 'invalid JSON is irrelevant after demo is disabled');
    const personalized = await buildSite(root);
    assert.deepEqual(personalized.pages, ['index.html']);
    await assert.rejects(fs.access(path.join(root, 'dist/guide.html')));
    await assert.rejects(fs.access(path.join(root, 'dist/examples')));
    assert.equal(await fs.readFile(path.join(root, 'dist/assets/site.css'), 'utf8'), 'fixture');
    assert.doesNotMatch(await fs.readFile(path.join(root, 'dist/index.html'), 'utf8'), /class="demo-bar"/);
    await fs.rename(path.join(root, 'public'), path.join(root, 'actual-public'));
    if (await makeSymlink(path.join(root, 'actual-public'), path.join(root, 'public'), 'dir')) {
      await assert.rejects(buildSite(root), /public\/ must be a regular directory/);
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
