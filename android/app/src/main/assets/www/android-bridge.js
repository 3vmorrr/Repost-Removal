(() => {
  const listeners = { overview: new Set(), session: new Set(), browserVisible: new Set() };
  const pending = new Map();
  let sequence = 0;

  function invoke(method, args = []) {
    return new Promise((resolve, reject) => {
      if (!window.RepostRemoverAndroid) {
        reject(new Error('Android bridge is unavailable.'));
        return;
      }
      const id = String(++sequence);
      pending.set(id, { resolve, reject });
      window.RepostRemoverAndroid.invoke(id, method, JSON.stringify(args));
    });
  }

  window.__androidBridgeResolve = (id, payload) => {
    const request = pending.get(String(id));
    if (!request) return;
    pending.delete(String(id));
    try {
      const result = JSON.parse(payload);
      if (result.ok) request.resolve(result.value);
      else request.reject(new Error(result.error || 'The operation failed.'));
    } catch (error) {
      request.reject(error);
    }
  };

  window.__androidNativeEvent = (event, payload) => {
    const callbacks = listeners[event];
    if (!callbacks) return;
    let value;
    try { value = JSON.parse(payload); } catch { return; }
    callbacks.forEach(callback => callback(value));
  };

  window.repostApp = {
    overview: () => invoke('overview'),
    setTheme: theme => invoke('setTheme', [theme]),
    setLanguage: language => invoke('setLanguage', [language]),
    socialLinks: {
      instagram: 'https://instagram.com/z.3morr',
      facebook: 'https://www.facebook.com/share/186DF9U1PM/?mibextid=wwXIfr',
      whatsapp: 'https://wa.me/+201026866840',
      linkedin: 'https://www.linkedin.com/in/omar-ebrahim-6a94903a2?utm_source=share_via%26utm_content=profile%26utm_medium=member_ios',
      youtube: 'https://www.youtube.com/@3vmorr',
      telegram: 'https://t.me/omarebrahim1'
    },
    openSocial: platform => invoke('openSocial', [platform]),
    openLogin: () => invoke('openLogin'),
    openBrowser: () => invoke('openBrowser'),
    hideBrowser: () => invoke('hideBrowser'),
    browserControl: action => invoke('browserControl', [action]),
    checkSession: () => invoke('checkSession'),
    logout: () => invoke('logout'),
    startScan: () => invoke('startScan'),
    stop: () => invoke('stop'),
    select: (id, selected) => invoke('select', [id, selected]),
    selectAll: selected => invoke('selectAll', [selected]),
    removeSelected: () => invoke('removeSelected'),
    onOverview: callback => { listeners.overview.add(callback); return () => listeners.overview.delete(callback); },
    onSession: callback => { listeners.session.add(callback); return () => listeners.session.delete(callback); },
    onBrowserVisible: callback => { listeners.browserVisible.add(callback); return () => listeners.browserVisible.delete(callback); }
  };
})();
