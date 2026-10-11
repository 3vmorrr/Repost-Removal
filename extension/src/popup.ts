import { STATE_KEY, initialState, readState, type Message, type RunState } from './shared';
import { applyPreferences, getPreferences } from './preferences';
import { localizeMessage, t } from './localization';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing popup element: ${id}`);
  return element as T;
};

const scan = byId<HTMLButtonElement>('scan');
const stopScan = byId<HTMLButtonElement>('stop-scan');
const review = byId<HTMLButtonElement>('review');
byId<HTMLButtonElement>('settings').addEventListener('click', () => void chrome.runtime.openOptionsPage());
const sessionButton = byId<HTMLButtonElement>('check-session');
sessionButton.addEventListener('click', () => {
  const output = byId<HTMLParagraphElement>('session-status');
  output.textContent = t('accountChecking');
  sessionButton.disabled = true;
  void chrome.runtime.sendMessage({ type: 'CHECK_SESSION' } satisfies Message)
    .then((result: { profileDetected?: boolean; reason?: string }) => {
      output.textContent = result.profileDetected
        ? t('accountDetected')
        : result.reason === 'no-tiktok-tab'
          ? t('accountNoTab')
          : t('accountMissing');
      byId('account-badge').textContent = result.profileDetected ? t('accountConnected') : t('accountUnknown');
      byId('account-badge').setAttribute('data-state', result.profileDetected ? 'connected' : '');
    })
    .catch(() => { output.textContent = t('accountError'); })
    .finally(() => { sessionButton.disabled = false; });
});
let currentState = initialState();

function duration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  if (seconds < 60) return t('seconds', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? t('minutes', { minutes, seconds: seconds % 60 }) : t('hours', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}

function render(state: RunState): void {
  currentState = state;
  for (const key of ['collected', 'selected', 'removed', 'failed', 'remaining'] as const) byId(key).textContent = String(state[key]);
  byId('status').textContent = localizeMessage(state.message);
  byId('pages').textContent = `${state.pagesScanned}${state.cursor ? ` · cursor ${state.cursor}` : ''}`;
  byId('page-size').textContent = state.actualPageSize ? t('pageSizeReturned', { count: state.actualPageSize }) : '—';
  const startedAt = state.status === 'scanning' ? state.scanStartedAt : state.deleteStartedAt ?? state.scanStartedAt;
  byId('elapsed').textContent = startedAt ? duration((state.finishedAt ?? Date.now()) - startedAt) : t('seconds', { count: 0 });
  byId('estimate').textContent = state.status === 'scanning'
    ? t('scanPacing')
    : state.scanComplete ? t('scanComplete') : state.collected > 0 ? t('partialScan') : t('scanIdle');
  const active = state.status === 'scanning' || state.status === 'deleting' || state.status === 'verifying' || state.status === 'delete_paused';
  scan.disabled = active;
  stopScan.disabled = state.status !== 'scanning';
  review.disabled = state.collected === 0;
  const error = byId('error');
  error.hidden = !state.lastError;
  error.textContent = state.lastError;
  byId('progress-fill').classList.toggle('running', state.status === 'scanning');
  byId('progress-fill').style.width = state.scanComplete ? '100%' : state.collected > 0 ? '42%' : '0%';
}

async function renderMode(): Promise<void> {
  const preferences = await getPreferences();
  byId('mode-label').textContent = t(preferences.operatingMode === 'telegram' ? 'telegramModeName' : 'localModeName');
  byId('mode-description').textContent = t(preferences.operatingMode === 'telegram' ? 'telegramModeHelp' : 'localModeHelp');
}

async function command(message: Message): Promise<void> {
  const response = await chrome.runtime.sendMessage(message) as { ok: boolean; error?: string };
  if (!response.ok) {
    const error = byId('error');
    error.hidden = false;
    error.textContent = response.error ? localizeMessage(response.error) : t('commandFailed');
  }
}

scan.addEventListener('click', () => {
  if (currentState.collected === 0 || confirm(t('confirmNewScan'))) void command({ type: 'START_SCAN' });
});
stopScan.addEventListener('click', () => void command({ type: 'STOP_SCAN' }));
review.addEventListener('click', () => void chrome.tabs.create({ url: chrome.runtime.getURL('review.html') }));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[STATE_KEY]?.newValue) render(changes[STATE_KEY].newValue as RunState);
  if (changes['repost-remover-preferences-v1']) void applyPreferences().then(() => { render(currentState); return renderMode(); });
});
void applyPreferences().then(async () => { await Promise.all([readState().then(render), renderMode()]); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes['repost-remover-preferences-v1']) void renderMode();
});
window.setInterval(() => render(currentState), 1_000);
