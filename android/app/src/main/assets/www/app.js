const app = window.repostApp;
const { t } = window.RepostI18n;
const $ = id => document.getElementById(id);
let data;
let page = 'home';
let search = '';
let browserVisible = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const tr = (key, values) => t(data?.language || 'en', key, values);

function applyLanguage() {
  const language = data?.language === 'ar' ? 'ar' : 'en';
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.title = t(language, 'app.title');
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(language, element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(element => { element.setAttribute('aria-label', t(language, element.dataset.i18nAria)); });
  document.querySelectorAll('[data-i18n-title]').forEach(element => { element.title = t(language, element.dataset.i18nTitle); });
  $('navigation').setAttribute('aria-label', t(language, 'nav.group'));
  $('mobile-navigation').setAttribute('aria-label', t(language, 'nav.group'));
  document.querySelectorAll('.nav-label-about').forEach(element => { element.textContent = t(language, 'nav.about'); });
  $('theme-toggle').title = t(language, 'header.theme');
  $('theme-toggle').setAttribute('aria-label', t(language, 'header.theme'));
}

function localizeError(message) {
  const text = String(message || '');
  if (/TikTok returned (\d+)/i.test(text)) return tr('error.http', { code: text.match(/TikTok returned (\d+)/i)[1] });
  if (/rate.?limit|too many|too frequent|slow down/i.test(text)) return tr('error.rate');
  if (/captcha|verify|security check|risk|restricted|unusual/i.test(text)) return tr('error.captcha');
  if (/session.*(expired|no longer available)|login expired/i.test(text)) return tr('error.sessionExpired');
  if (/account changed|does not match/i.test(text)) return tr('error.accountChanged');
  if (/pagination cursor|next cursor|repeated a cursor|omitted a next cursor/i.test(text)) return tr('error.cursor');
  if (/select at least one repost/i.test(text)) return tr('error.noItems');
  if (/sign in|signed-in|signed in|login/i.test(text)) return tr('error.noProfile');
  const safe = text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safe || safe.length > 160 || /(?:cookie|authorization|secUid|csrf|token)\s*[:=]|[?&](?:secUid|token|item_id)=/i.test(safe)) return tr('error.generic');
  return safe;
}

function showError(error) {
  const el = $('toast');
  el.textContent = localizeError(error?.message || error);
  el.classList.add('error');
  el.classList.remove('hidden');
  clearTimeout(showError.timer);
  showError.timer = setTimeout(() => el.classList.add('hidden'), 5000);
}

function notify(key, values = {}, error = false) {
  const el = $('toast');
  el.textContent = tr(key, values);
  el.classList.toggle('error', error);
  el.classList.remove('hidden');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => el.classList.add('hidden'), 4500);
}

async function call(fn, ...args) {
  try { return await fn(...args); }
  catch (error) { showError(error); throw error; }
}

function localizedState(value) {
  const state = String(value || 'Ready');
  let match;
  if (/^Ready$/i.test(state)) return tr('state.ready');
  if (/^Stopping safely(?: before logout)?…$/i.test(state)) return tr('state.stopping');
  if (/^Scanning reposts$/i.test(state)) return tr('state.scanning');
  if ((match = state.match(/^Scanning · page (\d+) · (\d+) found$/i))) return tr('state.scanPage', { page: match[1], count: match[2] });
  if (/^Scan complete$/i.test(state)) return tr('state.scanComplete');
  if (/^Scan stopped · partial results saved$/i.test(state)) return tr('state.scanPartial');
  if ((match = state.match(/^Scan stopped · (.+)$/i))) return tr('state.scanStopped', { detail: localizeError(match[1]) });
  if ((match = state.match(/^Removing selected · (\d+) \/ (\d+)$/i))) return tr('state.removing', { done: match[1], total: match[2] });
  if (/^Verifying completed removals$/i.test(state)) return tr('state.verifying');
  if ((match = state.match(/^Verifying completed removals · page (\d+) of at most (\d+)$/i))) return tr('state.verifyingPage', { page: match[1], total: match[2] });
  if ((match = state.match(/^Verification stopped · (.+)$/i))) return tr('state.verifyStopped', { detail: localizeError(match[1]) });
  if (/^Removal complete · verified against TikTok$/i.test(state)) return tr('state.removeComplete');
  if ((match = state.match(/^Removal incomplete · (\d+) still present$/i))) return tr('state.removePartial', { count: match[1] });
  if (/^Removal stopped · verification may be incomplete$/i.test(state)) return tr('state.removeStopped');
  if ((match = state.match(/^Stopped for account safety · (.+)$/i))) return tr('state.safetyStopped', { detail: localizeError(match[1]) });
  if ((match = state.match(/^Stopped · (.+)$/i))) return tr('state.stopped', { detail: localizeError(match[1]) });
  if (/Another operation is already running/i.test(state)) return tr('state.busy');
  return tr('state.ready');
}

