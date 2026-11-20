const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../server');

let server;
let baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Authentication & Session Management API', () => {
  let adminToken;
  let registeredToken;
  const uniqueId = Date.now();

  test('POST /api/auth/login succeeds with valid admin credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'admin@company.com',
        password: 'admin123'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.token);
    assert.strictEqual(body.user.email, 'admin@company.com');
    assert.strictEqual(body.user.role, 'IT Administrator');
    adminToken = body.token;
  });

  test('POST /api/auth/login also succeeds using username instead of email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'admin',
        password: 'admin123'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.token);
  });

  test('POST /api/auth/login rejects incorrect password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'admin@company.com',
        password: 'wrongpassword'
      })
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('password'));
  });

  test('POST /api/auth/login rejects non-existent email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'unknown_ghost_user@company.com',
        password: 'admin123'
      })
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  test('POST /api/auth/register registers a new user and returns token', async () => {
    const newUserData = {
      full_name: 'John Doe Developer',
      email: `john.doe.${uniqueId}@company.com`,
      username: `johndoe_${uniqueId}`,
      password: 'SecurePassword123',
      role: 'Logistics Officer'
    };

    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUserData)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.token);
    assert.strictEqual(body.user.full_name, 'John Doe Developer');
    assert.strictEqual(body.user.role, 'Logistics Officer');
    registeredToken = body.token;
  });

  test('POST /api/auth/register rejects duplicate email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Clone User',
        email: `john.doe.${uniqueId}@company.com`,
        username: `clone_${uniqueId}`,
        password: 'Password123',
        role: 'Staff Member'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.toLowerCase().includes('already exists'));
  });

  test('GET /api/auth/me returns profile for authenticated user', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.email, 'admin@company.com');
  });

  test('GET /api/auth/me rejects request without token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(res.status, 401);
  });

  test('POST /api/auth/logout invalidates session token', async () => {
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${registeredToken}`
      }
    });

    assert.strictEqual(logoutRes.status, 200);

    // After logout, me request should fail
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${registeredToken}`
      }
    });
    assert.strictEqual(meRes.status, 401);
  });
});
