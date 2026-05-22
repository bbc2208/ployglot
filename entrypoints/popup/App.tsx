import { useState, useEffect, useCallback } from 'react';
import type { Settings, TranslationMode } from '@/shared/messages';
import { LANGUAGES, TOP_LANGUAGES } from '@/shared/languages';

const MODE_LABELS: Record<TranslationMode, string> = {
  replace: '替换原文',
  keep_original: '保留原文',
  selection_only: '仅划词',
};

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageStatus, setPageStatus] = useState<string>('...');

  useEffect(() => {
    loadSettings();
    checkCurrentPage();
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const s = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
      setSettings(s);
    } catch {
      setPageStatus('扩展上下文已失效，请刷新页面');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkCurrentPage = useCallback(async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const domain = new URL(tab.url).hostname;
        setPageStatus(`当前站点: ${domain}`);
      }
    } catch {
      setPageStatus('');
    }
  }, []);

  const toggleEnabled = useCallback(async () => {
    if (!settings) return;
    const updated = { ...settings, enabled: !settings.enabled };
    setSettings(updated);
    await browser.runtime.sendMessage({
      type: 'SAVE_SETTING',
      key: 'enabled',
      value: updated.enabled,
    });
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      browser.tabs.sendMessage(tab.id, {
        type: 'TRANSLATION_ENABLED',
        enabled: updated.enabled,
      }).catch(() => {});
    }
  }, [settings]);

  const setMode = useCallback(
    async (mode: TranslationMode) => {
      if (!settings) return;
      const updated = { ...settings, defaultMode: mode };
      setSettings(updated);
      await browser.runtime.sendMessage({
        type: 'SAVE_SETTING',
        key: 'defaultMode',
        value: mode,
      });
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        browser.tabs.sendMessage(tab.id, {
          type: 'TRANSLATION_MODE_CHANGED',
          mode,
        }).catch(() => {});
      }
    },
    [settings],
  );

  const setTargetLang = useCallback(
    async (lang: string) => {
      if (!settings) return;
      const updated = { ...settings, targetLang: lang };
      setSettings(updated);
      await browser.runtime.sendMessage({
        type: 'SAVE_SETTING',
        key: 'targetLang',
        value: lang,
      });
    },
    [settings],
  );

  const openOptions = useCallback(() => {
    browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>无法加载设置</div>
      </div>
    );
  }

  const apiConfigured = !!(settings.secretId && settings.secretKey);

  return (
    <div className="container">
      <div className="header">
        <h1>Polyglot</h1>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={toggleEnabled}
          />
          <span className="slider" />
        </label>
      </div>

      {!apiConfigured && (
        <div className="error-msg">
          请先<a href="#" onClick={(e) => { e.preventDefault(); openOptions(); }}>配置腾讯云 API 密钥</a>以启用翻译功能
        </div>
      )}

      <div className="status-bar">
        <span
          className={`status-dot ${!apiConfigured ? 'unconfigured' : settings.enabled ? 'active' : 'inactive'}`}
        />
        <span>
          {!apiConfigured
            ? '未配置 API'
            : settings.enabled
              ? '翻译已启用'
              : '翻译已暂停'}
        </span>
        {pageStatus && (
          <span className="site-info" style={{ marginLeft: 'auto' }}>
            {pageStatus.split(': ')[1] || pageStatus}
          </span>
        )}
      </div>

      <div className="section">
        <div className="section-label">目标语言</div>
        <select
          value={settings.targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
        >
          {TOP_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeName} ({l.name})
            </option>
          ))}
          <option disabled>──</option>
          {LANGUAGES.filter((l) => !TOP_LANGUAGES.includes(l)).map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeName} ({l.name})
            </option>
          ))}
        </select>
      </div>

      <div className="section">
        <div className="section-label">翻译模式</div>
        <div className="mode-group">
          {(Object.keys(MODE_LABELS) as TranslationMode[]).map((mode) => (
            <button
              key={mode}
              className={`mode-btn ${settings.defaultMode === mode ? 'active' : ''}`}
              onClick={() => setMode(mode)}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="footer">
        <a href="#" onClick={(e) => { e.preventDefault(); openOptions(); }}>
          更多设置
        </a>
        <span style={{ fontSize: 11, color: '#555' }}>v0.1.0</span>
      </div>
    </div>
  );
}
