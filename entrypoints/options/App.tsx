import { useState, useEffect, useCallback } from 'react';
import type { Settings, TranslationMode } from '@/shared/messages';
import { LANGUAGES } from '@/shared/languages';
import { cacheClear } from '@/shared/cache';

const MODE_LABELS: Record<TranslationMode, string> = {
  replace: '替换原文',
  keep_original: '保留原文',
  selection_only: '仅划词翻译',
};

const INPUT_BEHAVIORS: Record<string, string> = {
  always_ask: '每次询问',
  auto_translate: '自动翻译',
  never: '永不翻译',
};

const LANG_OPTIONS = [
  { value: 'auto', label: '自动检测' },
  ...LANGUAGES.map((l) => ({ value: l.code, label: `${l.nativeName} (${l.name})` })),
];

export default function OptionsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    browser.runtime.sendMessage({ type: 'GET_SETTINGS' }).then(setSettings);
  }, []);

  const update = useCallback(
    async (kv: Partial<Settings>) => {
      if (!settings) return;
      const merged = { ...settings, ...kv };
      setSettings(merged);
      for (const [key, value] of Object.entries(kv)) {
        await browser.runtime.sendMessage({ type: 'SAVE_SETTING', key, value });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [settings],
  );

  const clearCache = useCallback(async () => {
    await cacheClear();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  }, []);

  if (!settings) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>加载中...</div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>Polyglot 设置</h1>

        {/* API Configuration */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>腾讯云 API 配置</h2>
          <div style={styles.field}>
            <label style={styles.label}>SecretId</label>
            <input
              type="text"
              style={styles.input}
              value={settings.secretId}
              onChange={(e) => update({ secretId: e.target.value })}
              placeholder="请输入腾讯云 SecretId"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>SecretKey</label>
            <input
              type="password"
              style={styles.input}
              value={settings.secretKey}
              onChange={(e) => update({ secretKey: e.target.value })}
              placeholder="请输入腾讯云 SecretKey"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>区域 (Region)</label>
            <input
              type="text"
              style={styles.input}
              value={settings.region}
              onChange={(e) => update({ region: e.target.value })}
              placeholder="ap-guangzhou"
            />
          </div>
          <p style={styles.hint}>
            API Key 仅存储在浏览器本地，不会上传到任何第三方服务器。
            <a
              href="https://console.cloud.tencent.com/cam/capi"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4a90d9', marginLeft: 4 }}
            >
              获取密钥 →
            </a>
          </p>
        </section>

        {/* Default Settings */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>默认翻译设置</h2>
          <div style={styles.field}>
            <label style={styles.label}>目标语言</label>
            <select
              style={styles.select}
              value={settings.targetLang}
              onChange={(e) => update({ targetLang: e.target.value })}
            >
              {LANG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>默认翻译模式</label>
            <div style={styles.radioGroup}>
              {(Object.keys(MODE_LABELS) as TranslationMode[]).map((mode) => (
                <label key={mode} style={styles.radio}>
                  <input
                    type="radio"
                    name="mode"
                    value={mode}
                    checked={settings.defaultMode === mode}
                    onChange={() => update({ defaultMode: mode })}
                  />
                  <span>{MODE_LABELS[mode]}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Input Translation Behavior */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>输入翻译行为</h2>
          <p style={styles.hint}>
            当您在非中文网页输入中文时，插件如何处理：
          </p>
          <div style={styles.field}>
            <div style={styles.radioGroup}>
              {Object.entries(INPUT_BEHAVIORS).map(([value, label]) => (
                <label key={value} style={styles.radio}>
                  <input
                    type="radio"
                    name="inputBehavior"
                    value={value}
                    checked={settings.inputBehavior === value}
                    onChange={() => update({ inputBehavior: value as Settings['inputBehavior'] })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Blacklist */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>站点黑名单</h2>
          <p style={styles.hint}>
            添加域名（每行一个），支持通配符如 *.example.com
          </p>
          <textarea
            style={{ ...styles.input, minHeight: 100 }}
            value={settings.blacklist.join('\n')}
            onChange={(e) =>
              update({
                blacklist: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder={`example.com\n*.wikipedia.org`}
          />
        </section>

        {/* Cache */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>缓存管理</h2>
          <button
            style={styles.button}
            onClick={clearCache}
          >
            {cacheCleared ? '已清除 ✓' : '清除翻译缓存'}
          </button>
        </section>

        {/* Save indicator */}
        {saved && (
          <div style={styles.toast}>设置已保存</div>
        )}

        <p style={{ ...styles.hint, marginTop: 24, textAlign: 'center' }}>
          Polyglot v0.1.0 · 基于腾讯云机器翻译 TMT
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    background: '#1a1a2e',
    color: '#e0e0e0',
    minHeight: '100vh',
    padding: '20px',
  },
  container: {
    maxWidth: 640,
    margin: '0 auto',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #4a90d9, #7b68ee)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: 28,
  },
  section: {
    background: '#16213e',
    borderRadius: 10,
    padding: '18px 20px',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 14,
    color: '#ccc',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 13,
    color: '#999',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    background: '#1a1a2e',
    color: '#e0e0e0',
    border: '1px solid #333',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  select: {
    width: '100%',
    padding: '8px 10px',
    background: '#1a1a2e',
    color: '#e0e0e0',
    border: '1px solid #333',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  },
  hint: {
    fontSize: 12,
    color: '#777',
    lineHeight: 1.5,
  },
  radioGroup: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap' as const,
  },
  radio: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  button: {
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
  toast: {
    position: 'fixed' as const,
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#4caf50',
    color: '#fff',
    padding: '8px 24px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
};
