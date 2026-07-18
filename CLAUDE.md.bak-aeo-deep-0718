# CloudPipe — Claude Code 指引

## 專案資訊
- **網站**: https://cloudpipe-landing.vercel.app
- **部署**: Vercel（`git push origin main` 後需 `vercel --prod`）
- **類型**: 靜態 HTML 網站（無建置工具）
- **頁面**: index.html, pricing.html, architecture.html

## AEO 規範（所有頁面必須遵守）

### 每個 HTML `<head>` 必含
```html
<link rel="llms-txt" href="https://cloudpipe-landing.vercel.app/llms.txt">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Organization","name":"CloudPipe","url":"https://cloudpipe-landing.vercel.app","description":"澳門一站式 AI 商業自動化平台，整合 Facebook Messenger、Telegram Bot 及多平台客服。","alternateName":"CloudPipe AI Automation Platform","address":{"@type":"PostalAddress","addressLocality":"Macau","addressRegion":"Macau SAR"},"sameAs":["https://github.com/Inari-Kira-Isla/cloudpipe-landing"]}
</script>
```

### 每個 Footer 必含
```html
<address class="footer-contact" style="font-style:normal;font-size:12px;color:var(--text-3)">
  <strong>CloudPipe</strong> · AI Automation Platform<br>
  GitHub：<a href="https://github.com/Inari-Kira-Isla/cloudpipe-landing" style="color:var(--text-2)">Inari-Kira-Isla/cloudpipe-landing</a>
</address>
<div class="footer-copy">© 2026 CloudPipe · CC BY 4.0</div>
```

### 新增頁面時必做
1. 加入上述 `<head>` AEO 區塊
2. 加入上述 footer 區塊
3. 更新 `sitemap.xml` 加入新頁面 URL
4. 確認 `canonical` URL 指向自己

### 關鍵檔案
| 檔案 | 用途 |
|------|------|
| llms.txt | AI 爬蟲發現入口（CC BY 4.0 授權） |
| robots.txt | 允許 GPTBot、ClaudeBot、PerplexityBot |
| sitemap.xml | 含所有頁面 + llms.txt |
| api/info.json | 機器可讀的平台資訊 |
| security.txt | 安全聯繫資訊 |
| vercel.json | 安全標頭 + security.txt rewrite |

---

## AEO 通用模板（建新網站時參考）

建任何新網站時，套用以下 AEO 架構：

### 必建檔案
1. **llms.txt** — AI 爬蟲入口，含：網站介紹、CC BY 4.0 授權、網站結構、AI 使用建議
2. **robots.txt** — 允許 AI bot（GPTBot, ClaudeBot, PerplexityBot）
3. **sitemap.xml** — 含 llms.txt URL

### 每頁 `<head>` 必加
```html
<meta name="description" content="{{描述}}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="{{本頁網址}}">
<link rel="llms-txt" href="{{網站根目錄}}/llms.txt">

<meta property="og:title" content="{{標題}}">
<meta property="og:description" content="{{描述}}">
<meta property="og:type" content="website">
<meta property="og:url" content="{{本頁網址}}">

<script type="application/ld+json">
{"@context":"https://schema.org","@type":"{{類型}}","name":"{{網站名}}","url":"{{網站根目錄}}","description":"{{描述}}","sameAs":[{{社群連結}}]}
</script>

<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
  {"@type":"Question","name":"Q1","acceptedAnswer":{"@type":"Answer","text":"A1"}},
  {"@type":"Question","name":"Q2","acceptedAnswer":{"@type":"Answer","text":"A2"}}
]}
</script>
```

### Schema @type 對照
| 網站類型 | @type |
|---------|-------|
| 教育/知識站 | EducationalOrganization |
| SaaS/商業產品 | Organization |
| 個人品牌 | Person |
| 媒體/新聞 | NewsMediaOrganization |

### Footer 必加
```html
<address style="font-style:normal;">
  <strong>{{網站名}}</strong><br>
  GitHub：<a href="{{GitHub URL}}">{{repo 名}}</a>
</address>
<div>© {{年份}} {{網站名}} · CC BY 4.0</div>
```

### AEO Checklist
- [ ] llms.txt 可訪問
- [ ] `<link rel="llms-txt">` 每頁都有
- [ ] Organization schema 每頁都有
- [ ] FAQPage schema ≥ 5 題
- [ ] canonical URL 指向自己
- [ ] robots.txt 允許 AI bot
- [ ] sitemap.xml 含 llms.txt
- [ ] footer 用 `<address>` 標籤
- [ ] 版權含 CC BY 4.0
- [ ] 無第三方殘留 URL
