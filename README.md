<p align="center">
  <img src="assets/ployglot.png" alt="Polyglot" width="128" height="128">
</p>

<h1 align="center">Polyglot — 智能网页翻译</h1>

<p align="center">
  <img src="https://img.shields.io/badge/chrome-mv3-blue" alt="Chrome MV3">
  <img src="https://img.shields.io/badge/firefox-mv3-orange" alt="Firefox MV3">
  <img src="https://img.shields.io/badge/edge-mv3-teal" alt="Edge MV3">
  <img src="https://img.shields.io/badge/framework-wxt-67b846" alt="WXT">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
</p>

<p align="center">自动检测网页语言并翻译 · 输入反向翻译 · 划词翻译<br>
基于 <strong>腾讯云机器翻译 TMT</strong> · 支持 18 种语言 · 覆盖三大浏览器平台</p>

---

## 功能

- **整页翻译** — 自动检测网页语言，一键将整个页面翻译为目标语言
- **两种翻译模式** — 替换原文 / 保留原文并在下方附加译文
- **输入反向翻译** — 在非母语网页输入框中输入文字，自动翻译为页面语言填入表单
- **划词翻译** — 选中网页上的任意文本，弹出悬浮卡片显示译文，支持一键复制
- **站点偏好记忆** — 按域名记住黑名单和输入翻译偏好
- **双层缓存** — 内存 LRU + IndexedDB，翻译结果 7 天过期，节省 API 调用费用
- **多浏览器支持** — Chrome / Firefox / Edge，均使用 Manifest V3

<!-- TODO: screenshots -->

## 安装

| 商店 | 状态 |
|------|------|
| [Chrome Web Store](#) | 即将上架 |
| [Firefox Add-ons](#) | 即将上架 |
| [Edge Add-ons](#) | 即将上架 |

### 开发者安装

```bash
git clone https://github.com/bbc2208/ployglot.git
cd ployglot
npm install
npm run build:chrome   # 或 build:firefox / build:edge
```

然后在浏览器扩展管理页面加载 `.output/chrome-mv3/` 目录（需开启开发者模式）。

## 配置

1. 前往 [腾讯云控制台 - API 密钥管理](https://console.cloud.tencent.com/cam/capi) 获取 SecretId 和 SecretKey
2. 打开扩展选项页，填入 API 密钥
3. 选择目标语言和默认翻译模式
4. 浏览任意非母语网页，翻译自动生效

> API 密钥仅存储在浏览器本地，不会上传至任何第三方服务器。

## 语言支持

简体中文、繁體中文、English、日本語、한국어、Français、Deutsch、Español、Português、Русский、العربية、ไทย、Tiếng Việt、Bahasa Indonesia、Italiano、Türkçe、Bahasa Melayu、हिन्दी

## 技术栈

- [WXT](https://wxt.dev) — 下一代浏览器扩展开发框架
- [React](https://react.dev) — Popup 和选项页 UI
- [TypeScript](https://www.typescriptlang.org) — 全项目类型安全
- [腾讯云 TMT](https://cloud.tencent.com/product/tmt) — 机器翻译 API（TC3-HMAC-SHA256 签名）

## 隐私政策
http://www.livesin.cn/ployglot/privacy.html
本扩展会将网页文本发送至腾讯云 TMT API 以生成翻译结果。所有数据仅存储在浏览器本地，不上传至开发者服务器。

详见 [隐私政策](privacy.html)

## License

MIT © livesin
