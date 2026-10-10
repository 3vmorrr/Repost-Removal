import { app, BrowserWindow, ipcMain, WebContentsView, nativeTheme, session, shell } from 'electron';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { socialLinkFor } from './social-links';
import { classifyTikTokSession, type SessionSnapshot } from './session-state';
import type { OperationProgress, Overview, Repost } from './shared';

const dataDir = join(app.getPath('appData'), 'Repost Remover');
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(join(dataDir, 'repost-remover.sqlite'));
db.exec('PRAGMA journal_mode = WAL;');
function transaction<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: Parameters<T>) => { db.exec('BEGIN IMMEDIATE'); try { const result = fn(...args); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } }) as T;
}
db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reposts (id TEXT PRIMARY KEY, creator TEXT NOT NULL, description TEXT NOT NULL, thumbnail TEXT NOT NULL, url TEXT NOT NULL, selected INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', error TEXT NOT NULL DEFAULT '', scan_page INTEGER NOT NULL DEFAULT 1);
`);

function getSetting<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key) as { value: string } | undefined;
  return row ? JSON.parse(row.value) as T : fallback;
}
function setSetting(key: string, value: unknown): void { db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value)); }
let browserWindow: BrowserWindow; let tiktokView: WebContentsView | null = null; let browserMounted = false;
let flow = 'Ready'; let stopRequested = false; let worker: Promise<void> | null = null;
let sessionSnapshot: SessionSnapshot = { status: 'unknown', handle: null, stableId: null };
let sessionProbeTimer: NodeJS.Timeout | null = null;
function idleActivity(): OperationProgress { return { kind: 'idle', phase: 'idle', pagesScanned: 0, found: 0, processed: 0, total: 0, requested: 0, failed: 0, verificationPage: 0, verificationTotal: 0, startedAt: null, finishedAt: null }; }
let activity: OperationProgress = idleActivity();
function selectedTheme(): 'light' | 'dark' { return getSetting<string>('theme', 'light') === 'dark' ? 'dark' : 'light'; }
function selectedLanguage(): 'en' | 'ar' { return getSetting<string>('language', 'en') === 'ar' ? 'ar' : 'en'; }
function overview(): Overview {
  const items = db.prepare('SELECT * FROM reposts ORDER BY rowid DESC').all().map((r: any) => ({ ...r, selected: Boolean(r.selected) })) as Repost[];
  return { items, state: flow, progress: { ...activity }, theme: selectedTheme(), language: selectedLanguage(), session: sessionSnapshot, browserVisible: browserMounted, version: app.getVersion() };
}
function publishOverview(): void { if (browserWindow?.webContents && !browserWindow.webContents.isDestroyed()) browserWindow.webContents.send('overview:changed', overview()); }

function createWindow(): void {
  browserWindow = new BrowserWindow({ width: 1380, height: 900, minWidth: 900, minHeight: 640, backgroundColor: '#f5f3ed', title: 'Repost Remover', webPreferences: { preload: join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  browserWindow.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('https://www.tiktok.com/')) { openBrowser(); void tiktokView?.webContents.loadURL(url); } return { action: 'deny' }; });
  browserWindow.loadFile(join(__dirname, 'renderer', 'index.html'));
  browserWindow.on('resize', layoutBrowser);
  browserWindow.on('closed', () => { if (tiktokView) { tiktokView.webContents.close(); tiktokView = null; } });
}
function isTikTokUrl(value:string):boolean{try{const url=new URL(value);return url.protocol==='https:'&&(url.hostname==='tiktok.com'||url.hostname.endsWith('.tiktok.com'));}catch{return false;}}
function layoutBrowser(): void {
  if (!tiktokView || !browserWindow) return;
  const [width,height] = browserWindow.getContentSize();
  const left = selectedLanguage() === 'ar' ? 24 : 250;
  tiktokView.setBounds({ x: left, y: 112, width: Math.max(600,width-274), height: Math.max(400,height-132) });
}
function publishSession(snapshot: SessionSnapshot): SessionSnapshot {
  sessionSnapshot = snapshot;
  if (browserWindow?.webContents && !browserWindow.webContents.isDestroyed()) {
    browserWindow.webContents.send('session:changed', snapshot);
    browserWindow.webContents.send('overview:changed', overview());
  }
  return snapshot;
}

async function syncTikTokSession(): Promise<SessionSnapshot> {
  if (!tiktokView || !isTikTokUrl(tiktokView.webContents.getURL())) return publishSession({ status: 'unknown', handle: null, stableId: null });
  if (tiktokView.webContents.isLoading()) return publishSession({ status: 'checking', handle: null, stableId: null });
  try { return publishSession(classifyTikTokSession(await executeOnTikTok<any>(pageIdentity))); }
  catch { return publishSession({ status: 'unknown', handle: null, stableId: null }); }
}

function openBrowser(): void {
  if (tiktokView) { if (!browserMounted) { browserWindow.contentView.addChildView(tiktokView); browserMounted = true; } layoutBrowser(); browserWindow.webContents.send('browser:visible', true); void syncTikTokSession(); return; }
  const profile = sessionForBrowser();
  tiktokView = new WebContentsView({ webPreferences: { session: profile, contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
  tiktokView.webContents.setWindowOpenHandler(({ url }) => { if (isTikTokUrl(url)) void tiktokView?.webContents.loadURL(url); return { action: 'deny' }; });
  tiktokView.webContents.on('will-navigate', (event, url) => { if (!isTikTokUrl(url)) event.preventDefault(); });
  tiktokView.webContents.on('did-finish-load', () => { void syncTikTokSession(); });
  tiktokView.webContents.on('did-navigate-in-page', () => { void syncTikTokSession(); });
  tiktokView.webContents.on('did-fail-load', (_event, _code, _description, _validatedURL, isMainFrame) => { if (isMainFrame) publishSession({ status: 'unknown', handle: null, stableId: null }); });
  browserWindow.contentView.addChildView(tiktokView); browserMounted = true; layoutBrowser();
  publishSession({ status: 'checking', handle: null, stableId: null });
  void tiktokView.webContents.loadURL('https://www.tiktok.com/').catch(() => publishSession({ status: 'unknown', handle: null, stableId: null }));
  sessionProbeTimer = setInterval(() => { if (tiktokView && !tiktokView.webContents.isLoading()) void syncTikTokSession(); }, 12000);
  sessionProbeTimer.unref();
  browserWindow.webContents.send('browser:visible', true);
}
function sessionForBrowser() {
  // Import lazily so the browser partition remains a dedicated persistent profile.
  const profile=session.fromPartition('persist:tiktok-profile');
  profile.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  profile.setPermissionCheckHandler(()=>false);
  return profile;
}
function executeOnTikTok<T>(source: string): Promise<T> {
  if (!tiktokView || !tiktokView.webContents.getURL().startsWith('https://www.tiktok.com/')) throw new Error('Open TikTok and sign in first.');
  return tiktokView.webContents.executeJavaScript(source, true) as Promise<T>;
}
const pageIdentity = `(() => { const d=window.__$UNIVERSAL_DATA$__?.__DEFAULT_SCOPE__?.['webapp.app-context']; const path=location.pathname; const loginRoute=new RegExp('(?:^|/)(?:login|signup)(?:/|$)','i').test(path); const loginButton=document.querySelector('[data-e2e="top-login-button"], [data-e2e="login-button"]'); return { secUid:d?.user?.secUid ?? null, handle:d?.user?.uniqueId ?? null, loggedOutSignal:loginRoute||Boolean(loginButton) }; })()`;

async function scan(): Promise<void> {
  stopRequested = false;
  const identity = classifyTikTokSession(await executeOnTikTok<any>(pageIdentity));
  if (identity.status !== 'logged-in' || !identity.stableId) throw new Error('Could not confirm a signed-in TikTok profile. Sign in and retry.');
  publishSession(identity);
  flow = 'Scanning reposts'; db.prepare('DELETE FROM reposts').run();
  activity = { kind: 'scan', phase: 'running', pagesScanned: 0, found: 0, processed: 0, total: 0, requested: 0, failed: 0, verificationPage: 0, verificationTotal: 0, startedAt: Date.now(), finishedAt: null };
  publishOverview();
  let cursor = '0'; const visited = new Set<string>(); let page = 0;
  try {
    while (!stopRequested) {
      if (visited.has(cursor)) throw new Error('TikTok repeated a pagination cursor. Partial results remain available.'); visited.add(cursor); page++;
      const response = await executeOnTikTok<any>(`(async()=>{const secUid=window.__$UNIVERSAL_DATA$__?.__DEFAULT_SCOPE__?.['webapp.app-context']?.user?.secUid;if(!secUid)throw Error('TikTok login is no longer available.');const p=new URLSearchParams({aid:'1988',count:'30',coverFormat:'2',cursor:${JSON.stringify(cursor)},needPinnedItemIds:'true',post_item_list_request_type:'0',secUid});const r=await fetch('/api/repost/item_list/?'+p,{credentials:'include'});if([401,403,429].includes(r.status))throw Error('TikTok returned '+r.status+'. Stopped for account safety.');if(!r.ok)throw Error('TikTok listing failed ('+r.status+').');const j=await r.json();if(j.status_code!==0)throw Error(j.status_msg||'TikTok could not list reposts.');return {items:(j.itemList||[]).filter(x=>x.id&&x.author?.uniqueId).map(x=>({id:String(x.id),creator:x.author.uniqueId,description:x.desc||'',thumbnail:x.video?.cover||x.video?.originCover||'',url:'https://www.tiktok.com/@'+x.author.uniqueId+'/video/'+x.id})),hasMore:!!j.hasMore,cursor:String(j.cursor??${JSON.stringify(cursor)})}})()`);
      const insert = db.prepare("INSERT OR IGNORE INTO reposts(id,creator,description,thumbnail,url,scan_page) VALUES(@id,@creator,@description,@thumbnail,@url,@scan_page)"); const tx=transaction((rows:any[])=>rows.forEach(r=>insert.run({...r,scan_page:page}))); tx(response.items);
      const found = Number((db.prepare('SELECT COUNT(*) n FROM reposts').get() as { n: number }).n);
      activity.pagesScanned = page; activity.found = found;
      flow = `Scanning · page ${page} · ${found} found`; publishOverview();
      if (!response.hasMore || stopRequested) break; if (response.cursor === cursor) throw new Error('TikTok did not provide a next cursor.'); cursor=response.cursor;
      await delay(4500);
    }
    flow = stopRequested ? 'Scan stopped · partial results saved' : 'Scan complete';
    activity.phase = stopRequested ? 'stopped' : 'complete'; activity.finishedAt = Date.now();
  } catch (error) { flow = `Scan stopped · ${messageOf(error)}`; activity.phase = 'error'; activity.finishedAt = Date.now(); throw error; }
  finally { publishOverview(); }
}
function messageOf(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function delay(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
async function removeSelected(): Promise<void> {
  stopRequested = false;
  const identity = classifyTikTokSession(await executeOnTikTok<any>(pageIdentity));
  if (identity.status !== 'logged-in' || !identity.stableId) throw new Error('Could not confirm a signed-in TikTok profile. Sign in and retry.');
  publishSession(identity);
  const queue = db.prepare("SELECT * FROM reposts WHERE selected=1 AND status IN ('pending','failed','remaining') ORDER BY rowid").all() as unknown as Repost[];
  if (!queue.length) throw new Error('Select at least one repost that has not been removed.');
  flow=`Removing selected · 0 / ${queue.length}`;
  activity = { kind: 'remove', phase: 'running', pagesScanned: activity.pagesScanned, found: activity.found, processed: 0, total: queue.length, requested: 0, failed: 0, verificationPage: 0, verificationTotal: 0, startedAt: Date.now(), finishedAt: null };
  publishOverview();
  const attempted:string[]=[];
  for (let i=0;i<queue.length && !stopRequested;i++) {
    const currentIdentity=classifyTikTokSession(await executeOnTikTok<any>(pageIdentity));
    if(currentIdentity.status!=='logged-in'||currentIdentity.stableId!==identity.stableId){flow='Stopped · the signed-in TikTok account changed';break;}
    const item=queue[i]; db.prepare("UPDATE reposts SET status='removing',error='' WHERE id=?").run(item.id);
    flow=`Removing selected · ${i+1} / ${queue.length}`; publishOverview();
    try {
      const result=await executeOnTikTok<any>(`(async()=>{const p=new URLSearchParams({aid:'1988',item_id:${JSON.stringify(item.id)}});const r=await fetch('/tiktok/v1/upvote/delete?'+p,{method:'POST',credentials:'include',headers:{'content-type':'application/x-www-form-urlencoded'},body:''});if([401,403,429].includes(r.status))throw Error('TikTok returned '+r.status+'. Stopped for account safety.');if(!r.ok)throw Error('TikTok removal failed ('+r.status+').');const j=await r.json();if(j.status_code!==0)throw Error(j.status_msg||'TikTok could not remove this repost.');return true})()`);
      if (!result) throw new Error('TikTok did not confirm the removal.');
      attempted.push(item.id);
      activity.requested += 1;
    } catch (error) {
      const reason=messageOf(error); db.prepare("UPDATE reposts SET status='failed',error=? WHERE id=?").run(reason,item.id);
      activity.failed += 1;
      if (/captcha|verify|too many|too frequent|rate.?limit|risk|restricted|unusual|slow down|401|403|429/i.test(reason)) { flow=`Stopped for account safety · ${reason}`; break; }
    }
    activity.processed = i + 1; flow=`Removing selected · ${i+1} / ${queue.length}`; publishOverview();
    if (i+1<queue.length && !stopRequested) await delay(1800);
  }
  if (attempted.length && !stopRequested) {
    try { await verifyRemovalResults(attempted,identity.stableId); }
    catch (error) {
      const reason=messageOf(error);
      for (const id of attempted) db.prepare("UPDATE reposts SET status='remaining',error=? WHERE id=?").run(`Removal requested; final verification could not complete: ${reason}`,id);
      flow=`Verification stopped · ${reason}`; activity.phase = 'error';
    }
  }
  if (stopRequested) {
    for (const id of attempted) db.prepare("UPDATE reposts SET status='remaining',error='Removal was requested; final verification was stopped.' WHERE id=?").run(id);
    flow='Removal stopped · verification may be incomplete'; activity.phase = 'stopped';
  } else if (flow.startsWith('Removing selected')) {
    flow='Removal complete · verified against TikTok'; activity.phase = 'complete';
  }
  if (activity.phase === 'running') activity.phase = flow.startsWith('Stopped') ? 'stopped' : 'error';
  activity.finishedAt = Date.now(); publishOverview();
}

async function verifyRemovalResults(ids:string[],expectedSecUid:string):Promise<void>{
  flow='Verifying completed removals'; activity.phase = 'verifying'; publishOverview();
  const identity=await executeOnTikTok<any>(pageIdentity);if(identity?.secUid!==expectedSecUid)throw new Error('The signed-in TikTok account changed before final verification.');
  let lastPage=0;
  for(let offset=0;offset<ids.length;offset+=500){const group=ids.slice(offset,offset+500);const placeholders=group.map(()=>'?').join(',');const row=db.prepare(`SELECT MAX(scan_page) AS page FROM reposts WHERE id IN (${placeholders})`).get(...group) as {page:number|null};lastPage=Math.max(lastPage,row.page??0);}
  const limit=Math.max(1,lastPage); activity.verificationTotal = limit; activity.verificationPage = 0; publishOverview();
  let cursor='0';const visited=new Set<string>();const present=new Set<string>();
  for(let page=1;page<=limit;page++){
    if(stopRequested){flow='Verification stopped · results remain available';return;}
    if(visited.has(cursor))throw new Error('TikTok repeated a cursor during verification.');visited.add(cursor);
    const result=await executeOnTikTok<any>(`(async()=>{const secUid=window.__$UNIVERSAL_DATA$__?.__DEFAULT_SCOPE__?.['webapp.app-context']?.user?.secUid;if(!secUid)throw Error('TikTok login expired during verification.');const p=new URLSearchParams({aid:'1988',count:'30',coverFormat:'2',cursor:${JSON.stringify(cursor)},needPinnedItemIds:'true',post_item_list_request_type:'0',secUid});const r=await fetch('/api/repost/item_list/?'+p,{credentials:'include'});if([401,403,429].includes(r.status))throw Error('TikTok returned '+r.status+' during verification. Stopped for account safety.');if(!r.ok)throw Error('TikTok verification failed ('+r.status+').');const j=await r.json();if(j.status_code!==0)throw Error(j.status_msg||'TikTok could not verify the repost list.');return {ids:(j.itemList||[]).map(x=>String(x.id)),hasMore:!!j.hasMore,cursor:String(j.cursor??${JSON.stringify(cursor)})}})()`);
    result.ids.forEach((id:string)=>present.add(id));activity.verificationPage = page;flow=`Verifying completed removals · page ${page} of at most ${limit}`;publishOverview();
    if(!result.hasMore||page>=limit)break;if(result.cursor===cursor)throw new Error('TikTok omitted a next cursor during verification.');cursor=result.cursor;await delay(4500);
  }
  transaction(()=>{for(const id of ids){if(present.has(id))db.prepare("UPDATE reposts SET status='remaining',error='Still present after TikTok listing verification.' WHERE id=?").run(id);else db.prepare("UPDATE reposts SET status='removed',error='' WHERE id=?").run(id);}})();
  publishOverview();
}

function registerIpc(): void {
  const handle=(channel:string, fn:(...args:any[])=>unknown|Promise<unknown>)=>ipcMain.handle(channel,(event,...args)=>{ if(event.sender!==browserWindow.webContents) throw new Error('Untrusted IPC sender.'); return fn(...args); });
  handle('app:overview',()=>overview());
  handle('app:set-theme',(theme)=>{ if(!['light','dark'].includes(theme)) throw new Error('Invalid theme.'); setSetting('theme',theme); nativeTheme.themeSource=theme; return overview(); });
  handle('app:set-language',(language)=>{ if(!['en','ar'].includes(language)) throw new Error('Invalid language.'); setSetting('language',language); layoutBrowser(); return overview(); });
  handle('social:open',(platform)=>shell.openExternal(socialLinkFor(platform)));
  handle('browser:open',()=>{openBrowser();return true;});
  handle('browser:hide',()=>{if(tiktokView&&browserMounted){browserWindow.contentView.removeChildView(tiktokView);browserMounted=false;browserWindow.webContents.send('browser:visible',false);browserWindow.webContents.send('overview:changed',overview());}return true;});
  handle('browser:control',async(action)=>{if(!tiktokView)throw new Error('TikTok browser is not open.'); if(action==='back'&&tiktokView.webContents.navigationHistory.canGoBack())tiktokView.webContents.navigationHistory.goBack(); else if(action==='reload')tiktokView.webContents.reload(); else if(action==='home') await tiktokView.webContents.loadURL('https://www.tiktok.com/');return true;});
  handle('session:check',async()=>{
    if(!tiktokView)openBrowser();
    const view=tiktokView!;
    if(view.webContents.isLoading()) await new Promise<void>(resolve=>{ const timer=setTimeout(resolve,12000); view.webContents.once('did-stop-loading',()=>{clearTimeout(timer);resolve();}); });
    return syncTikTokSession();
  });
  handle('session:logout',async()=>{
    if(worker){stopRequested=true;flow='Stopping safely before logout…';publishOverview();await worker;}
    if(!tiktokView)openBrowser();
    const view=tiktokView!; const profile=sessionForBrowser();
    publishSession({status:'checking',handle:null,stableId:null});
    db.exec('PRAGMA secure_delete=ON; DELETE FROM reposts; PRAGMA wal_checkpoint(TRUNCATE); VACUUM;');
    activity=idleActivity();flow='Ready';publishOverview();
    try { await view.webContents.loadURL('https://www.tiktok.com/logout'); } catch { /* The targeted cookie clear below still completes logout locally. */ }
    await profile.clearStorageData();
    await profile.clearCache();
    await profile.clearAuthCache();
    try { await view.webContents.loadURL('https://www.tiktok.com/'); } catch { return publishSession({status:'unknown',handle:null,stableId:null}); }
    const result=await syncTikTokSession();
    if(result.status==='logged-in')throw new Error('TikTok login was cleared, but the signed-out state could not be confirmed.');
    return result;
  });
  handle('scan:start',()=>{if(worker)throw new Error('Another operation is already running.');worker=scan().catch(error=>{flow=`Scan stopped · ${messageOf(error)}`;browserWindow.webContents.send('overview:changed',overview());}).finally(()=>worker=null);return true;});
  handle('operation:stop',()=>{if(!worker)return false;stopRequested=true;flow='Stopping safely…';publishOverview();return true;});
  handle('repost:select',({id,selected})=>{db.prepare('UPDATE reposts SET selected=? WHERE id=?').run(Number(Boolean(selected)),String(id));return overview();});
  handle('repost:select-all',({selected})=>{db.prepare("UPDATE reposts SET selected=? WHERE status!='removed'").run(Number(Boolean(selected)));return overview();});
  handle('removal:start',()=>{if(worker)throw new Error('Another operation is already running.');worker=removeSelected().catch(e=>{flow=`Stopped · ${messageOf(e)}`;browserWindow.webContents.send('overview:changed',overview());}).finally(()=>worker=null);return true;});
}

app.whenReady().then(()=>{nativeTheme.themeSource=selectedTheme();createWindow();registerIpc();});
app.on('window-all-closed',()=>{if(sessionProbeTimer)clearInterval(sessionProbeTimer);if(tiktokView){tiktokView.webContents.close();tiktokView=null;}db.close();if(process.platform!=='darwin')app.quit();});