function sessionLabel(session = data?.session) {
  if (session?.status === 'logged-in') return tr('home.sessionIn', { handle: escapeHtml(session.handle || '') });
  if (session?.status === 'logged-out') return tr('home.sessionOut');
  if (session?.status === 'checking') return tr('common.loading');
  return tr('home.sessionUnknown');
}

function applySessionChrome() {
  const session = data?.session || { status: 'unknown' };
  let key = 'header.browserUnknown';
  if (session.status === 'logged-in') key = 'header.browserIn';
  else if (session.status === 'logged-out') key = 'header.browserOut';
  else if (session.status === 'checking') key = 'common.loading';
  const pill = $('connection-pill');
  pill.classList.toggle('good', session.status === 'logged-in');
  pill.classList.toggle('muted', session.status !== 'logged-in');
  const accessibleStatus = session.status === 'logged-in' && session.handle
    ? `${tr(key)} · @${session.handle}`
    : tr(key);
  pill.setAttribute('aria-label', accessibleStatus);
  pill.title = accessibleStatus;
  pill.innerHTML = '<i aria-hidden="true"></i>';
  $('sidebar-status').textContent = session.status === 'logged-in' ? tr('header.browserIn') : session.status === 'logged-out' ? tr('header.browserOut') : tr('header.browserUnknown');
  $('sidebar-account').textContent = session.status === 'logged-in' && session.handle ? `@${session.handle}` : tr('privacy.detail');
}

async function refresh() {
  data = await app.overview();
  document.body.classList.toggle('dark', data.theme === 'dark');
  applyLanguage();
  applySessionChrome();
  $('nav-count').textContent = String(data.items.filter(item => item.status !== 'removed').length);
  render();
}

