import { contextBridge, ipcRenderer } from 'electron';
import { SOCIAL_LINKS } from './social-links';

const invoke = (channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload);
const subscribe = <T>(channel: string, callback: (value: T) => void) => {
  const listener = (_event: unknown, value: T) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('repostApp', {
  overview: () => invoke('app:overview'),
  setTheme: (theme: 'light' | 'dark') => invoke('app:set-theme', theme),
  setLanguage: (language: 'en' | 'ar') => invoke('app:set-language', language),
  socialLinks: SOCIAL_LINKS,
  openSocial: (platform: string) => invoke('social:open', platform),
  openBrowser: () => invoke('browser:open'),
  hideBrowser: () => invoke('browser:hide'),
  browserControl: (action: 'back' | 'home' | 'reload') => invoke('browser:control', action),
  checkSession: () => invoke('session:check'),
  logout: () => invoke('session:logout'),
  startScan: () => invoke('scan:start'),
  stop: () => invoke('operation:stop'),
  select: (id: string, selected: boolean) => invoke('repost:select', { id, selected }),
  selectAll: (selected: boolean) => invoke('repost:select-all', { selected }),
  removeSelected: () => invoke('removal:start'),
  onOverview: (callback: (value: any) => void) => subscribe('overview:changed', callback),
  onSession: (callback: (value: any) => void) => subscribe('session:changed', callback),
  onBrowserVisible: (callback: (visible: boolean) => void) => subscribe('browser:visible', callback)
});
