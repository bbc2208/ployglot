export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

export const TOP_LANGUAGES: Language[] = [
  LANGUAGES[0],
  LANGUAGES[2],
  LANGUAGES[3],
  LANGUAGES[4],
  LANGUAGES[5],
  LANGUAGES[6],
  LANGUAGES[7],
];

export function getLangName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.nativeName ?? code;
}

export function getLangCode(name: string): string | undefined {
  return LANGUAGES.find(
    (l) => l.code === name || l.name === name || l.nativeName === name,
  )?.code;
}

export function detectPageLangFromDOM(): string {
  const htmlLang = document.documentElement.lang;
  if (htmlLang) {
    const match = htmlLang.match(/^([a-z]{2,3})/i);
    if (match) return match[1].toLowerCase();
  }

  const metaLang = document.querySelector('meta[http-equiv="content-language"]');
  if (metaLang) {
    const content = metaLang.getAttribute('content');
    if (content) {
      const match = content.match(/^([a-z]{2,3})/i);
      if (match) return match[1].toLowerCase();
    }
  }

  return '';
}
