export type SessionState = 'unknown' | 'checking' | 'logged-out' | 'logged-in';

export interface TikTokIdentitySignal {
  secUid?: unknown;
  handle?: unknown;
  loggedOutSignal?: unknown;
}

export interface SessionSnapshot { status: SessionState; handle: string | null; stableId: string | null; }

/** Only report a login when TikTok exposes a stable signed-in user identity. */
export function classifyTikTokSession(signal: TikTokIdentitySignal | null | undefined): SessionSnapshot {
  const stableId = typeof signal?.secUid === 'string' && signal.secUid.trim() ? signal.secUid : null;
  const handle = typeof signal?.handle === 'string' && signal.handle.trim() ? signal.handle.replace(/^@/, '') : null;
  if (stableId && handle) return { status: 'logged-in', handle, stableId };
  if (signal?.loggedOutSignal === true) return { status: 'logged-out', handle: null, stableId: null };
  return { status: 'unknown', handle: null, stableId: null };
}
