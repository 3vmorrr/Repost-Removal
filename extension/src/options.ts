import { BRIDGE_KEY, normalizeWorkerUrl, readBridgeSettings, writeBridgeSettings } from './bridge';
import { applyPreferences, getPreferences, savePreferences } from './preferences';
import { PairingError, readPairingResponse } from './pairingClient.mjs';
import { applyLocalization, t } from './localization';
import { clearItems } from './storage';
import { initialState, readState, writeState } from './shared';

const DEFAULT_WORKER_URL = 'https://tiktok-repost-manager.ebrahimomar493.workers.dev';
const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing options element: ${id}`);
  return element as T;
};

const workerUrl = byId<HTMLInputElement>('worker-url');
const pairCode = byId<HTMLInputElement>('pair-code');
const status = byId<HTMLParagraphElement>('status');
const pairButton = byId<HTMLButtonElement>('pair');

function showStatus(text: string, error = false): void {
  status.textContent = text;
  status.dataset.error = String(error);
}

async function render(): Promise<void> {
  const preferences = await getPreferences();
  byId<HTMLSelectElement>('theme').value = preferences.theme;
  byId<HTMLSelectElement>('locale').value = preferences.locale;
  byId<HTMLSelectElement>('mode').value = preferences.operatingMode;
  byId('mode-help').textContent = t(preferences.operatingMode === 'telegram' ? 'telegramModeHelp' : 'localModeHelp');
  const settings = await readBridgeSettings();
  workerUrl.value = settings.baseUrl || DEFAULT_WORKER_URL;
  byId('quota').textContent = settings.token
    ? t('quota', { attempts: settings.deleteAttempts, limit: settings.dailyLimit, success: settings.deletedToday })
    : '';
  showStatus(t(settings.token ? 'connected' : 'notConnected'));
}

byId<HTMLSelectElement>('theme').addEventListener('change', (event) => {
  void savePreferences({ theme: (event.currentTarget as HTMLSelectElement).value as 'system' | 'light' | 'dark' }).then(applyPreferences);
});
byId<HTMLSelectElement>('locale').addEventListener('change', (event) => {
  void savePreferences({ locale: (event.currentTarget as HTMLSelectElement).value as 'en' | 'ar' }).then(async () => {
    const preferences = await applyPreferences();
    applyLocalization(preferences.locale);
    await render();
  });
});
byId<HTMLSelectElement>('mode').addEventListener('change', (event) => {
  void (async () => {
    const requested = (event.currentTarget as HTMLSelectElement).value as 'local' | 'telegram';
    const bridge = await readBridgeSettings();
    if (requested === 'telegram' && !bridge.token) {
      byId<HTMLSelectElement>('mode').value = 'local';
      showStatus(t('modeRequiresPairing'), true);
      return;
    }
    const state = await readState();
    if (['scanning', 'deleting', 'delete_paused', 'verifying'].includes(state.status)) {
      byId<HTMLSelectElement>('mode').value = (await getPreferences()).operatingMode;
      showStatus(t('modeSwitchDuringTask'), true);
      return;
    }
    const preferences = await savePreferences({ operatingMode: requested });
    await applyPreferences();
    byId('mode-help').textContent = t(preferences.operatingMode === 'telegram' ? 'telegramModeHelp' : 'localModeHelp');
    showStatus(t(requested === 'telegram' ? 'connected' : 'notConnected'));
  })().catch(() => showStatus(t('commandFailed'), true));
});

byId<HTMLButtonElement>('clear-data').addEventListener('click', () => {
  if (!confirm(t('clearConfirm'))) return;
  void (async () => {
    const state = await readState();
    if (['scanning', 'deleting', 'delete_paused', 'verifying'].includes(state.status)) {
      showStatus(t('stopBeforeClear'), true);
      return;
    }
    await Promise.all([clearItems(), writeState(initialState())]);
    showStatus(t('localDataCleared'));
  })().catch(() => showStatus(t('commandFailed'), true));
});

pairButton.addEventListener('click', () => {
  void (async () => {
    pairButton.disabled = true;
    try {
      let baseUrl: string;
      try { baseUrl = normalizeWorkerUrl(workerUrl.value); }
      catch { throw new PairingError('enterWorker'); }
      const code = pairCode.value.trim().toUpperCase();
      if (!/^[A-F0-9]{12}$/.test(code)) throw new PairingError('enterCode');
      const granted = await chrome.permissions.request({ origins: [`${baseUrl}/*`] });
      if (!granted) throw new PairingError('permissionDenied');
      const response = await fetch(`${baseUrl}/api/extension/pair`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }), cache: 'no-store', signal: AbortSignal.timeout(15_000)
      });
      const result = await readPairingResponse(response);
      const previous = await readBridgeSettings();
      await writeBridgeSettings({
        ...previous, baseUrl, token: result.token, taskId: '', taskKind: '', lastError: '',
        dailyLimit: result.dailyLimit, deleteAttempts: 0, deletedToday: 0
      });
      await savePreferences({ operatingMode: 'telegram' });
      pairCode.value = '';
      await chrome.runtime.sendMessage({ type: 'BRIDGE_WAKE' });
      showStatus(t('pairingSuccess'));
      await render();
    } catch (error) {
      const key = error instanceof PairingError ? error.key : 'workerError';
      showStatus(t(key), true);
    } finally { pairButton.disabled = false; }
  })();
});

byId<HTMLButtonElement>('disconnect').addEventListener('click', () => {
  void (async () => {
    const settings = await readBridgeSettings();
    if (settings.token) {
      try {
        await fetch(`${settings.baseUrl}/api/extension/disconnect`, {
          method: 'POST', headers: { authorization: `Bearer ${settings.token}` }, cache: 'no-store'
        });
      } catch { /* Revoke locally even if the Worker is unavailable. */ }
    }
    await chrome.storage.local.remove(BRIDGE_KEY);
    await chrome.alarms.clear('cloud-bridge');
    await savePreferences({ operatingMode: 'local' });
    showStatus(t('disconnected'));
    await render();
  })().catch(() => showStatus(t('commandFailed'), true));
});

void applyPreferences().then(async () => render());
