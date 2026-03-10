const test = require('node:test');
const assert = require('node:assert/strict');

const {
  notifyOpenClawPendingIntentResume,
  parseOpenClawPendingIntentResumeContext,
} = require('../dist/auth/openclaw-return-context');

test('parses valid OpenClaw pending intent resume context', () => {
  const result = parseOpenClawPendingIntentResumeContext(JSON.stringify({
    kind: 'openclaw_pending_intent_resume',
    version: 1,
    pendingIntentId: 'intent-1',
    resumeToken: 'token-1',
    resumeUrl: 'http://127.0.0.1:38451/openclaw/dual-identity/resume',
  }));

  assert.deepEqual(result, {
    kind: 'openclaw_pending_intent_resume',
    version: 1,
    pendingIntentId: 'intent-1',
    resumeToken: 'token-1',
    resumeUrl: 'http://127.0.0.1:38451/openclaw/dual-identity/resume',
  });
});

test('returns null for invalid OpenClaw pending intent resume context', () => {
  assert.equal(parseOpenClawPendingIntentResumeContext('not-json'), null);
  assert.equal(parseOpenClawPendingIntentResumeContext(JSON.stringify({ kind: 'other' })), null);
});

test('posts pending intent resume notification to OpenClaw runtime', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 202,
      statusText: 'Accepted',
    };
  };

  try {
    await notifyOpenClawPendingIntentResume(
      {
        kind: 'openclaw_pending_intent_resume',
        version: 1,
        pendingIntentId: 'intent-1',
        resumeToken: 'token-1',
        resumeUrl: 'http://127.0.0.1:38451/openclaw/dual-identity/resume',
      },
      {
        state: 'state-1',
        provider: 'feishu',
        returnContext: '{"kind":"openclaw_pending_intent_resume"}',
      },
    );
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://127.0.0.1:38451/openclaw/dual-identity/resume');
  assert.equal(calls[0].init.method, 'POST');

  const payload = JSON.parse(calls[0].init.body);
  assert.deepEqual(payload, {
    pendingIntentId: 'intent-1',
    resumeToken: 'token-1',
    state: 'state-1',
    provider: 'feishu',
    returnContext: '{"kind":"openclaw_pending_intent_resume"}',
  });
});