function heading() {
  const key = { home: 'nav.home', scan: 'nav.scan', review: 'nav.review', history: 'nav.history', developer: 'nav.developer', memorial: 'nav.memorial', settings: 'nav.settings' }[page] || 'nav.home';
  $('page-heading').textContent = page === 'memorial' ? 'صدقة جارية' : tr(key);
  document.querySelectorAll('.nav-item[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === page));
}

function intro(eyebrow, title, description, action = '', values = {}) {
  return `<div class="page-intro"><div><p class="eyebrow">${tr(eyebrow)}</p><h1>${tr(title)}</h1><p>${tr(description, values)}</p></div>${action}</div>`;
}

function metric(label, value, detail) {
  return `<div class="card metric"><div class="metric-label">${tr(label)}</div><div class="metric-value" dir="auto">${escapeHtml(value)}</div><div class="metric-foot">${tr(detail)}</div></div>`;
}

function statusCard() {
  const status = data.session?.status || 'unknown';
  const connected = status === 'logged-in';
  const action = connected
    ? `<button class="button button-outline small" data-action="logout">${tr('home.logout')}</button>`
    : '';
  const check = status === 'checking' ? '' : `<button class="button button-quiet small" data-action="check-session">${tr('home.check')}</button>`;
  return `<section class="card session-card"><div class="session-dot ${connected ? 'connected' : ''}" aria-hidden="true"></div><div class="session-copy"><strong>${tr('home.sessionTitle')}</strong><span>${sessionLabel()}</span><small>${tr('home.sessionHelp')}</small></div><div class="session-actions">${check}${action}</div></section>`;
}

function homePage() {
  const selected = data.items.filter(item => item.selected && item.status !== 'removed').length;
  const removed = data.items.filter(item => item.status === 'removed').length;
  const failed = data.items.filter(item => item.status === 'failed').length;
  const busy = ['running', 'verifying'].includes(data.progress?.phase);
  const scanAction = data.session?.status === 'logged-in'
    ? `<button class="button button-primary" data-action="scan-start" ${busy ? 'disabled' : ''}>${tr('home.scan')}</button>`
    : `<button class="button button-primary" data-action="login">${tr('home.login')}</button>`;
  return `${intro('home.eyebrow', 'home.title', 'home.description', scanAction)}
    ${statusCard()}${operationCard()}
    <div class="metrics">${metric('home.metricsFound', data.items.length, 'home.metricsLocal')}${metric('home.metricsSelected', selected, 'home.metricsReview')}${metric('home.metricsRemoved', removed, 'home.metricsVerified')}</div>
    <section class="card panel home-activity"><div class="panel-head"><h2>${tr('home.activity')}</h2><button class="text-button history-link" data-page="history">${tr('nav.history')} <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button></div>
      <div class="home-activity-grid"><div class="activity-row"><span class="activity-icon" aria-hidden="true">${data.items.length ? '▤' : '◷'}</span><div><strong>${tr(data.items.length ? 'home.latestScan' : 'home.activityEmpty')}</strong><small>${data.items.length ? tr('home.metricsFound') : tr('home.activityEmptyText')}</small></div><span class="right">${escapeHtml(localizedState(data.state))}</span></div>
      <div class="activity-row"><span class="activity-icon" aria-hidden="true">✓</span><div><strong>${tr('home.metricsRemoved')}</strong><small>${failed ? `${failed} · ${tr('review.status.failed')}` : tr('home.metricsVerified')}</small></div><button class="button button-outline small activity-review-button" data-page="review">${tr('nav.review')}</button></div></div></section>`;
}

function scanPage() {
  const connected = data.session?.status === 'logged-in';
  const busy = ['running', 'verifying'].includes(data.progress?.phase);
  const action = connected
    ? `<button class="button button-primary" data-action="scan-start" ${busy ? 'disabled' : ''}>${tr('scan.start')}</button>`
    : `<button class="button button-primary" data-action="login">${tr('scan.open')}</button>`;
  const stateText = localizedState(data.state);
  return `${intro('scan.eyebrow', 'scan.title', 'scan.description')}
    <section class="card scan-panel"><div class="scan-status-row"><span class="session-dot ${connected ? 'connected' : ''}" aria-hidden="true"></span><div><h2>${connected ? tr('scan.connected') : tr(data.session?.status === 'logged-out' ? 'scan.disconnected' : 'scan.unknown')}</h2><p>${tr('scan.progress')}</p></div><span class="scan-state">${escapeHtml(stateText)}</span></div><div class="scan-actions">${action}${connected ? `<button class="button button-outline" data-action="check-session">${tr('scan.check')}</button>` : ''}</div></section>${operationCard()}`;
}

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function operationCard() {
  const progress = data.progress;
  if (!progress || progress.kind === 'idle' || progress.phase === 'idle') return '';
  const scanning = progress.kind === 'scan';
  const verifying = progress.phase === 'verifying';
  const titleKey = scanning ? 'activity.scanTitle' : verifying ? 'activity.verifyTitle' : 'activity.removeTitle';
  const running = progress.phase === 'running' || verifying;
  const percent = verifying
    ? Math.min(100, Math.round(100 * progress.verificationPage / Math.max(1, progress.verificationTotal)))
    : scanning ? 0 : Math.min(100, Math.round(100 * progress.processed / Math.max(1, progress.total)));
  const elapsed = progress.startedAt ? (progress.finishedAt || Date.now()) - progress.startedAt : 0;
  const current = scanning
    ? tr('activity.pagesFound', { pages: progress.pagesScanned, count: progress.found })
    : verifying
      ? tr('activity.verifyPages', { page: progress.verificationPage, total: progress.verificationTotal })
      : tr('activity.removeCount', { done: progress.processed, total: progress.total });
  const stopButton = running ? `<button class="button button-outline small operation-stop" data-action="stop">${tr('activity.stop')}</button>` : '';
  const keepOpenHint = !scanning && !verifying && running
    ? `<aside class="operation-open-hint" role="note" aria-live="off"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5m0-8h.01"></path></svg><span>${tr('activity.keepOpen')}</span></aside>`
    : '';
  return `<section class="operation-card" aria-live="polite" aria-label="${tr('activity.title')}">
    <div class="operation-heading"><span class="operation-spinner ${running ? 'active' : ''}" aria-hidden="true"></span><div class="operation-copy"><strong>${tr(titleKey)}</strong><span>${escapeHtml(localizedState(data.state))}</span></div><time class="operation-time" dir="ltr">${formatDuration(elapsed)}</time>${stopButton}</div>
    <div class="operation-track" role="progressbar" aria-label="${tr('activity.title')}" aria-valuemin="0" aria-valuemax="100" ${scanning ? '' : `aria-valuenow="${percent}"`}><span class="operation-fill ${scanning && running ? 'indeterminate' : ''}" style="width:${scanning && running ? 34 : percent}%"></span></div>
    <div class="operation-stats"><span><b>${progress.found}</b>${tr('activity.found')}</span>${scanning ? `<span><b>${progress.pagesScanned}</b>${tr('activity.pages')}</span>` : `<span><b>${progress.processed}/${progress.total}</b>${tr('activity.processed')}</span><span><b>${progress.requested}</b>${tr('activity.requested')}</span><span><b>${progress.failed}</b>${tr('activity.failed')}</span>`}</div>
    <p class="operation-current">${current}</p>
    ${keepOpenHint}
  </section>`;
}

function repostRows(items) {
  return items.map(item => {
    const statusKey = `review.status.${item.status}`;
    const status = t(data.language, statusKey);
    const selected = item.selected && item.status !== 'removed';
    const handle = item.creator || tr('review.unknownCreator');
    return `<article class="card repost"><input class="check" type="checkbox" data-select="${escapeHtml(item.id)}" ${selected ? 'checked' : ''} ${item.status === 'removed' ? 'disabled' : ''} aria-label="${tr('review.selected', { handle: escapeHtml(handle) })}"><img src="${escapeHtml(item.thumbnail)}" alt="" onerror="this.style.visibility='hidden'"><div class="repost-copy"><h3><bdi dir="ltr">@${escapeHtml(handle)}</bdi> <small class="status-text">· ${escapeHtml(status)}</small></h3><p>${escapeHtml(item.description || '')}</p><small class="helper">${item.error ? localizeError(item.error) : ''}</small></div><a class="button button-outline small" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${tr('review.open')}</a></article>`;
  }).join('');
}

function reviewPage() {
  const items = data.items.filter(item => item.status !== 'removed' && (!search || `${item.creator} ${item.description} ${item.id}`.toLowerCase().includes(search.toLowerCase())));
  const selected = items.filter(item => item.selected && item.status !== 'removed').length;
  const removeText = tr('review.remove', { count: selected });
  const list = repostRows(items);
  const empty = `<div class="card empty-state"><div class="empty-icon" aria-hidden="true">▤</div><h2>${tr('review.emptyTitle')}</h2><p>${tr('review.emptyText')}</p><button class="button button-primary" data-page="scan">${tr('review.openScan')}</button></div>`;
  return `${intro('review.eyebrow', 'review.title', 'review.summary', `<button class="button button-danger" data-action="remove" ${selected ? '' : 'disabled'}>${removeText}</button>`, { items: items.length, selected })}
    <div class="card toolbar"><input id="search" class="field" type="search" placeholder="${tr('review.search') }" value="${escapeHtml(search)}" aria-label="${tr('review.searchLabel')}"><button class="button button-outline small" data-action="select-all">${tr('review.selectAll')}</button><button class="button button-outline small" data-action="select-none">${tr('review.selectNone')}</button><button class="button button-outline small" data-action="stop" ${['running', 'verifying'].includes(data.progress?.phase) ? '' : 'disabled'}>${tr('scan.stop')}</button></div>
    ${operationCard()}<p class="helper review-hint">${tr('review.requestHint')}</p><div class="list">${list || empty}</div>`;
}

function historyPage() {
  const items = data.items.filter(item => ['removed', 'failed', 'remaining'].includes(item.status));
  const list = repostRows(items);
  const empty = `<div class="card empty-state"><div class="empty-icon" aria-hidden="true">◷</div><h2>${tr('history.emptyTitle')}</h2><p>${tr('history.emptyText')}</p></div>`;
  return `${intro('history.eyebrow', 'history.title', 'history.description')}<div class="history-summary"><span>${tr('history.removed')}: <b>${items.filter(item => item.status === 'removed').length}</b></span><span>${tr('history.failed')}: <b>${items.filter(item => item.status === 'failed').length}</b></span><span>${tr('history.remaining')}: <b>${items.filter(item => item.status === 'remaining').length}</b></span></div><div class="list">${list || empty}</div>`;
}

function developerPage() {
  const links = [
    { platform: 'instagram', key: 'developer.instagram', action: 'developer.visit', color: 'instagram', icon: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle class="social-icon-dot" cx="17.6" cy="6.7" r="1"/>' },
    { platform: 'facebook', key: 'developer.facebook', action: 'developer.visit', color: 'facebook', icon: '<path class="social-icon-fill" d="M13.6 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6H17V3.1c-.8-.1-1.7-.2-2.7-.2-2.7 0-4.5 1.6-4.5 4.7v2H7v3.2h2.8V21z"/>' },
    { platform: 'whatsapp', key: 'developer.whatsapp', action: 'developer.contact', color: 'whatsapp', icon: '<path d="M20.1 11.7a8.1 8.1 0 0 1-12 7.1L4 20l1.2-4A8.1 8.1 0 1 1 20.1 11.7Z"/><path d="M9 8.1c.2-.4.4-.4.7-.4h.5l.8 1.9c.1.2.1.4-.1.6l-.6.7c.6 1.2 1.6 2.1 2.8 2.7l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.3.3.2.5-.2.8-.8 1.4-1.6 1.6-1 .2-2.4-.3-4-1.6-1.4-1.2-2.5-2.8-2.7-3.8-.2-1 .1-1.8.9-2.2Z"/>' },
    { platform: 'linkedin', key: 'developer.linkedin', action: 'developer.visit', color: 'linkedin', icon: '<path class="social-icon-fill" d="M5.2 8.7H2.1V19h3.1zM3.7 7.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM21 19h-3.1v-5c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6V19h-3V8.7h3v1.4h.1a3.3 3.3 0 0 1 3-1.7c3.2 0 3.8 2.1 3.8 4.8z"/>' },
    { platform: 'youtube', key: 'developer.youtube', action: 'developer.visit', color: 'youtube', icon: '<path class="social-icon-fill" d="M22 7.2a2.8 2.8 0 0 0-2-2C18.2 4.7 12 4.7 12 4.7s-6.2 0-8 .5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1.5 12a29 29 0 0 0 .5 4.8 2.8 2.8 0 0 0 2 2c1.8.5 8 .5 8 .5s6.2 0 8-.5a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .5-4.8 29 29 0 0 0-.5-4.8ZM10 15.5v-7l6 3.5z"/>' },
    { platform: 'telegram', key: 'developer.telegram', action: 'developer.contact', color: 'telegram', icon: '<path class="social-icon-fill" d="m21.5 4.2-3.2 15.1c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.7 12.9.8 11.4c-1-.3-1-1 .2-1.5L20.1 2.4c.9-.3 1.7.2 1.4 1.8Z"/>' }
  ];
  const cards = links.map(link => {
    const label = tr(link.key);
    return `<a class="social-link" href="${escapeHtml(app.socialLinks[link.platform])}" data-social="${link.platform}" aria-label="${tr('developer.openLabel', { platform: label })}" target="_blank" rel="noopener noreferrer"><span class="social-icon ${link.color}" aria-hidden="true"><svg viewBox="0 0 24 24">${link.icon}</svg></span><span class="social-link-copy"><strong>${label}</strong><small>${tr(link.action)}</small></span><span class="social-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg></span></a>`;
  }).join('');
  return `<div class="developer-page" lang="${data.language}" dir="${data.language === 'ar' ? 'rtl' : 'ltr'}"><section class="developer-profile"><img id="developer-photo" class="developer-photo" src="assets/developer-portrait.png" alt="${tr('developer.placeholder')}" hidden><div id="developer-photo-placeholder" class="developer-photo-placeholder" aria-hidden="true">ع</div><div class="developer-bio"><p class="eyebrow">${tr('developer.eyebrow')}</p><h1>${tr('developer.title')}</h1><p>${tr('developer.intro')}</p></div></section><section class="developer-links" aria-labelledby="developer-links-title"><h2 id="developer-links-title">${tr('developer.links')}</h2><div class="social-grid">${cards}</div></section></div>`;
}

function memorialPage() {
  return `<div class="memorial-page" lang="ar" dir="rtl"><section class="memorial-card" aria-labelledby="memorial-title"><p class="memorial-kicker">ذِكرٌ ودعاء</p><h1 id="memorial-title">صدقة جارية على أرواح موتانا</h1><p class="memorial-subtitle">اللهم اجعل هذا العمل خالصًا لوجهك الكريم، وانفع به، واجعله سببًا في الرحمة والمغفرة.</p><figure class="memorial-portrait-wrap"><div class="memorial-portrait-ring"><img id="memorial-photo" class="memorial-photo" src="assets/memorial-portrait.png" alt="صورة صديقنا الراحل" hidden><div id="memorial-photo-placeholder" class="memorial-photo-placeholder" role="img" aria-label="الصورة التذكارية"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28"/><path d="M32 47V18m0 13c-7-8-13-7-16-7m16 17c7-8 13-7 16-7"/></svg><span>الصورة التذكارية</span></div></div><figcaption>رحم الله موتانا وموتى المسلمين.</figcaption></figure><p class="memorial-prayer memorial-prayer-primary">اللهم اغفر له وارحمه، وعافه واعفُ عنه، وأكرم نزله، ووسّع مدخله، واغسله بالماء والثلج والبرد، ونقّه من الخطايا كما نقيت الثوب الأبيض من الدنس. اللهم آنس وحشته، ونوّر قبره، واجعل قبره روضةً من رياض الجنة، واجمعنا به في جنات النعيم.</p><p class="memorial-prayer memorial-prayer-general">اللهم اغفر لموتانا وموتى المسلمين، وارحمهم رحمةً واسعة، واجعل قبورهم نورًا وضياءً، واجمعنا بهم في الفردوس الأعلى.</p><p class="memorial-closing">نسألكم الدعاء لهم بالرحمة والمغفرة.</p></section></div>`;
}

function bindPortrait(id) {
  const image = $(id);
  const placeholder = $(`${id}-placeholder`);
  const showImage = () => { image.hidden = false; placeholder.hidden = true; };
  const showPlaceholder = () => { image.hidden = true; placeholder.hidden = false; };
  image.addEventListener('load', showImage, { once: true });
  image.addEventListener('error', showPlaceholder, { once: true });
  if (image.complete) image.naturalWidth ? showImage() : showPlaceholder();
}

function settingsPage() {
  const session = data.session?.status === 'logged-in';
  const sessionAction = session ? `<button class="button button-outline small" data-action="logout">${tr('home.logout')}</button>` : `<button class="button button-primary small" data-action="login">${tr('home.login')}</button>`;
  const handle = session && data.session.handle ? `<bdi dir="ltr">@${escapeHtml(data.session.handle)}</bdi>` : tr(data.session?.status === 'logged-out' ? 'settings.statusOut' : 'settings.statusUnknown');
  return `${intro('settings.eyebrow', 'settings.title', 'settings.description')}
    <section class="settings-group"><div class="settings-group-heading"><h2>${tr('settings.appearance')}</h2><p>${tr('settings.appearanceHelp')}</p></div><div class="settings-row"><div><strong>${tr('settings.language')}</strong><p>${tr('settings.languageHelp')}</p></div><select id="language-select" aria-label="${tr('settings.language')}"><option value="en" ${data.language === 'en' ? 'selected' : ''}>${tr('settings.english')}</option><option value="ar" ${data.language === 'ar' ? 'selected' : ''}>${tr('settings.arabic')}</option></select></div><div class="settings-row"><div><strong>${tr('settings.theme')}</strong><p>${tr('settings.themeHelp')}</p></div><select id="theme-select" aria-label="${tr('settings.theme')}"><option value="light" ${data.theme === 'light' ? 'selected' : ''}>${tr('settings.light')}</option><option value="dark" ${data.theme === 'dark' ? 'selected' : ''}>${tr('settings.dark')}</option></select></div></section>
    <section class="settings-group"><div class="settings-group-heading"><h2>${tr('settings.session')}</h2><p>${tr('settings.sessionHelp')}</p></div><div class="settings-row"><div><strong>${tr('common.status')}</strong><p>${handle}</p></div><div class="settings-actions">${session ? `<button class="button button-quiet small" data-action="check-session">${tr('home.check')}</button>` : ''}${sessionAction}</div></div></section>
    <section class="settings-group application-group"><div class="settings-group-heading"><h2>${tr('settings.application')}</h2></div><div class="settings-row"><div><strong>${tr('settings.version')}</strong><p>${tr('app.title')}</p></div><bdi class="version-number" dir="ltr">${escapeHtml(data.version)}</bdi></div><div class="settings-row"><div><strong>${tr('settings.about')}</strong><p>${tr('developer.role')}</p></div><button class="button button-outline small" data-page="developer">${tr('settings.openAbout')}</button></div><div class="settings-row"><div><strong>${tr('nav.memorial')}</strong><p>صدقة جارية</p></div><button class="button button-outline small" data-page="memorial">${tr('settings.openAbout')}</button></div></section>`;
}

function render() {
  if (!data) return;
  applyLanguage();
  heading();
  $('browser-toolbar').classList.toggle('hidden', page !== 'scan' || !browserVisible);
  document.body.classList.toggle('browser-open', page === 'scan' && browserVisible);
  const scanBusy = ['running', 'verifying'].includes(data.progress?.phase);
  $('browser-scan').disabled = data.session?.status !== 'logged-in' || scanBusy;
  $('browser-scan').setAttribute('aria-disabled', String(data.session?.status !== 'logged-in' || scanBusy));
  const pageRenderers = { home: homePage, scan: scanPage, review: reviewPage, history: historyPage, developer: developerPage, memorial: memorialPage, settings: settingsPage };
  $('content').innerHTML = (pageRenderers[page] || homePage)();
  if (page === 'developer') bindPortrait('developer-photo');
  if (page === 'memorial') bindPortrait('memorial-photo');
}

async function confirm(titleKey, textKey, values = {}) {
  $('dialog-title').textContent = tr(titleKey);
  $('dialog-text').textContent = tr(textKey, values);
  const dialog = $('confirm-dialog');
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
}

async function goToScan(openBrowser = true) {
  page = 'scan';
  search = '';
  if (openBrowser) await call(app.openBrowser);
  await refresh();
}

async function checkSession() {
  if (page !== 'scan') await goToScan(true);
  const session = await call(app.checkSession);
  data.session = session;
  applySessionChrome();
  render();
  if (page === 'scan' && browserVisible) return;
  if (session.status === 'logged-in') notify('toast.loggedIn');
  else if (session.status === 'logged-out') notify('scan.disconnected', {}, true);
  else notify('toast.sessionUnknown', {}, true);
}

async function logout() {
  if (!await confirm('confirm.logoutTitle', 'confirm.logoutText')) return;
  const session = await call(app.logout);
  data.session = session;
  if (browserVisible) await call(app.hideBrowser);
  browserVisible = false;
  page = 'home';
  await refresh();
  if (session.status === 'logged-out') notify('toast.loggedOut');
  else notify('error.loggedOut', {}, true);
}

async function startScan() {
  if (data.session?.status !== 'logged-in') {
    notify('toast.loginFirst', {}, true);
    await goToScan(true);
    return;
  }
  await call(app.startScan);
  notify('toast.scanStarted');
  await refresh();
}

async function handleClick(event) {
  const social = event.target.closest('a[data-social]');
  if (social) {
    event.preventDefault();
    await call(app.openSocial, social.dataset.social);
    return;
  }
  const target = event.target.closest('[data-page],[data-action],[data-browser],[data-select]');
  if (!target) return;
  if (target.dataset.page) {
    page = target.dataset.page;
    search = '';
    window.scrollTo(0, 0);
    if (page === 'scan') {
      await call(app.openBrowser);
      browserVisible = true;
    } else if (browserVisible) {
      await call(app.hideBrowser);
      browserVisible = false;
    }
    await refresh();
    return;
  }
  if (target.dataset.browser) { await call(app.browserControl, target.dataset.browser); return; }
  const action = target.dataset.action;
  if (action === 'login') { await goToScan(true); return; }
  if (action === 'scan-page') { await goToScan(true); return; }
  if (action === 'check-session') { await checkSession(); return; }
  if (action === 'logout') { await logout(); return; }
  if (action === 'scan-start') { await startScan(); return; }
  if (action === 'select-all') { await call(app.selectAll, true); await refresh(); return; }
  if (action === 'select-none') { await call(app.selectAll, false); await refresh(); return; }
  if (action === 'stop') { await call(app.stop); notify('toast.scanStopped'); return; }
  if (action === 'remove') {
    const count = data.items.filter(item => item.selected && item.status !== 'removed').length;
    if (count && await confirm('confirm.removeTitle', 'confirm.removeText', { count })) {
      await call(app.removeSelected);
      notify('toast.removeStarted');
      await refresh();
    }
  }
}

document.addEventListener('click', event => { void handleClick(event).catch(() => {}); });
document.addEventListener('change', async event => {
  const target = event.target;
  try {
    if (target.matches('[data-select]')) { await app.select(target.dataset.select, target.checked); await refresh(); }
    else if (target.id === 'theme-select') { data = await app.setTheme(target.value); await refresh(); }
    else if (target.id === 'language-select') { data = await app.setLanguage(target.value); await refresh(); }
  } catch (error) { showError(error); }
});
document.addEventListener('input', event => { if (event.target.id === 'search') { search = event.target.value; render(); const input = $('search'); input?.focus(); input?.setSelectionRange(search.length, search.length); } });

$('theme-toggle').addEventListener('click', async () => {
  try { data = await app.setTheme(data.theme === 'dark' ? 'light' : 'dark'); await refresh(); }
  catch (error) { showError(error); }
});
$('browser-check').addEventListener('click', () => { void checkSession().catch(() => {}); });
$('browser-scan').addEventListener('click', () => { void startScan().catch(() => {}); });
$('browser-close').addEventListener('click', async () => {
  try { await app.hideBrowser(); browserVisible = false; await refresh(); }
  catch (error) { showError(error); }
});
app.onOverview(value => { data = value; browserVisible = value.browserVisible; document.body.classList.toggle('dark', data.theme === 'dark'); applySessionChrome(); render(); });
app.onSession(value => { if (data) { data.session = value; applySessionChrome(); render(); } });
app.onBrowserVisible(visible => { browserVisible = visible; if (data) render(); });
window.setInterval(() => {
  const progress = data?.progress;
  const clock = document.querySelector('.operation-time');
  if (progress?.startedAt && clock) clock.textContent = formatDuration((progress.finishedAt || Date.now()) - progress.startedAt);
}, 1000);
void refresh().catch(showError);
