// Opt-in socket tests, separate from checks that work in restricted sandboxes.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, ['--test', 'tests/portability.test.mjs'], {
  cwd: root,
  env: { ...process.env, ELSEWHERE_TEST_HTTP: '1' },
  stdio: 'inherit',
});
if (result.error) console.error(`Hosting checks could not start: ${result.error.message}`);
process.exitCode = result.status ?? 1;
