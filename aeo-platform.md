# CloudPipe AEO 網站自動生成平台

## 平台概覽

CloudPipe AEO 網站平台是一個全自動化的網站生成與代託管系統。客戶只需填寫企業資料，系統即可在數分鐘內生成符合 AEO（AI Engine Optimization）標準的網站，自動部署上線，並提供持續的內容更新與合規監控。

**核心能力：**
- 一鍵建站：JSON 輸入 → 8 步自動化流水線 → 部署上線
- AEO 合規：Schema.org + llms.txt + FAQ + robots.txt AI 友善
- AI 內容引擎：MiniMax M2.1 自動生成文章（每天最多 12 篇）
- 15 項審計：AEO（40 分）+ SEO（30 分）+ GEO（30 分）= 100 分
- 代託管：Vercel CDN 全球分發 + 持續監控

---

## 客戶需提供的資料

### 必填欄位

| 欄位 | 說明 | 範例 |
|------|------|------|
| `business_name` | 品牌名稱（中文） | 海膽速遞 |
| `business_name_en` | 英文名（用於 URL） | sea-urchin-delivery |
| `industry` | 行業類別 | cafe / restaurant / retail / finance / ... |
| `description` | 一句話介紹（50-200 字） | 澳門首家日本直送海膽冷鏈速遞品牌 |
| `region` | 所在地區 | Macau SAR |
| `contact_email` | 聯絡 Email | info@example.com |

### 建議填寫（提升品質）

| 欄位 | 說明 |
|------|------|
| `address_street` | 街道地址（有助 Google 地圖） |
| `address_city` | 城市 |
| `telephone` | 電話 |
| `opening_hours` | 營業時間 |
| `price_range` | 價位（$ / $$ / $$$ / $$$$） |
| `payment_accepted` | 支付方式 |
| `accent_color` | 品牌主色（hex） |
| `tagline` | 品牌標語 |
| `logo_url` | Logo 圖片 URL |
| `same_as_urls` | 社交媒體連結 |

### 選填（AI 可自動生成）

| 欄位 | 未填時行為 |
|------|-----------|
| `faq_items` | AI 根據行業自動生成 7 題 |
| `about_text` | AI 生成 800+ 字介紹 |
| `products_services` | AI 根據行業生成 |
| `content_topics` | AI 生成 4 類 × 10 題 = 40 題文章主題 |
| `tone_prompt` | 預設「親切專業繁體中文」 |

---

## 行業 → Schema.org 自動映射

| 行業 | Schema.org 類型 |
|------|----------------|
| 餐廳 (restaurant) | Restaurant |
| 咖啡店 (cafe) | CafeOrCoffeeShop |
| 烘焙坊 (bakery) | Bakery |
| 酒吧 (bar) | BarOrPub |
| 外送餐飲 (food_delivery) | FoodEstablishment |
| 零售 (retail) | Store |
| 精品 (luxury) | Store |
| 美容 (beauty) | HealthAndBeautyBusiness |
| 牙科 (dental) | Dentist |
| 法律 (legal) | LegalService |
| 地產 (real_estate) | RealEstateAgent |
| 金融 (financial) | FinancialService |
| 教育 (education) | EducationalOrganization |
| 旅遊 (travel) | TravelAgency |
| 醫療 (medical) | MedicalOrganization |
| 科技 (tech) | Organization |
| 顧問 (consulting) | Organization |
| 非營利 (ngo) | NGO |
| 媒體 (media) | NewsMediaOrganization |
| 個人品牌 (personal_brand) | Person |

---

## 自動化流程（8 步）

```
客戶填表 (intake.html) 或提交 JSON
    │
    ▼
[1] 驗證 + 正規化
    • 必填欄位檢查
    • slug 生成（英文名轉 kebab-case）
    • Schema.org 類型自動映射
    │
    ▼
[2] AI 內容生成 (MiniMax M2.1)
    • 如無 about_text → 生成 800+ 字介紹
    • 如 FAQ < 5 題 → 補齊到 7 題
    • 生成 40 個文章主題（4 類 × 10 題）
    │
    ▼
[3] 建立 7 個檔案
    • index.html  (≥2000字, Organization+FAQPage schema)
    • robots.txt  (14 AI 爬蟲)
    • llms.txt    (CC BY 4.0)
    • sitemap.xml (含 llms.txt)
    • security.txt (RFC 9116)
    • vercel.json (安全標頭)
    • .gitignore
    │
    ▼
[4] 本地合規預檢
    • 15 項 AEO/SEO/GEO 檢查
    • 分數 < 85 → 自動修正後重檢
    │
    ▼
[5] 部署
    • ~/Documents/{slug}/ 建立目錄
    • git init + GitHub repo
    • vercel --prod → 取得 URL
    │
    ▼
[6] 註冊到平台
    • client_sites.db 記錄
    • 動態加入審計排程
    │
    ▼
[7] 建立內容排程
    • 生成 LaunchAgent plist
    • launchctl load → 自動文章生成
    │
    ▼
[8] 初始審計 + 通知
    • 執行完整 15 項審計
    • Telegram 通知客戶
    • 回傳 {url, score, grade}
```

