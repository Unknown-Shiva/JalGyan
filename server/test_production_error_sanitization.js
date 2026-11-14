/** HTTP regression tests that production 5xx responses do not expose internal errors. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { config } from './src/config/env.js';

const originalFindUnique = prisma.user.findUnique;
const originalNodeEnv = config.nodeEnv;
const server = http.createServer(app);

try {
  config.nodeEnv = 'production';
  prisma.user.findUnique = async () => { throw new Error('Database host db-internal.example failed: SELECT users'); };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/auth/login`;
  const request = async body => {
    const response = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  };

  const failure = await request({ email: 'user@test.invalid', password: 'anything' });
  assert.equal(failure.status, 500);
  assert.deepEqual(failure.body, { success: false, message: 'Internal Server Error' });
  assert.equal(JSON.stringify(failure.body).includes('db-internal.example'), false);
  assert.equal(JSON.stringify(failure.body).includes('SELECT users'), false);

  const invalid = await request(undefined);
  assert.equal(invalid.status, 400, 'client validation responses remain useful in production');
  assert.equal(invalid.body.message, 'Please provide both email and password.');
  console.log('Production error sanitization HTTP tests passed.');
} finally {
  prisma.user.findUnique = originalFindUnique;
  config.nodeEnv = originalNodeEnv;
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
}
