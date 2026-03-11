export type OpenClawPendingIntentResumeContext = {
  kind: 'openclaw_pending_intent_resume';
  version: 1;
  pendingIntentId: string;
  resumeToken: string;
  resumeUrl: string;
};

export function parseOpenClawPendingIntentResumeContext(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OpenClawPendingIntentResumeContext>;
    if (
      parsed.kind !== 'openclaw_pending_intent_resume' ||
      parsed.version !== 1 ||
      !parsed.pendingIntentId ||
      !parsed.resumeToken ||
      !parsed.resumeUrl
    ) {
      return null;
    }
    return parsed as OpenClawPendingIntentResumeContext;
  } catch {
    return null;
  }
}

export async function notifyOpenClawPendingIntentResume(
  context: OpenClawPendingIntentResumeContext,
  payload: {
    state: string;
    provider: string;
    returnContext: string | null;
  },
) {
  const response = await fetch(context.resumeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pendingIntentId: context.pendingIntentId,
      resumeToken: context.resumeToken,
      state: payload.state,
      provider: payload.provider,
      returnContext: payload.returnContext,
    }),
  });

  if (!response.ok) {
    throw new Error(`resume callback failed: ${response.status} ${response.statusText}`);
  }
}