---

## 15 項審計指標

### AEO — AI 引擎優化（40 分）

| 代碼 | 指標 | 分數 |
|------|------|------|
| A1 | robots.txt 允許 AI 爬蟲（14 bot） | 8 |
| A2 | llms.txt 存在且可訪問 | 8 |
| A3 | `<link rel="llms-txt">` 標籤 | 8 |
| A4 | Organization Schema JSON-LD | 8 |
| A5 | FAQPage Schema（≥5 題） | 8 |

### SEO — 搜尋引擎優化（30 分）

| 代碼 | 指標 | 分數 |
|------|------|------|
| S1 | Meta description（50-160 字） | 6 |
| S2 | Canonical URL | 6 |
| S3 | Open Graph 標籤 | 6 |
| S4 | Sitemap.xml | 6 |
| S5 | Security.txt (RFC 9116) | 6 |

### GEO — 生成式引擎優化（30 分）

| 代碼 | 指標 | 分數 |
|------|------|------|
| G1 | 首段 ≥ 50 字（直答核心問題） | 10 |
| G2 | 結構化內容（h2≥3, h3≥3, list≥2） | 10 |
| G3 | 內容量 ≥ 2000 字 | 10 |

### 評級標準

| 分數 | 等級 |
|------|------|
| 95-100 | A+ |
| 85-94 | A |
| 70-84 | B |
| 50-69 | C |
| 0-49 | F |

---

## 資料庫架構

### client_sites.db（SQLite）

**5 張表：**

1. **client_sites** — 客戶網站記錄（slug, 品牌名, 行業, Schema 類型, 地址, 聯絡方式, 品牌色, 方案等級, 審計分數...）
2. **generation_logs** — 生成事件日誌（建站/文章/審計/部署記錄）
3. **client_articles** — 文章記錄（標題, slug, 分類, 日期, URL）
4. **audit_history** — 審計歷史（分數, 等級, AEO/SEO/GEO 子分, 問題清單）
5. **billing** — 帳單（方案, 期間, 金額, 付款狀態）

---

## 收費方案

| 方案 | 月費 | 文章/天 | 審計頻率 | 自定域名 |
|------|------|---------|----------|---------|
| Free | $0 | 0（靜態） | 每週 | — |
| Basic | MOP$500 | 2 | 每天 | — |
| Pro | MOP$1,500 | 6 | 每 3 小時 | 支援 |
| Enterprise | MOP$3,000 | 12 | 每小時 | 支援 + 優先 |

---

## 系統檔案清單

| 檔案 | 路徑 | 用途 |
|------|------|------|
| `client_sites_db.py` | `~/.openclaw/workspace/scripts/` | SQLite 資料模組（CRUD + 帳單 + 審計） |
| `client_site_generator.py` | `~/.openclaw/workspace/scripts/` | 一鍵建站主腳本（8 步流水線） |
| `client_article_generator.py` | `~/.openclaw/workspace/scripts/` | 文章自動生成器 |
| `aeo_site_audit.py` | `~/.openclaw/workspace/scripts/` | 15 項審計（動態載入客戶站） |
| `intake.html` | `~/Documents/cloudpipe-landing/` | 客戶資料收集表單 |

---

## 已部署客戶站

| 品牌 | URL | 行業 | 分數 |
|------|-----|------|------|
| 稻荷環球食品 | https://inari-global-foods.vercel.app | food_delivery | 98/A+ |
| After School Coffee | https://after-school-coffee.vercel.app | cafe | 100/A+ |
| Mind Coffee | https://mind-coffee.vercel.app | cafe | 99/A+ |
| 海膽速遞 | https://sea-urchin-delivery.vercel.app | food_delivery | 100/A+ |
| BNI 澳門 | https://bni-macau.vercel.app | consulting | 99/A+ |

平均分數：**99.2 / A+**

---

## 使用方式

### 方式一：命令行建站

```bash
# 準備客戶 JSON 檔案
cat > client.json << 'EOF'
{
  "business_name": "品牌名稱",
  "business_name_en": "brand-slug",
  "industry": "cafe",
  "description": "品牌介紹...",
  "region": "Macau SAR",
  "contact_email": "info@example.com"
}
EOF

# 一鍵建站
python3 ~/.openclaw/workspace/scripts/client_site_generator.py --json client.json
```

### 方式二：線上表單

前往 [intake.html](https://cloudpipe-landing.vercel.app/intake.html) 填寫資料。

### 生成文章

```bash
python3 ~/.openclaw/workspace/scripts/client_article_generator.py --site-id 1
```

### 執行審計

```bash
python3 ~/.openclaw/workspace/scripts/aeo_site_audit.py
```

---

*CloudPipe AEO Platform v1.0 — 2026-03-06*
*CC BY 4.0 — CloudPipe*
