import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesPreviewHost } from '../scripts/preview-host.mjs';

test('preview requests must name the bound host and port exactly once', () => {
  const host = '127.0.0.1:53001';
  assert.equal(matchesPreviewHost([host], 53001), true);
  assert.equal(matchesPreviewHost([host], 4173), false);
  assert.equal(matchesPreviewHost(['preview.example:53001'], 53001), false);
  assert.equal(matchesPreviewHost(undefined, 53001), false);
  assert.equal(matchesPreviewHost([host, host], 53001), false);
});

test('the HTTP default port may be omitted', () => {
  assert.equal(matchesPreviewHost(['127.0.0.1:80'], 80), true);
  assert.equal(matchesPreviewHost(['127.0.0.1'], 80), true);
  assert.equal(matchesPreviewHost(['127.0.0.1'], 4173), false);
});
