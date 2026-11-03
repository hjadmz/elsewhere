import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = (await readFile(new URL('../public/assets/site.css', import.meta.url), 'utf8'))
  .replace(/\/\*[\s\S]*?\*\//g, '');
const tokenNames = ['--bg', '--surface', '--ink', '--muted', '--accent', '--accent-hover', '--focus', '--control'];

// Resolve the palette's actual root declarations. This deliberately supports the
// selectors used by the template, not all CSS. A new palette selector syntax
// fails loudly so a parser limitation cannot silently certify untested colors.
function blocks(source, media = []) {
  const output = [];
  let offset = 0;
  while (offset < source.length) {
    const open = source.indexOf('{', offset);
    if (open < 0) break;
    const selector = source.slice(offset, open).trim();
    let depth = 1;
    let end = open + 1;
    for (; end < source.length && depth; end += 1) {
      if (source[end] === '{') depth += 1;
      if (source[end] === '}') depth -= 1;
    }
    assert.equal(depth, 0, 'CSS blocks must be balanced');
    const body = source.slice(open + 1, end - 1);
    if (selector.startsWith('@media')) output.push(...blocks(body, [...media, selector]));
    else if (selector.includes(':root')) {
      const values = {};
      for (const declaration of body.split(';')) {
        const pair = declaration.match(/^\s*(--[\w-]+)\s*:\s*(.*?)\s*$/);
        if (pair && tokenNames.includes(pair[1])) values[pair[1]] = pair[2];
      }
      if (Object.keys(values).length) output.push({ selector, values, media });
    }
    offset = end;
  }
  return output;
}

function attributeMatches(selector, attributes) {
  const parsed = selector.match(/^\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]$/);
  assert.ok(parsed, `Unsupported palette attribute selector: ${selector}`);
  const value = parsed[2] ?? parsed[3] ?? parsed[4];
  return value === undefined ? Object.hasOwn(attributes, parsed[1]) : attributes[parsed[1]] === value;
}

function matches(selector, attributes) {
  let matched = true;
  let remaining = selector.replace(/:not\((\[[^\]]+\])\)/g, (_, inner) => {
    if (attributeMatches(inner, attributes)) matched = false;
    return '';
  });
  remaining = remaining.replace(/\[[^\]]+\]/g, (part) => {
    if (!attributeMatches(part, attributes)) matched = false;
    return '';
  }).replace(':root', '').trim();
  assert.equal(remaining, '', `Unsupported palette selector: ${selector}`);
  return matched;
}

const rules = blocks(css);
assert.ok(rules.length > 0, 'No palette rules found');

function palette(attributes, systemTheme) {
  const result = {};
  const ranks = {};
  for (const rule of rules) {
    const relevant = rule.media.every((query) => {
      if (query === '@media print') return false;
      assert.match(query, /^@media\s*\(prefers-color-scheme\s*:\s*dark\)$/, `Unhandled palette media: ${query}`);
      return systemTheme === 'dark';
    });
    if (!relevant) continue;
    for (const selector of rule.selector.split(',').map((part) => part.trim())) {
      if (!matches(selector, attributes)) continue;
      const specificity = 1 + (selector.match(/\[/g) ?? []).length;
      for (const [name, color] of Object.entries(rule.values)) {
        if ((ranks[name] ?? -1) <= specificity) {
          result[name] = color;
          ranks[name] = specificity;
        }
      }
    }
  }
  for (const name of tokenNames) assert.match(result[name] ?? '', /^#(?:[\da-f]{3}|[\da-f]{6})$/i, `${name} must resolve to an sRGB hex color`);
  return result;
}

function luminance(hex) {
  let digits = hex.slice(1);
  if (digits.length === 3) digits = [...digits].map((digit) => digit + digit).join('');
  const channels = digits.match(/../g).map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const color of ['paper', 'stone']) {
  for (const accent of ['blue', 'rust', 'forest']) {
    for (const mode of ['light', 'dark']) {
      test(`${color}/${accent}/${mode}: text and control contrast on page and hover surfaces`, () => {
        const attrs = { 'data-palette': color, 'data-accent': accent, 'data-theme': mode };
        const resolved = palette(attrs, mode === 'light' ? 'dark' : 'light');
        const system = palette({ 'data-palette': color, 'data-accent': accent }, mode);
        const explicitSystem = palette({ 'data-palette': color, 'data-accent': accent, 'data-theme': 'system' }, mode);
        assert.deepEqual(resolved, system, 'System preference must match the corresponding explicit theme');
        assert.deepEqual(resolved, explicitSystem, 'Explicit system setting must match the operating system');
        for (const background of ['--bg', '--surface']) {
          for (const foreground of ['--ink', '--muted', '--accent', '--accent-hover', '--focus', '--control']) {
            const minimum = ['--focus', '--control'].includes(foreground) ? 3 : 4.5;
            const ratio = contrast(resolved[foreground], resolved[background]);
            assert.ok(ratio >= minimum, `${foreground} ${resolved[foreground]} on ${background} ${resolved[background]} is ${ratio.toFixed(2)}:1; needs ${minimum}:1`);
          }
        }
      });
    }
  }
}

test('default palette equals explicit light paper and blue', () => {
  assert.deepEqual(palette({}, 'light'), palette({ 'data-theme': 'light', 'data-palette': 'paper', 'data-accent': 'blue' }, 'light'));
});
