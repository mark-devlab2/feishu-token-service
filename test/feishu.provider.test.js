const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

const { FeishuProvider } = require('../dist/provider/feishu.provider');

function makeProvider(scopes) {
  process.env.FEISHU_SCOPES = scopes;
  return new FeishuProvider();
}

function normalizeTokenResponse(provider, data, fallbackScopes) {
  return provider.normalizeTokenResponse(data, fallbackScopes);
}

async function withMockedAxiosRequest(implementation, run) {
  const original = axios.request;
  axios.request = implementation;
  try {
    await run();
  } finally {
    axios.request = original;
  }
}

test('parses scope strings with spaces and commas', () => {
  const provider = makeProvider('offline_access');
  const result = normalizeTokenResponse(provider, {
    code: 0,
    data: {
      access_token: 'token',
      expires_in: 3600,
      scope: 'offline_access docs:document.content:read, wiki:node:read',
    },
  });

  assert.deepEqual(result.scope, [
    'offline_access',
    'docs:document.content:read',
    'wiki:node:read',
  ]);
});

test('parses scope arrays from scope and scopes fields', () => {
  const provider = makeProvider('offline_access');
  const result = normalizeTokenResponse(provider, {
    code: 0,
    data: {
      access_token: 'token',
      expires_in: 3600,
      scope: ['offline_access', 'docs:document.content:read'],
      scopes: ['wiki:node:read', 'offline_access'],
    },
  });

  assert.deepEqual(result.scope, [
    'offline_access',
    'docs:document.content:read',
    'wiki:node:read',
  ]);
});

test('falls back to requested scopes when upstream omits them', () => {
  const provider = makeProvider('offline_access,docx:document:readonly,docs:document.content:read');
  const result = normalizeTokenResponse(provider, {
    code: 0,
    data: {
      access_token: 'token',
      expires_in: 3600,
    },
  }, provider.defaultScopes());

  assert.deepEqual(result.scope, [
    'offline_access',
    'docx:document:readonly',
    'docs:document.content:read',
  ]);
});

test('refresh fallback preserves stored scopes before env defaults', () => {
  const provider = makeProvider('offline_access,docx:document:readonly');
  const result = normalizeTokenResponse(provider, {
    code: 0,
    data: {
      access_token: 'token',
      expires_in: 3600,
    },
  }, ['wiki:node:read', 'minutes:minutes:readonly']);

  assert.deepEqual(result.scope, [
    'wiki:node:read',
    'minutes:minutes:readonly',
  ]);
});

test('falls back to env defaults when stored scopes are also empty', () => {
  const provider = makeProvider('offline_access,wiki:wiki:readonly');
  const result = normalizeTokenResponse(provider, {
    code: 0,
    data: {
      access_token: 'token',
      expires_in: 3600,
    },
  }, provider.defaultScopes());

  assert.deepEqual(result.scope, [
    'offline_access',
    'wiki:wiki:readonly',
  ]);
});

test('uses built-in default scopes when env scopes are empty', () => {
  const provider = makeProvider('');

  assert.equal(provider.defaultScopes().includes('docs:document.content:read'), true);
  assert.equal(provider.defaultScopes().includes('minutes:minutes.basic:read'), true);
});

test('maps axios 403 errors to permission denied', async () => {
  const provider = makeProvider('offline_access');

  await withMockedAxiosRequest(
    async () => {
      const error = new Error('Request failed with status code 403');
      error.response = { status: 403, data: { code: 99991663, msg: 'permission denied' } };
      throw error;
    },
    async () => {
      await assert.rejects(
        provider.getDocumentRawContent('token', 'doc'),
        (error) => error.getStatus() === 403 && error.message === 'permission denied',
      );
    },
  );
});

test('maps axios 404 errors to resource not found', async () => {
  const provider = makeProvider('offline_access');

  await withMockedAxiosRequest(
    async () => {
      const error = new Error('Request failed with status code 404');
      error.response = { status: 404, data: { code: 91403, msg: 'resource not found' } };
      throw error;
    },
    async () => {
      await assert.rejects(
        provider.getDocumentRawContent('token', 'missing'),
        (error) => error.getStatus() === 404 && error.message === 'resource not found',
      );
    },
  );
});

test('maps 400 docs resource-read failures to resource not found', async () => {
  const provider = makeProvider('offline_access');

  await withMockedAxiosRequest(
    async () => {
      const error = new Error('Request failed with status code 400');
      error.response = { status: 400, data: { code: 91404, msg: 'invalid document token' } };
      throw error;
    },
    async () => {
      await assert.rejects(
        provider.getDocumentRawContent('token', 'doc'),
        (error) => error.getStatus() === 404 && error.message === 'resource not found',
      );
    },
  );
});

test('maps non-auth upstream failures to bad gateway', async () => {
  const provider = makeProvider('offline_access');

  await withMockedAxiosRequest(
    async () => {
      const error = new Error('socket hang up');
      error.response = { status: 500, data: { code: 100500, msg: 'internal error' } };
      throw error;
    },
    async () => {
      await assert.rejects(
        provider.getDocumentRawContent('token', 'doc'),
        (error) => error.getStatus() === 502 && error.message === 'feishu upstream error',
      );
    },
  );
});

test('maps non-zero feishu body codes on 200 responses', async () => {
  const provider = makeProvider('offline_access');

  await withMockedAxiosRequest(
    async () => ({
      data: {
        code: 99991663,
        msg: 'permission denied',
      },
    }),
    async () => {
      await assert.rejects(
        provider.getDocumentRawContent('token', 'doc'),
        (error) => error.getStatus() === 403 && error.message === 'permission denied',
      );
    },
  );
});
