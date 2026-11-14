/** Regression tests preventing production from booting with the public JWT fallback. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const withoutSecret = spawnSync(process.execPath, ['--input-type=module', '-e', "import './src/config/env.js'"], {
  cwd: new URL('.', import.meta.url),
  encoding: 'utf8',
  env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: '' },
});
assert.notEqual(withoutSecret.status, 0, 'production startup must fail without an explicit JWT secret');
assert.match(withoutSecret.stderr, /JWT_SECRET must be configured when NODE_ENV is production/);

const withSecret = spawnSync(process.execPath, ['--input-type=module', '-e', "import { config } from './src/config/env.js'; if (config.jwtSecret !== process.env.JWT_SECRET) process.exit(2)"], {
  cwd: new URL('.', import.meta.url),
  encoding: 'utf8',
  env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'commit-19-test-secret' },
});
assert.equal(withSecret.status, 0, `production accepts an explicit secret: ${withSecret.stderr}`);

console.log('Production JWT secret configuration tests passed.');
