import { STATE_KEY, initialState, readState, type Message, type RepostRecord, type RunState } from './shared';
import { getItems, getItemsPage } from './storage';
import { applyPreferences } from './preferences';
import { localizeMessage, t } from './localization';

const PAGE_SIZE = 60;
const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing review element: ${id}`);
  return element as T;
};

let state = initialState();
let items: RepostRecord[] = [];
let visibleTotal = 0;
let page = 0;

function duration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  if (seconds < 60) return t('seconds', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? t('minutes', { minutes, seconds: seconds % 60 }) : t('hours', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}

function itemStatus(item: RepostRecord): string {
  const status = item.status === 'pending' ? item.selected ? 'statusPending' : 'statusReady'
    : item.status === 'removing' ? 'statusRemoving'
      : item.status === 'removed' ? 'statusRemoved'
        : item.status === 'failed' ? 'statusFailed'
          : item.status === 'remaining' ? 'statusRemaining' : item.status;
  return t(status);
}

function renderItems(): void {
  const pageItems = items;
  const container = byId('items');
  const empty = byId<HTMLParagraphElement>('empty-state');
  empty.hidden = visibleTotal > 0;
  empty.textContent = state.collected === 0
    ? t('noReposts')
    : t('noMatches');
  container.replaceChildren(...pageItems.map((item) => {
    const card = document.createElement('article');
    card.className = 'card';
    const image = item.thumbnail ? document.createElement('img') : document.createElement('div');
    if (image instanceof HTMLImageElement) {
      image.src = item.thumbnail;
      image.alt = '';
      image.loading = 'lazy';
      image.addEventListener('error', () => image.replaceWith(Object.assign(document.createElement('div'), { className: 'placeholder' })));
    } else image.className = 'placeholder';
    const body = document.createElement('div');
    body.className = 'body';
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.selected;
    checkbox.disabled = item.status === 'removed' || ['deleting', 'delete_paused', 'verifying'].includes(state.status);
    const creator = document.createElement('span');
    creator.className = 'creator';
    creator.textContent = `@${item.creator}`;
    checkbox.addEventListener('change', () => void command({ type: 'SET_SELECTED', id: item.id, selected: checkbox.checked }));
    label.append(checkbox, creator);
    const caption = document.createElement('p');
    caption.className = 'caption';
    caption.textContent = item.description || t('noCaption');
    const meta = document.createElement('div');
    meta.className = 'meta';
    const status = document.createElement('span');
    status.className = item.status;
    status.textContent = itemStatus(item);
    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = item.id;
    meta.append(status, link);
    body.append(label, caption, meta);
    card.append(image, body);
    return card;
  }));
  const pages = Math.max(1, Math.ceil(visibleTotal / PAGE_SIZE));
  byId('page').textContent = t('pageOf', { page: page + 1, pages, count: visibleTotal });
  byId<HTMLButtonElement>('previous').disabled = page === 0;
  byId<HTMLButtonElement>('next').disabled = page + 1 >= pages;
}

function renderState(next: RunState): void {
  const previous = state;
  state = next;
  for (const key of ['collected', 'selected', 'removed', 'failed', 'remaining'] as const) byId(key).textContent = String(state[key]);
  byId('status').textContent = localizeMessage(state.message);
  const elapsed = state.deleteStartedAt ? (state.finishedAt ?? Date.now()) - state.deleteStartedAt : 0;
  renderTimer(elapsed);
  const locked = ['deleting', 'delete_paused', 'verifying'].includes(state.status);
  for (const id of ['all', 'none', 'invert'] as const) byId<HTMLButtonElement>(id).disabled = locked || items.length === 0;
  byId<HTMLButtonElement>('delete').disabled = locked || state.remaining === 0;
  byId<HTMLButtonElement>('pause').disabled = state.status !== 'deleting';
  byId<HTMLButtonElement>('resume').disabled = state.status !== 'delete_paused' && state.status !== 'delete_stopped';
  byId<HTMLButtonElement>('stop').disabled = state.status !== 'deleting' && state.status !== 'verifying' && state.status !== 'delete_paused';
  byId<HTMLButtonElement>('retry').disabled = locked || state.remaining === 0;
  const error = byId('error');
  error.hidden = !state.lastError;
  error.textContent = state.lastError;
  if (state.collected !== previous.collected || state.selected !== previous.selected || (previous.status === 'verifying' && state.status === 'completed')) void refreshItems();
  else renderItems();
}

function renderTimer(elapsed = state.deleteStartedAt ? (state.finishedAt ?? Date.now()) - state.deleteStartedAt : 0): void {
  byId('elapsed').textContent = duration(elapsed);
  const completed = state.removed + state.failed;
  byId('eta').textContent = state.status === 'delete_paused' ? t('pause') : completed && state.remaining
    ? `~${duration((elapsed / completed) * state.remaining)}` : state.remaining ? 'Calculating' : '—';
}

async function refreshItems(): Promise<void> {
  const offset = page * PAGE_SIZE;
  const result = await getItemsPage(byId<HTMLInputElement>('search').value, offset, PAGE_SIZE);
  visibleTotal = result.total;
  const pages = Math.max(1, Math.ceil(visibleTotal / PAGE_SIZE));
  if (page >= pages) { page = pages - 1; return refreshItems(); }
  items = result.items;
  renderItems();
}

async function command(message: Message): Promise<boolean> {
  try {
    const response = await chrome.runtime.sendMessage(message) as { ok: boolean; error?: string };
    if (!response.ok) throw new Error(response.error ?? 'Extension command failed.');
    return true;
  } catch (error) {
    const banner = byId('error');
    banner.hidden = false;
    banner.textContent = error instanceof Error ? localizeMessage(error.message) : t('commandFailed');
    return false;
  }
}

async function select(mode: 'all' | 'none' | 'invert'): Promise<void> {
  if (await command({ type: 'SELECT_ITEMS', mode })) await refreshItems();
}

async function exportFile(format: 'json' | 'csv'): Promise<void> {
  const allItems = await getItems();
  const data = format === 'json'
    ? JSON.stringify(allItems, null, 2)
    : ['id,creator,description,url,selected,status,error', ...allItems.map((item) => [item.id, item.creator, item.description, item.url, item.selected, item.status, item.error]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `tiktok-reposts-${new Date().toISOString().slice(0, 10)}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

