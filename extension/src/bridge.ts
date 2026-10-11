export const BRIDGE_KEY = 'repost-remover-cloud-bridge-v1';

export interface BridgeSettings {
  baseUrl: string;
  token: string;
  taskId: string;
  taskKind: 'scan' | 'delete' | '';
  lastError: string;
  dailyLimit: number;
  deleteAttempts: number;
  deletedToday: number;
}

export const emptyBridgeSettings = (): BridgeSettings => ({
  baseUrl: '', token: '', taskId: '', taskKind: '', lastError: '',
  dailyLimit: 1000, deleteAttempts: 0, deletedToday: 0
});

export async function readBridgeSettings(): Promise<BridgeSettings> {
  const stored = await chrome.storage.local.get(BRIDGE_KEY);
  return { ...emptyBridgeSettings(), ...(stored[BRIDGE_KEY] as Partial<BridgeSettings> | undefined) };
}

export async function writeBridgeSettings(settings: BridgeSettings): Promise<void> {
  await chrome.storage.local.set({ [BRIDGE_KEY]: settings });
}

export function normalizeWorkerUrl(value: string): string {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.workers.dev')) {
    throw new Error('استخدم رابط Worker من نوع https://اسمك.workers.dev');
  }
  return parsed.origin;
}

export async function workerRequest<T>(path: string, body?: unknown): Promise<T> {
  const settings = await readBridgeSettings();
  if (!settings.baseUrl || !settings.token) throw new Error('اربط الإضافة بالبوت من صفحة الإعدادات أولاً.');
  const response = await fetch(`${settings.baseUrl}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${settings.token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000)
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? `Worker request failed (${response.status}).`);
  return result;
}

export async function publishCloudState(taskId: string, state: {
  status: string; message: string; lastError: string; collected: number; selected: number;
  removed: number; failed: number; remaining: number; pagesScanned: number;
}): Promise<void> {
  const settings = await readBridgeSettings();
  if (!settings.token || !taskId || settings.taskId !== taskId) return;
  try {
    const response = await workerRequest<{ usage?: { attempts?: number; deleted?: number }; dailyLimit?: number }>('/api/extension/report', {
      taskId,
      status: state.status,
      message: state.message,
      error: state.lastError,
      counts: {
        collected: state.collected, selected: state.selected, removed: state.removed,
        failed: state.failed, remaining: state.remaining, pagesScanned: state.pagesScanned
      }
    });
    const latest = await readBridgeSettings();
    await writeBridgeSettings({
      ...latest,
      dailyLimit: Number(response.dailyLimit ?? latest.dailyLimit),
      deleteAttempts: Number(response.usage?.attempts ?? latest.deleteAttempts),
      deletedToday: Number(response.usage?.deleted ?? latest.deletedToday),
      lastError: ''
    });
  } catch (error) {
    const latest = await readBridgeSettings();
    await writeBridgeSettings({ ...latest, lastError: error instanceof Error ? error.message : String(error) });
  }
}
