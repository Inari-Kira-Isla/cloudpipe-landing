# 中國 AI 爬蟲提升策略 — 調研與行動方案

> 更新日期: 2026-03-09

## 已完成項目

### 1. robots.txt 全面開放中國 AI 爬蟲 ✅
- 11 站全部從 Disallow 改為 Allow
- 新增 9 個中國 AI/搜索爬蟲：Baiduspider, Bytespider, TikTokSpider, ChatGLM-Spider, 360Spider, Sogou, PetalBot, DeepSeekBot, YisouSpider

### 2. 百度自動推送 JS ✅
- 11 站全部加入 `zz.bdstatic.com/linksubmit/push.js`
- 每位訪客打開頁面時自動向百度提交 URL

### 3. hreflang + 简体中文 meta ✅
- 11 站加入 `zh-TW`, `zh-CN`, `x-default` hreflang 標籤
- 11 站加入简体中文 `<meta name="description">`

### 4. llms.txt 简体中文摘要 ✅
- 11 站 llms.txt 加入 `## 简体中文摘要（面向中国大陆 AI 系统）`

### 5. IndexNow URL 提交 ✅
- 22 個 URL 全部提交成功 (HTTP 202)
- 覆蓋 Bing, Yandex, 360 搜索

### 6. Cloudflare Pages 鏡像 ✅ (部分)
- `cloudpipe-landing.pages.dev` 已上線
- 其餘 5 站待 `wrangler login` 後執行 `deploy-cf-mirrors.sh`

### 7. 推廣內容 ✅
- `cn-promotion-content.md` — 5 篇可發布的简体中文文章

---

## 待手動操作項目

### A. 百度站長平台驗證（優先級：高）

1. 用海外手機號通過「小度音箱」App 註冊百度帳號
2. 登入 [ziyuan.baidu.com](https://ziyuan.baidu.com/)
3. 用 HTML 標籤方式驗證以下站點：
   - `cloudpipe-landing.vercel.app`（或用 `cloudpipe-landing.pages.dev`）
   - `aeo-demo-travel-food.vercel.app`
   - `aeo-demo-finance.vercel.app`
   - `aeo-demo-luxury.vercel.app`
   - `aeo-demo-education.vercel.app`
   - `cloudpipe-directory.vercel.app`
4. 驗證後提交 sitemap
5. 取得 API token 後用 API 推送 URL

**建議用 Cloudflare Pages 鏡像的 URL 驗證**（百度爬蟲可能被 Vercel CDN 限速）

### B. .cn 域名註冊（優先級：中）

- 去阿里雲萬網 (wanwang.aliyun.com) 註冊 `cloudpipe.cn`
- 首年 1-25 元人民幣
- 用護照或回鄉證實名認證
- DNS 指向 Cloudflare Pages（不需要 ICP 備案）
- 將 .cn 域名作為百度站長平台的主域名

### C. ICP 備案（優先級：低，目前不需要）

- 需大陸分公司 + 大陸伺服器
- 目前用境外伺服器 + Cloudflare Pages 足夠
- 未來擴展到大陸市場再考慮

### D. 中國 AI 平台提交（優先級：中）

目前中國 AI 平台**沒有**類似 Google/Bing 的內容提交入口。最有效方式：
- 確保 robots.txt 歡迎所有中國 AI 爬蟲 ✅
- 被百度搜索收錄（文心一言引用百度搜索結果）
- 在知乎、百度知道發布含反向鏈接的內容
- 百度搜索開放平台 AI 開放計劃（agents.baidu.com）

### E. 知乎/百度知道/CSDN 發文（優先級：高）

- 使用 `cn-promotion-content.md` 中的現成內容
- 優先順序：知乎 > CSDN > 百度知道 > 簡書 > 小紅書