let searchTimer = 0;
byId('search').addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => { page = 0; void refreshItems(); }, 180);
});
byId('all').addEventListener('click', () => void select('all'));
byId('none').addEventListener('click', () => void select('none'));
byId('invert').addEventListener('click', () => void select('invert'));
byId('previous').addEventListener('click', () => { page -= 1; void refreshItems(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
byId('next').addEventListener('click', () => { page += 1; void refreshItems(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
byId('delete').addEventListener('click', () => {
  if (confirm(t('deleteConfirm', { count: state.remaining }))) void command({ type: 'START_DELETE' });
});
byId('pause').addEventListener('click', () => void command({ type: 'PAUSE_DELETE' }));
byId('resume').addEventListener('click', () => void command({ type: 'RESUME_DELETE' }));
byId('stop').addEventListener('click', () => void command({ type: 'STOP_DELETE' }));
byId('retry').addEventListener('click', () => {
  if (confirm(t('retryConfirm', { count: state.remaining }))) void command({ type: 'RETRY_DELETE' });
});
byId('json').addEventListener('click', () => { void exportFile('json'); });
byId('csv').addEventListener('click', () => { void exportFile('csv'); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[STATE_KEY]?.newValue) renderState(changes[STATE_KEY].newValue as RunState);
  if (changes['repost-remover-preferences-v1']) void applyPreferences().then(() => renderState(state));
});
chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type !== 'ITEM_CHANGED') return;
  const index = items.findIndex(({ id }) => id === message.item.id);
  if (index >= 0) items[index] = message.item;
  renderItems();
});
void applyPreferences().then(async () => {
  const [savedState] = await Promise.all([readState(), refreshItems()]);
  renderState(savedState);
});
window.setInterval(() => renderTimer(), 1_000);
