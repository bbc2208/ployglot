import {
  type BackgroundMessage,
  type TranslateResponse,
  type DetectLanguageResponse,
  type Settings,
} from '@/shared/messages';
import { translateText, translateBatch, detectLanguage } from '@/shared/tencent-signer';
import { cacheGet, cacheSet, cacheGetBatch, cacheSetBatch, makeCacheKey } from '@/shared/cache';
import { getSettings, saveSettings, getSetting } from '@/shared/storage';

export default defineBackground(() => {
  // Request queue for rate limiting (TMT default QPS=5)
  let activeRequests = 0;
  const MAX_CONCURRENT = 4;
  const pendingQueue: Array<() => Promise<void>> = [];
  let nextQueueFlush = 0;

  async function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        } finally {
          activeRequests--;
          flushQueue();
        }
      };

      pendingQueue.push(task);
      flushQueue();
    });
  }

  function flushQueue(): void {
    const now = Date.now();
    if (now < nextQueueFlush) {
      // Rate limited: schedule a delayed flush
      setTimeout(flushQueue, nextQueueFlush - now);
      return;
    }

    while (activeRequests < MAX_CONCURRENT && pendingQueue.length > 0) {
      const task = pendingQueue.shift()!;
      activeRequests++;
      // Throttle to ~5 QPS
      if (activeRequests >= MAX_CONCURRENT) {
        nextQueueFlush = now + 250;
      }
      task();
    }
  }

  async function handleTranslateTexts(
    texts: string[],
    source: string,
    target: string,
    settings: Settings,
  ): Promise<Record<string, string>> {
    const { secretId, secretKey, region } = settings;

    // Check cache first
    const cached = await cacheGetBatch(texts, source, target);
    const uncached: string[] = [];
    const results: Record<string, string> = {};

    for (const text of texts) {
      const cachedResult = cached.get(text);
      if (cachedResult !== undefined) {
        results[text] = cachedResult;
      } else {
        uncached.push(text);
      }
    }

    // Batch translate uncached texts (max 10 per API call)
    const BATCH_SIZE = 10;
    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      const batch = uncached.slice(i, i + BATCH_SIZE);
      const translatedBatch = await enqueue(() =>
        translateBatch(secretId, secretKey, region, batch, source, target),
      );
      for (let j = 0; j < batch.length; j++) {
        const original = batch[j];
        const translated = translatedBatch[j];
        if (translated) {
          results[original] = translated;
        }
      }
      // Enforce rate limit: 200ms between batches
      if (i + BATCH_SIZE < uncached.length) {
        await new Promise((r) => setTimeout(r, 220));
      }
    }

    // Cache the new translations
    const newTranslations = new Map<string, string>();
    for (const text of uncached) {
      if (results[text]) {
        newTranslations.set(text, results[text]);
      }
    }
    await cacheSetBatch(newTranslations, source, target);

    return results;
  }

  browser.runtime.onMessage.addListener(
    (message: BackgroundMessage, _sender): Promise<unknown> | undefined => {
      switch (message.type) {
        case 'TRANSLATE': {
          return (async (): Promise<TranslateResponse> => {
            const settings = await getSettings();
            if (!settings.secretId || !settings.secretKey) {
              throw new Error('请先在选项页配置腾讯云 API 密钥');
            }
            const translations = await handleTranslateTexts(
              message.texts,
              message.source,
              message.target,
              settings,
            );
            return { translations };
          })();
        }

        case 'DETECT_LANGUAGE': {
          return (async (): Promise<DetectLanguageResponse> => {
            const settings = await getSettings();
            if (!settings.secretId || !settings.secretKey) {
              const sample = message.text;
              // Unicode-range heuristics for common languages
              if (/[一-鿿]/.test(sample))
                return { detectedLang: 'zh', confidence: 0.9 };
              if (/[぀-ゟ゠-ヿ]/.test(sample))
                return { detectedLang: 'ja', confidence: 0.9 };
              if (/[가-힯]/.test(sample))
                return { detectedLang: 'ko', confidence: 0.9 };
              if (/[؀-ۿ]/.test(sample))
                return { detectedLang: 'ar', confidence: 0.9 };
              if (/[฀-๿]/.test(sample))
                return { detectedLang: 'th', confidence: 0.9 };
              if (/[Ѐ-ӿ]/.test(sample))
                return { detectedLang: 'ru', confidence: 0.85 };
              if (/[ऀ-ॿ]/.test(sample))
                return { detectedLang: 'hi', confidence: 0.85 };
              // European languages: check for Latin-script accented chars
              if (/[àâäéèêëïîôöùûüçœæ]/i.test(sample))
                return { detectedLang: 'fr', confidence: 0.55 };
              if (/[ß]/.test(sample) && /[äöü]/.test(sample))
                return { detectedLang: 'de', confidence: 0.55 };
              if (/[ñ¿¡]/.test(sample))
                return { detectedLang: 'es', confidence: 0.55 };
              if (/[ãõàáéíóúâêôç]/.test(sample))
                return { detectedLang: 'pt', confidence: 0.5 };
              return { detectedLang: 'en', confidence: 0.4 };
            }
            return enqueue(() =>
              detectLanguage(settings.secretId, settings.secretKey, settings.region, message.text),
            ).then((r) => ({
              detectedLang: r.lang,
              confidence: r.confidence,
            }));
          })();
        }

        case 'GET_SETTINGS': {
          return getSettings();
        }

        case 'TRANSLATE_SELECTION': {
          return (async () => {
            const settings = await getSettings();
            if (!settings.secretId || !settings.secretKey) {
              throw new Error('请先在选项页配置腾讯云 API 密钥');
            }
            return enqueue(() =>
              translateText(
                settings.secretId,
                settings.secretKey,
                settings.region,
                message.text,
                message.source,
                message.target,
              ),
            ).then((translated) => ({ translated }));
          })();
        }

        case 'SAVE_SETTING': {
          return saveSettings({ [message.key]: message.value });
        }

        case 'OPEN_OPTIONS': {
          browser.runtime.openOptionsPage();
          return Promise.resolve();
        }
      }
    },
  );
});
