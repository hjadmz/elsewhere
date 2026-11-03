import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/assets/enhance.js', import.meta.url), 'utf8');

function element(properties = {}) {
  const events = new Map();
  return {
    ...properties,
    addEventListener(name, callback) {
      const listeners = events.get(name) ?? [];
      listeners.push(callback);
      events.set(name, listeners);
    },
    emit(name, event = {}) {
      for (const callback of events.get(name) ?? []) callback(event);
    },
  };
}

// A small DOM boundary, not a recreation of the enhancement. Tests drive the
// public control and browser events, then inspect visible state and persistence.
function openPage({
  url = 'https://profiles.example/people/alex/',
  scriptURL = new URL('assets/enhance.js', url).href,
  initial = 'system',
  store = new Map(),
  blocked = false,
  controls = true,
  portraits = [],
} = {}) {
  const reads = [];
  const writes = [];
  const storage = {
    getItem(key) {
      reads.push(key);
      if (blocked) throw new Error('Storage unavailable');
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      if (blocked) throw new Error('Storage unavailable');
      writes.push([key, String(value)]);
      store.set(key, String(value));
    },
  };
  const root = {
    dataset: { theme: initial, defaultTheme: initial },
    removeAttribute(name) {
      assert.equal(name, 'data-theme');
      delete this.dataset.theme;
    },
  };
  const control = element({ hidden: true });
  const select = element({ value: initial });
  const window = element({ location: new URL(url), localStorage: storage });
  const document = {
    documentElement: root,
    baseURI: url,
    currentScript: scriptURL === null ? null : { src: scriptURL },
    getElementById(id) {
      if (!controls) return null;
      return { 'theme-control': control, 'theme-choice': select }[id] ?? null;
    },
    querySelectorAll(selector) {
      assert.equal(selector, 'img.portrait');
      return portraits;
    },
  };
  vm.runInNewContext(source, { document, window, localStorage: storage, location: window.location, URL }, { filename: 'enhance.js' });
  return {
    root, control, select, window, reads, writes, store, storage,
    choose(value) { select.value = value; select.emit('change'); },
    storageEvent(key, newValue, storageArea = storage) { window.emit('storage', { key, newValue, storageArea }); },
  };
}

test('stored theme is restored, ordinary change applies immediately, and system removes the override', () => {
  const store = new Map();
  const first = openPage({ store, initial: 'light' });
  assert.equal(first.control.hidden, false);
  assert.equal(first.select.value, 'light');
  first.choose('dark');
  assert.equal(first.root.dataset.theme, 'dark');
  assert.equal(first.writes.length, 1);
  const returning = openPage({ store, initial: 'light' });
  assert.equal(returning.select.value, 'dark');
  assert.equal(returning.root.dataset.theme, 'dark');
  returning.choose('system');
  assert.equal(returning.root.dataset.theme, undefined);
  assert.equal(openPage({ store, initial: 'dark' }).select.value, 'system');
});

test('preference is shared within one installation, including example pages, but not with another profile', () => {
  const store = new Map();
  const profile = openPage({ store });
  profile.choose('dark');
  const example = openPage({ store, url: 'https://profiles.example/people/alex/examples/minimal.html', scriptURL: 'https://profiles.example/people/alex/assets/enhance.js' });
  assert.equal(example.root.dataset.theme, 'dark');
  assert.equal(example.reads[0], profile.reads[0]);
  const other = openPage({ store, url: 'https://profiles.example/people/bob/' });
  assert.notEqual(other.reads[0], profile.reads[0]);
  assert.equal(other.select.value, 'system');
  assert.equal(other.root.dataset.theme, undefined);
});

test('blocked storage keeps the configured default and leaves the current-page control usable', () => {
  const page = openPage({ initial: 'dark', blocked: true });
  assert.equal(page.control.hidden, false);
  assert.equal(page.root.dataset.theme, 'dark');
  page.choose('light');
  assert.equal(page.root.dataset.theme, 'light');
  page.choose('system');
  assert.equal(page.root.dataset.theme, undefined);
  assert.equal(page.writes.length, 0);
});

test('cross-tab changes and deletion synchronize the selection and reset to the configured default', () => {
  const page = openPage({ initial: 'light' });
  const key = page.reads[0];
  page.storageEvent(key, 'dark');
  assert.equal(page.root.dataset.theme, 'dark');
  assert.equal(page.select.value, 'dark');
  page.storageEvent(key, null);
  assert.equal(page.root.dataset.theme, 'light');
  assert.equal(page.select.value, 'light');
  page.storageEvent(key, 'system');
  assert.equal(page.root.dataset.theme, undefined);
  page.storageEvent(null, null);
  assert.equal(page.root.dataset.theme, 'light');
  page.storageEvent('another-profile-theme', 'dark');
  assert.equal(page.root.dataset.theme, 'light');
  assert.equal(page.writes.length, 0, 'External updates must not cause a storage-event feedback loop');
});

test('invalid stored and incoming preferences fall back without injecting an arbitrary theme', () => {
  const seed = openPage();
  const key = seed.reads[0];
  const page = openPage({ initial: 'light', store: new Map([[key, 'unexpected']]) });
  assert.equal(page.select.value, 'light');
  page.choose('dark');
  const writeCount = page.writes.length;
  page.choose('unexpected');
  assert.equal(page.root.dataset.theme, 'dark');
  assert.equal(page.writes.length, writeCount);
  page.storageEvent(key, 'unexpected');
  assert.equal(page.root.dataset.theme, 'light');
  assert.equal(page.select.value, 'light');
  const invalidDefault = openPage({ initial: 'unexpected' });
  assert.equal(invalidDefault.select.value, 'system');
  assert.equal(invalidDefault.root.dataset.theme, undefined);
});

test('missing controls do not break preference application or portrait recovery', () => {
  const broken = element({ complete: true, naturalWidth: 0, hidden: false });
  const page = openPage({ initial: 'dark', controls: false, portraits: [broken] });
  assert.equal(page.root.dataset.theme, 'dark');
  assert.equal(broken.hidden, true);
});

test('broken portraits are hidden whether failure happens before or after the deferred script', () => {
  const cachedFailure = element({ complete: true, naturalWidth: 0, hidden: false });
  const pending = element({ complete: false, naturalWidth: 0, hidden: false });
  const successful = element({ complete: true, naturalWidth: 112, hidden: false });
  openPage({ portraits: [cachedFailure, pending, successful] });
  assert.equal(cachedFailure.hidden, true);
  assert.equal(pending.hidden, false);
  assert.equal(successful.hidden, false);
  pending.emit('error');
  assert.equal(pending.hidden, true);
  assert.equal(successful.hidden, false);
});

test('missing currentScript falls back to the current document directory', () => {
  const store = new Map();
  const first = openPage({ store, scriptURL: null });
  first.choose('dark');
  const returning = openPage({ store, scriptURL: null });
  assert.equal(returning.root.dataset.theme, 'dark');
  const other = openPage({ store, scriptURL: null, url: 'https://profiles.example/people/bob/index.html' });
  assert.equal(other.root.dataset.theme, undefined);
});
