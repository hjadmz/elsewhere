#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const output = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('PORT must be an integer between 0 and 65535.');
  process.exit(1);
}

let root;
try {
  root = await realpath(output);
  if (!(await stat(join(root, 'index.html'))).isFile()) throw new Error('No index');
} catch {
  console.error('No built site found in dist/. Run npm run build, then npm start.');
  process.exit(1);
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

const insideRoot = (path) => {
  const part = relative(root, path);
  return !isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`)
    && !part.split(sep).some((segment) => segment.startsWith('.'));
};

const server = createServer(async (request, response) => {
  const send = (status, message, headers = {}) => {
    response.writeHead(status, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      ...headers,
    });
    response.end(request.method === 'HEAD' ? undefined : message);
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    send(405, 'Method not allowed.\n', { Allow: 'GET, HEAD' });
    return;
  }

  let path;
  try {
    const target = request.url ?? '/';
    if (!target.startsWith('/') || target.startsWith('//')) throw new Error('Invalid target');
    path = decodeURIComponent(target.split('?')[0]);
    // Inspect the original path before normalization can remove traversal segments.
    if (path.includes('\0') || path.includes('\\') || path.split('/').some((part) => part.startsWith('.'))) {
      send(404, 'Not found.\n');
      return;
    }
  } catch {
    send(400, 'Invalid request path.\n');
    return;
  }

  try {
    let file = join(root, path);
    if (!insideRoot(file)) {
      send(404, 'Not found.\n');
      return;
    }
    file = await realpath(file);
    if (!insideRoot(file)) {
      send(404, 'Not found.\n');
      return;
    }
    let info = await stat(file);
    if (info.isDirectory()) {
      if (!path.endsWith('/')) {
        const query = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : '';
        send(301, 'Moved.\n', { Location: `${request.url.split('?')[0]}/${query}` });
        return;
      }
      file = await realpath(join(file, 'index.html'));
      if (!insideRoot(file)) {
        send(404, 'Not found.\n');
        return;
      }
      info = await stat(file);
    }
    if (!info.isFile()) {
      send(404, 'Not found.\n');
      return;
    }
    response.writeHead(200, {
      'Content-Type': types[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch (error) {
    send(['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code) ? 404 : 500, 'Could not serve this file.\n');
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Try PORT=4174 npm start.`
    : `Preview could not start: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Elsewhere preview: http://127.0.0.1:${server.address().port}`);
  console.log('Serving dist/ only. Press Ctrl+C to stop.');
});
