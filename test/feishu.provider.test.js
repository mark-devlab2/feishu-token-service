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
  assert.equal(provider.defaultScopes().includes('task:task:read'), true);
  assert.equal(provider.defaultScopes().includes('task:task:write'), true);
});

test('searchMessages posts to search-v2 message endpoint', async () => {
  const provider = makeProvider('offline_access,search:message');
  const calls = [];

  await withMockedAxiosRequest(
    async (config) => {
      calls.push(config);
      return {
        data: {
          code: 0,
          data: {
            items: ['om_1'],
            has_more: false,
          },
        },
      };
    },
    async () => {
      const result = await provider.searchMessages('token', {
        query: 'GHCR',
        pageSize: 10,
        userIdType: 'open_id',
      });
      assert.deepEqual(result, {
        items: ['om_1'],
        page_token: '',
        has_more: false,
      });
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'POST');
  assert.match(calls[0].url, /\/open-apis\/search\/v2\/message\?/);
  assert.equal(calls[0].data.query, 'GHCR');
});

test('searchApps posts to search-v2 app endpoint', async () => {
  const provider = makeProvider('offline_access');
  const calls = [];

  await withMockedAxiosRequest(
    async (config) => {
      calls.push(config);
      return {
        data: {
          code: 0,
          data: {
            items: [
              {
                app_id: 'cli_x',
                app_name: '审批助手',
              },
            ],
            has_more: false,
          },
        },
      };
    },
    async () => {
      const result = await provider.searchApps('token', {
        query: '审批',
        pageSize: 10,
        userIdType: 'open_id',
      });
      assert.deepEqual(result, {
        items: [
          {
            app_id: 'cli_x',
            app_name: '审批助手',
          },
        ],
        page_token: '',
        has_more: false,
      });
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'POST');
  assert.match(calls[0].url, /\/open-apis\/search\/v2\/app\?/);
  assert.equal(calls[0].data.query, '审批');
});

test('listTasks gets user task list endpoint', async () => {
  const provider = makeProvider('offline_access,task:task:read');
  const calls = [];

  await withMockedAxiosRequest(
    async (config) => {
      calls.push(config);
      return {
        data: {
          code: 0,
          data: {
            items: [
              {
                guid: 'task-1',
                summary: 'review deploy',
                completed: false,
              },
            ],
          },
        },
      };
    },
    async () => {
      const result = await provider.listTasks('token', {
        type: 'my_tasks',
        pageSize: 20,
        userIdType: 'open_id',
      });
      assert.deepEqual(result, {
        items: [
          {
            guid: 'task-1',
            summary: 'review deploy',
            description: '',
            completed: false,
            due: null,
          },
        ],
        page_token: '',
        has_more: false,
      });
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.match(calls[0].url, /\/open-apis\/task\/v2\/tasks\?/);
});

test('createTask posts to task endpoint', async () => {
  const provider = makeProvider('offline_access,task:task:write');
  const calls = [];

  await withMockedAxiosRequest(
    async (config) => {
      calls.push(config);
      return {
        data: {
          code: 0,
          data: {
            task: {
              guid: 'task-2',
              summary: 'create task',
            },
          },
        },
      };
    },
    async () => {
      const result = await provider.createTask('token', {
        summary: 'create task',
        description: 'create task',
        userIdType: 'open_id',
      });
      assert.deepEqual(result, {
        task: {
          guid: 'task-2',
          summary: 'create task',
        },
      });
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'POST');
  assert.match(calls[0].url, /\/open-apis\/task\/v2\/tasks\?/);
  assert.equal(calls[0].data.summary, 'create task');
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
