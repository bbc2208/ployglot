import type { Settings, TranslationMode } from './messages';

const SETTINGS_KEY = 'polyglot_settings';

const DEFAULT_SETTINGS: Settings = {
  secretId: '',
  secretKey: '',
  region: 'ap-guangzhou',
  targetLang: 'zh',
  defaultMode: 'replace',
  inputBehavior: 'always_ask',
  blacklist: [],
  enabled: true,
};

export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(SETTINGS_KEY);
  if (result[SETTINGS_KEY]) {
    return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await browser.storage.local.set({ [SETTINGS_KEY]: merged });
}

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const settings = await getSettings();
  return settings[key];
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  await saveSettings({ [key]: value });
}

export async function isSiteBlacklisted(domain: string): Promise<boolean> {
  const blacklist = await getSetting('blacklist');
  return blacklist.some((pattern: string) => {
    if (pattern === domain) return true;
    if (pattern.startsWith('*') && domain.endsWith(pattern.slice(1))) return true;
    return false;
  });
}

export async function addToBlacklist(domain: string): Promise<void> {
  const blacklist = await getSetting('blacklist');
  if (!blacklist.includes(domain)) {
    await saveSettings({ blacklist: [...blacklist, domain] });
  }
}

export async function removeFromBlacklist(domain: string): Promise<void> {
  const blacklist = await getSetting('blacklist');
  await saveSettings({
    blacklist: blacklist.filter((p: string) => p !== domain),
  });
}

export async function getSiteInputPreference(
  domain: string,
): Promise<'always' | 'never' | undefined> {
  const key = `input_pref_${domain}`;
  const result = await browser.storage.local.get(key);
  return result[key] as 'always' | 'never' | undefined;
}

export async function setSiteInputPreference(
  domain: string,
  preference: 'always' | 'never',
): Promise<void> {
  await browser.storage.local.set({ [`input_pref_${domain}`]: preference });
}
