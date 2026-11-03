import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createServer, get } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../scripts/build.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://static.example';
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.pdf': 'application/pdf',
};
const variants = [];
let temporary;

async function filesWithin(directory, base = directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesWithin(filename, base));
    else files.push(path.relative(base, filename).split(path.sep).join('/'));
  }
  return files;
}

before(async () => {
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'elsewhere-portability-'));
  for (const name of ['defaults', 'personal']) {
    const root = path.join(temporary, name);
    await fs.mkdir(root);
    await fs.cp(path.join(project, 'public'), path.join(root, 'public'), { recursive: true });
    await fs.cp(path.join(project, 'examples'), path.join(root, 'examples'), { recursive: true });
    if (name === 'defaults') await fs.copyFile(path.join(project, 'profile.json'), path.join(root, 'profile.json'));
    else {
      // No canonical host, appearance options, demo controls, or application
      // service is required. Local destinations travel with the built folder.
      const profile = {
        name: 'Portable example', demo: false,
        portrait: { src: 'assets/portrait-example.svg', alt: '' },
        groups: [{ links: [
          { label: 'My work', url: 'work.html' },
          { label: 'A document', url: 'assets/document.pdf' },
          { label: 'Say hello', url: 'mailto:hello@example.com' },
        ] }],
      };
      await fs.writeFile(path.join(root, 'profile.json'), JSON.stringify(profile));
      await fs.writeFile(path.join(root, 'public/work.html'), '<!doctype html><html lang="en"><head><title>Work</title><link rel="stylesheet" href="assets/site.css"></head><body><a href="index.html">Back to profile</a><img src="assets/portrait-example.svg" alt=""></body></html>');
      await fs.writeFile(path.join(root, 'public/assets/document.pdf'), '%PDF-1.4\n% portable static test fixture\n');
    }
    const built = await buildSite(root);
    for (const mount of ['/', '/people/alex/']) {
      const host = path.join(temporary, `${name}-${mount === '/' ? 'root' : 'nested'}`);
      const target = path.join(host, mount.slice(1));
      await fs.mkdir(target, { recursive: true });
      await fs.cp(built.directory, target, { recursive: true });
      variants.push({ name, host, mount, files: await filesWithin(target) });
    }
  }
});

after(async () => { if (temporary) await fs.rm(temporary, { recursive: true, force: true }); });

const unescapeAttribute = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function attribute(tag, name) {
  const found = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return found ? unescapeAttribute(found[1] ?? found[2]) : undefined;
}

// Check the actual emitted asset graph using browser URL resolution. This runs
// without sockets in the ordinary test suite; optional HTTP tests below serve
// these same unmodified copies with a plain file server and no application code.
async function inspectDeployment(variant) {
  const pending = variant.files.filter(file => file.endsWith('.html')).map(file => new URL(variant.mount + file, origin));
  const visited = new Map();
  const reference = (raw, from, resource) => {
    if (!raw || raw.startsWith('#')) return;
    const target = new URL(raw, from);
    if (target.origin !== origin) {
      assert.equal(resource, false, `${from.pathname} must not need an external runtime asset: ${raw}`);
      return;
    }
    assert.ok(target.pathname.startsWith(variant.mount), `${raw} in ${from.pathname} escaped the deployed directory ${variant.mount}`);
    target.search = '';
    target.hash = '';
    if (target.pathname.endsWith('/')) target.pathname += 'index.html';
    pending.push(target);
  };
  while (pending.length) {
    const url = pending.shift();
    if (visited.has(url.pathname)) continue;
    const filename = path.join(variant.host, decodeURIComponent(url.pathname.slice(1)));
    const info = await fs.stat(filename).catch(error => {
      throw new Error(`Broken deployed reference ${url.pathname} (${variant.name} at ${variant.mount})`, { cause: error });
    });
    assert.ok(info.isFile(), `${url.pathname} must resolve to a file`);
    const extension = path.extname(filename).toLowerCase();
    assert.ok(mime[extension], `Add an explicit MIME expectation for ${url.pathname}`);
    visited.set(url.pathname, { filename, type: mime[extension] });
    if (extension === '.html') {
      const html = await fs.readFile(filename, 'utf8');
      assert.doesNotMatch(html, /<base\b/i, 'A fixed document base would prevent arbitrary subdirectory hosting');
      for (const found of html.matchAll(/<(a|link|script|img|source)\b[^>]*>/gi)) {
        const tag = found[0];
        const name = found[1].toLowerCase();
        if (name === 'link' && !['stylesheet', 'icon', 'preload', 'modulepreload'].includes(attribute(tag, 'rel'))) continue;
        reference(attribute(tag, ['a', 'link'].includes(name) ? 'href' : 'src'), url, name !== 'a');
      }
    } else if (extension === '.css') {
      const stylesheet = await fs.readFile(filename, 'utf8');
      for (const found of stylesheet.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g)) {
        reference(found[1] ?? found[2] ?? found[3], url, true);
      }
    }
  }
  return visited;
}

