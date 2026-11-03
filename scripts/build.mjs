import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderProfile, validateProfile } from '../src/render.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readProfile(filename) {
  try { return validateProfile(JSON.parse(await fs.readFile(filename, 'utf8'))); }
  catch (error) { throw new Error(`${path.basename(filename)}: ${error.message}`, { cause: error }); }
}
async function rejectSymlinks(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Public asset ${filename} is a symbolic link. Use a regular file inside public/.`);
    if (entry.isDirectory()) await rejectSymlinks(filename);
    else if (!entry.isFile()) throw new Error(`Public asset ${filename} is not a regular file.`);
  }
}
async function validateAssets(profile, publicRoot, filename) {
  const assets = [
    { value: profile.portrait?.src, field: 'portrait.src', allowed: /\.(?:avif|gif|jpe?g|png|svg|webp)$/i, formats: 'AVIF, GIF, JPG, PNG, SVG, or WebP' },
    { value: profile.site?.image, field: 'site.image', allowed: /\.(?:avif|gif|jpe?g|png|svg|webp)$/i, formats: 'AVIF, GIF, JPG, PNG, SVG, or WebP' },
    { value: profile.site?.favicon, field: 'site.favicon', allowed: /\.(?:svg|png|ico)$/i, formats: 'SVG, PNG, or ICO' },
  ];
  for (const { value: asset, field, allowed, formats } of assets) {
    if (!asset) continue;
    let info;
    try { info = await fs.stat(path.join(publicRoot, asset)); }
    catch (error) {
      if (error.code === 'ENOENT') throw new Error(`${filename}: ${field}: ${asset} is missing. Place the image in public/${asset}.`);
      throw new Error(`${filename}: ${field}: cannot read public/${asset}: ${error.message}`, { cause: error });
    }
    if (!info.isFile()) throw new Error(`${filename}: ${field}: ${asset} must be an image file, not a directory.`);
    if (!allowed.test(asset)) throw new Error(`${filename}: ${field}: ${asset} must be ${formats}.`);
  }
}

export async function buildSite(root = projectRoot) {
  root = path.resolve(root);
  const publicRoot = path.join(root, 'public');
  const dist = path.join(root, 'dist');
  const profiles = [{ filename: 'profile.json', output: 'index.html', assetPrefix: '', profile: await readProfile(path.join(root, 'profile.json')) }];
  const examplesRoot = path.join(root, 'examples');
  let examples = [];
  try { if (profiles[0].profile.demo) examples = await fs.readdir(examplesRoot, { withFileTypes: true }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const entry of examples.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.name.endsWith('.json')) continue;
    if (!entry.isFile() || !/^[a-z0-9-]+\.json$/u.test(entry.name)) throw new Error(`examples/${entry.name}: use a regular JSON file with a lowercase, dash-separated name.`);
    const output = `examples/${entry.name.slice(0, -5)}.html`;
    profiles.push({ filename: `examples/${entry.name}`, output, assetPrefix: '../', profile: await readProfile(path.join(examplesRoot, entry.name)) });
  }
  const publicInfo = await fs.lstat(publicRoot).catch(error => {
    if (error.code === 'ENOENT') throw new Error('public/ is missing. Restore the public assets before building.');
    throw error;
  });
  if (!publicInfo.isDirectory() || publicInfo.isSymbolicLink()) throw new Error('public/ must be a regular directory inside this project, not a symbolic link.');
  await rejectSymlinks(publicRoot);
  // The demonstration guide has its own fixed template favicon. Personal pages use site.favicon.
  const requiredAssets = ['assets/site.css', 'assets/enhance.js', ...(profiles[0].profile.demo ? ['assets/favicon.svg'] : [])];
  for (const required of requiredAssets) {
    const info = await fs.stat(path.join(publicRoot, required)).catch(error => {
      if (error.code === 'ENOENT') throw new Error(`Required file public/${required} is missing. Restore it before building.`);
      throw error;
    });
    if (!info.isFile()) throw new Error(`Required file public/${required} must be a regular file.`);
  }
  for (const item of profiles) {
    await validateAssets(item.profile, publicRoot, item.filename);
    item.html = renderProfile(item.profile, { assetPrefix: item.assetPrefix, currentPath: item.output });
  }
  const previous = await fs.lstat(dist).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (previous && (!previous.isDirectory() || previous.isSymbolicLink())) throw new Error('dist must be a generated directory, not a file or symbolic link.');

  // All configuration and asset checks pass before the existing output changes.
  const stage = await fs.mkdtemp(path.join(root, '.elsewhere-build-'));
  const backup = `${stage}-previous`;
  let backedUp = false;
  try {
    await fs.cp(publicRoot, stage, {
      recursive: true,
      filter: source => profiles[0].profile.demo || source !== path.join(publicRoot, 'guide.html'),
    });
    for (const item of profiles) {
      const target = path.join(stage, item.output);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, item.html, 'utf8');
    }
    await fs.writeFile(path.join(stage, '.nojekyll'), '', 'utf8');
    if (previous) { await fs.rename(dist, backup); backedUp = true; }
    try { await fs.rename(stage, dist); }
    catch (error) { if (backedUp) { await fs.rename(backup, dist); backedUp = false; } throw error; }
    if (backedUp) await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    await fs.rm(stage, { recursive: true, force: true });
    throw error;
  }
  return { directory: dist, pages: profiles.map(item => item.output) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await buildSite();
    console.log(`Built ${result.pages.length} profile pages in ${result.directory}`);
  } catch (error) {
    console.error(`Build stopped: ${error.message}`);
    process.exitCode = 1;
  }
}
