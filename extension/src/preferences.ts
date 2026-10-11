export type ThemePreference = 'system' | 'light' | 'dark';
export type LocalePreference = 'en' | 'ar';
export type OperatingMode = 'local' | 'telegram';
export interface Preferences { theme: ThemePreference; locale: LocalePreference; operatingMode: OperatingMode }
export const PREFERENCES_KEY = 'repost-remover-preferences-v1';
export const DEFAULT_PREFERENCES: Preferences = { theme: 'system', locale: 'en', operatingMode: 'local' };

export async function getPreferences(): Promise<Preferences> {
  const stored = await chrome.storage.local.get([PREFERENCES_KEY, 'repost-remover-cloud-bridge-v1']);
  const value = stored[PREFERENCES_KEY] as Partial<Preferences> | undefined;
  const bridge = stored['repost-remover-cloud-bridge-v1'] as { token?: string } | undefined;
  const theme = value?.theme;
  const locale = value?.locale;
  const operatingMode = value?.operatingMode;
  return {
    theme: theme === 'system' || theme === 'light' || theme === 'dark' ? theme : DEFAULT_PREFERENCES.theme,
    locale: locale === 'en' || locale === 'ar' ? locale : DEFAULT_PREFERENCES.locale,
    operatingMode: operatingMode === 'telegram' || operatingMode === 'local'
      ? operatingMode
      : bridge?.token ? 'telegram' : DEFAULT_PREFERENCES.operatingMode
  };
}

export async function savePreferences(patch: Partial<Preferences>): Promise<Preferences> {
  const preferences = { ...await getPreferences(), ...patch };
  await chrome.storage.local.set({ [PREFERENCES_KEY]: preferences });
  return preferences;
}

export async function applyPreferences(): Promise<Preferences> {
  const preferences = await getPreferences();
  document.documentElement.dataset.theme = preferences.theme;
  document.documentElement.lang = preferences.locale;
  document.documentElement.dir = preferences.locale === 'ar' ? 'rtl' : 'ltr';
  const { applyLocalization } = await import('./localization');
  applyLocalization(preferences.locale);
  return preferences;
}