test('default and demo-free builds are complete static folders at domain root and a nested path', async () => {
  for (const variant of variants) {
    const graph = await inspectDeployment(variant);
    const prefix = variant.mount;
    for (const resource of ['index.html', 'assets/site.css', 'assets/enhance.js', 'assets/favicon.svg']) {
      assert.ok(graph.has(prefix + resource), `Missing ${resource} for ${variant.name} at ${prefix}`);
    }
    assert.ok([...graph.keys()].some(filename => filename.endsWith('.woff2')), 'Self-hosted fonts must resolve from CSS');
    const html = await fs.readFile(path.join(variant.host, prefix.slice(1), 'index.html'), 'utf8');
    assert.match(html, /<h1>[^<]+<\/h1>/);
    assert.match(html, /<a class="(?:link-row|featured-link)" href="/);
    if (variant.name === 'personal') {
      assert.doesNotMatch(html, /class="demo-bar"|name="robots"|rel="canonical"/);
      assert.ok(!variant.files.includes('guide.html'));
      assert.ok(!variant.files.some(file => file.startsWith('examples/')));
      assert.ok(graph.has(prefix + 'work.html'));
      assert.ok(graph.has(prefix + 'assets/document.pdf'));
      assert.ok(graph.has(prefix + 'assets/portrait-example.svg'));
    } else {
      assert.match(html, /class="demo-bar"/);
      for (const file of ['guide.html', 'examples/minimal.html', 'examples/portrait.html', 'examples/directory.html']) {
        assert.ok(graph.has(prefix + file), `Default demo must keep ${file} reachable`);
      }
    }
  }
});

function fetchLocal(url) {
  return new Promise((resolve, reject) => {
    get(url, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on('error', reject);
    }).on('error', reject);
  });
}

test('plain HTTP hosting serves every emitted page and asset at root and nested paths', {
  skip: process.env.ELSEWHERE_TEST_HTTP !== '1' ? 'Run npm run test:hosting for loopback HTTP integration.' : false,
}, async () => {
  for (const variant of variants) {
    const graph = await inspectDeployment(variant);
    // Only the copied dist folder is visible to this fixture. It has no renderer,
    // login middleware, API routes, package dependencies, or SPA fallback.
    const server = createServer(async (request, response) => {
      const url = new URL(request.url, origin);
      if (url.pathname.endsWith('/')) url.pathname += 'index.html';
      const entry = graph.get(url.pathname);
      if (!entry) { response.writeHead(404); response.end('Not found'); return; }
      response.writeHead(200, { 'Content-Type': entry.type });
      response.end(await fs.readFile(entry.filename));
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      for (const [pathname, entry] of graph) {
        const response = await fetchLocal(base + pathname);
        assert.equal(response.status, 200, pathname);
        assert.equal(response.headers.location, undefined, `${pathname} must not redirect to domain-root assets or authentication`);
        assert.equal(response.headers['content-type'], entry.type, pathname);
        assert.deepEqual(response.body, await fs.readFile(entry.filename), pathname);
      }
      assert.equal((await fetchLocal(base + variant.mount)).status, 200);
      assert.equal((await fetchLocal(base + '/not-a-route')).status, 404);
      if (variant.mount !== '/') assert.equal((await fetchLocal(base + '/assets/site.css')).status, 404, 'Nested hosting cannot rely on assets at the domain root');
    } finally {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }
});
