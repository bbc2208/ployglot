import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: 'Polyglot - 智能网页翻译',
    description: '自动检测网页语言并翻译，支持输入反向翻译、划词翻译',
    author: 'bbc2208',
    homepage_url: 'https://github.com/bbc2208/ployglot',
    permissions: ['storage'],
    host_permissions: ['https://tmt.tencentcloudapi.com/*'],
    icons: {
      '16': '/icons/icon-16.png',
      '48': '/icons/icon-48.png',
      '128': '/icons/icon-128.png',
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
    browser_specific_settings: {
      gecko: {
        id: 'ployglot@github.com',
        strict_min_version: '112.0',
      },
    },
  },
  runner: {
    startUrls: ['https://example.com'],
  },
});
