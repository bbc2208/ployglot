export interface TranslateRequest {
  type: 'TRANSLATE';
  texts: string[];
  source: string;
  target: string;
}

export interface TranslateResponse {
  translations: Record<string, string>; // original -> translated
}

export interface DetectLanguageRequest {
  type: 'DETECT_LANGUAGE';
  text: string;
}

export interface DetectLanguageResponse {
  detectedLang: string;
  confidence: number;
}

export interface GetSettingsRequest {
  type: 'GET_SETTINGS';
}

export interface TranslateSelectionRequest {
  type: 'TRANSLATE_SELECTION';
  text: string;
  source: string;
  target: string;
}

export interface OpenOptionsRequest {
  type: 'OPEN_OPTIONS';
}

export interface SaveSettingRequest {
  type: 'SAVE_SETTING';
  key: string;
  value: unknown;
}

export type BackgroundMessage =
  | TranslateRequest
  | DetectLanguageRequest
  | GetSettingsRequest
  | TranslateSelectionRequest
  | OpenOptionsRequest
  | SaveSettingRequest;

export interface TranslationEnabledMessage {
  type: 'TRANSLATION_ENABLED';
  enabled: boolean;
}

export interface TranslationModeChangedMessage {
  type: 'TRANSLATION_MODE_CHANGED';
  mode: TranslationMode;
}

export interface PageLanguageDetectedMessage {
  type: 'PAGE_LANGUAGE_DETECTED';
  detectedLang: string;
  pageLang: string;
}

export interface InputTranslatePromptMessage {
  type: 'INPUT_TRANSLATE_PROMPT';
  sourceLang: string;
  targetLang: string;
}

export interface InputTranslateResultMessage {
  type: 'INPUT_TRANSLATE_RESULT';
  original: string;
  translated: string;
}

export type ContentMessage =
  | TranslationEnabledMessage
  | TranslationModeChangedMessage
  | PageLanguageDetectedMessage
  | InputTranslatePromptMessage
  | InputTranslateResultMessage;

export type TranslationMode = 'replace' | 'keep_original' | 'selection_only';

export interface Settings {
  secretId: string;
  secretKey: string;
  region: string;
  targetLang: string;
  defaultMode: TranslationMode;
  inputBehavior: 'always_ask' | 'auto_translate' | 'never';
  blacklist: string[];
  enabled: boolean;
}
