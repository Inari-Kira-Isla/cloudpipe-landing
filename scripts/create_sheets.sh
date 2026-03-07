#!/bin/bash
# CloudPipe AI — AEO 追蹤 Google Sheets 自動建立腳本
# 使用 gcloud OAuth token + Google Sheets API v4

set -e
export PATH="/usr/local/share/google-cloud-sdk/bin:$PATH"

TOKEN=$(gcloud auth print-access-token)
API="https://sheets.googleapis.com/v4/spreadsheets"

echo "=== 建立 CloudPipe AI AEO 追蹤表格 ==="

# Step 1: Create spreadsheet with 7 sheets
RESPONSE=$(curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "properties": {
    "title": "CloudPipe AI — AEO 生態系追蹤",
    "locale": "zh_TW"
  },
  "sheets": [
    {"properties": {"title": "客戶總表", "sheetId": 0, "tabColorStyle": {"rgbColor": {"red": 0.22, "green": 0.82, "blue": 0.75}}}},
    {"properties": {"title": "技術掃描", "sheetId": 1, "tabColorStyle": {"rgbColor": {"red": 0.25, "green": 0.73, "blue": 0.31}}}},
    {"properties": {"title": "AI 問答測試", "sheetId": 2, "tabColorStyle": {"rgbColor": {"red": 0.35, "green": 0.65, "blue": 1.0}}}},
    {"properties": {"title": "AEO 評分", "sheetId": 3, "tabColorStyle": {"rgbColor": {"red": 0.74, "green": 0.55, "blue": 1.0}}}},
    {"properties": {"title": "部署記錄", "sheetId": 4, "tabColorStyle": {"rgbColor": {"red": 0.97, "green": 0.32, "blue": 0.37}}}},
    {"properties": {"title": "里程碑", "sheetId": 5, "tabColorStyle": {"rgbColor": {"red": 0.82, "green": 0.6, "blue": 0.13}}}},
    {"properties": {"title": "聚合數據", "sheetId": 6, "tabColorStyle": {"rgbColor": {"red": 0.94, "green": 0.53, "blue": 0.24}}}}
  ]
}')

SPREADSHEET_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['spreadsheetId'])" 2>/dev/null)

if [ -z "$SPREADSHEET_ID" ]; then
  echo "ERROR: 建立失敗"
  echo "$RESPONSE"
  exit 1
fi

echo "Spreadsheet ID: $SPREADSHEET_ID"
echo "URL: https://docs.google.com/spreadsheets/d/$SPREADSHEET_ID"

# Step 2: Batch update — headers + data + formatting
curl -s -X POST "$API/$SPREADSHEET_ID/values:batchUpdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "valueInputOption": "USER_ENTERED",
  "data": [
    {
      "range": "客戶總表!A1:S5",
      "values": [
        ["編號", "客戶名稱", "英文名", "行業分類", "Schema 類型", "現有網站", "CloudPipe URL", "來源渠道", "聯繫人", "電話/微信", "登記日期", "上線日期", "授權狀態", "計畫層級", "AEO BEFORE 分", "AEO AFTER 7天", "AEO AFTER 30天", "AEO AFTER 90天", "備註"],
        ["S001", "稻荷環球食品", "Inari Global Foods", "食品貿易", "Organization", "https://inari-global-foods.vercel.app", "", "自有品牌", "Joe", "", "2026-03-07", "", "已授權", "free", "", "", "", "", "海膽進口"],
        ["S002", "海膽速遞", "Sea Urchin Express", "食品零售/配送", "Organization", "https://sea-urchin-delivery.vercel.app", "", "自有品牌", "Joe", "", "2026-03-07", "", "已授權", "free", "", "", "", "", "海膽外送"],
        ["S003", "山中田", "Yamanakada", "科技顧問", "Organization", "https://yamanakada.vercel.app", "", "自有品牌", "Joe", "", "2026-03-07", "", "已授權", "free", "", "", "", "", "AI 科技顧問"],
        ["S004", "After School Coffee", "After School Coffee", "咖啡", "CafeOrCoffeeShop", "https://after-school-coffee.vercel.app", "", "自有品牌", "Joe", "", "2026-03-07", "", "已授權", "free", "", "", "", "", "學生咖啡店"]
      ]
    },
    {
      "range": "技術掃描!A1:U5",
      "values": [
        ["客戶編號", "掃描日期", "掃描類型", "llms.txt", "llms-full.txt", "Schema.org 類型", "Schema 完整度", "Open Graph", "SSR 可抓取", "多語言-英文", "多語言-葡文", "FAQ 結構", "FAQ 題數", "Sitemap.xml", "Sitemap URL數", "robots.txt AI友善", "AI 爬蟲數", "security.txt", "知識圖譜連結數", "技術總分 (/30)", "備註"],
        ["S001", "2026-03-07", "BEFORE", "✓", "✗", "Organization+FAQ", "95%", "✓ 完整", "✓", "弱", "✗", "✓", "6", "✓", "2", "✓", "13", "✓", "4", "26", ""],
        ["S002", "2026-03-07", "BEFORE", "✓", "✗", "Organization+FAQ", "95%", "✓ 完整", "✓", "弱", "✗", "✓", "5", "✓", "3", "✓", "11", "✗", "4", "26", "缺 security.txt"],
        ["S003", "2026-03-07", "BEFORE", "✓", "✗", "Org+Website+FAQ", "90%", "✓ 完整", "⚠ JS混合", "弱", "✗", "✓", "7", "✓", "5", "✓", "12", "✓", "0", "26", "sameAs 空"],
        ["S004", "2026-03-07", "BEFORE", "✓", "✗", "CafeOrCoffeeShop+FAQ", "95%", "✓ 完整", "✓", "弱", "✗", "✓", "6", "✓", "2", "✓", "11", "✗", "4", "26", "缺 security.txt"]
      ]
    },
    {
      "range": "AI 問答測試!A1:M1",
      "values": [
        ["客戶編號", "測試類型", "測試日期", "查詢編號", "查詢原文", "平台", "品牌是否出現", "出現位置", "資訊準確度", "情感傾向", "回答摘要", "截圖文件名", "備註"]
      ]
    },
    {
      "range": "AEO 評分!A1:W5",
      "values": [
        ["客戶編號", "客戶名稱", "評分日期", "評分類型", "技術分 (/30)", "— llms.txt (+5)", "— Schema (+8)", "— OG (+4)", "— SSR (+5)", "— 英文 (+4)", "— 葡文 (+2)", "— robots.txt (+2)", "AI問答分 (/50)", "— 出現率 (×30)", "— 位置分 (+10)", "— 準確度 (+10)", "內容分 (/20)", "— 深度>1000字 (+8)", "— FAQ結構 (+6)", "— 定期更新 (+6)", "AEO 總分 (/100)", "等級", "備註"],
        ["S001", "稻荷環球食品", "2026-03-07", "BEFORE (技術)", "26", "5", "8", "4", "5", "0", "0", "2", "", "", "", "", "20", "8", "6", "6", "", "", "AI問答分待 BEFORE 測試"],
        ["S002", "海膽速遞", "2026-03-07", "BEFORE (技術)", "26", "5", "8", "4", "5", "0", "0", "2", "", "", "", "", "20", "8", "6", "6", "", "", "AI問答分待 BEFORE 測試"],
        ["S003", "山中田", "2026-03-07", "BEFORE (技術)", "26", "5", "8", "4", "5", "0", "0", "2", "", "", "", "", "20", "8", "6", "6", "", "", "AI問答分待 BEFORE 測試"],
        ["S004", "After School Coffee", "2026-03-07", "BEFORE (技術)", "26", "5", "8", "4", "5", "0", "0", "2", "", "", "", "", "20", "8", "6", "6", "", "", "AI問答分待 BEFORE 測試"]
      ]
    },
    {
      "range": "部署記錄!A1:P5",
      "values": [
        ["客戶編號", "上線 URL", "部署日期", "模板版本", "Schema 類型", "llms.txt 路徑", "llms-full.txt 路徑", "內容頁數", "中文字數", "英文字數", "Vercel Project", "GitHub Repo", "自訂域名", "知識圖譜已錄入", "Cloudflare Worker", "備註"],
        ["S001", "https://inari-global-foods.vercel.app", "2026-03-06", "v0.1", "Organization+FAQ", "/llms.txt", "—", "1+articles", "~3500", "~200", "inari-global-foods", "—", "—", "✓", "client-ai-tracker", "Phase 0 初版"],
        ["S002", "https://sea-urchin-delivery.vercel.app", "2026-03-06", "v0.1", "Organization+FAQ", "/llms.txt", "—", "1+articles", "~4500", "~200", "sea-urchin-delivery", "—", "—", "✓", "client-ai-tracker", "Phase 0 初版"],
        ["S003", "https://yamanakada.vercel.app", "2026-03-07", "v0.1", "Org+Website+FAQ", "/llms.txt", "—", "1+articles", "~2500", "~200", "yamanakada", "—", "—", "✓", "client-ai-tracker", "Phase 0 初版"],
        ["S004", "https://after-school-coffee.vercel.app", "2026-03-06", "v0.1", "CafeOrCoffeeShop+FAQ", "/llms.txt", "—", "1", "~4000", "~100", "after-school-coffee", "—", "—", "✓", "client-ai-tracker", "Phase 0 初版"]
      ]
    },
    {
      "range": "里程碑!A1:G6",
      "values": [
        ["日期", "里程碑類型", "觸發條件", "描述", "證據附件路徑", "後續動作", "狀態"],
        ["", "Phase 0 完成", "4 個自有品牌全部上線", "待達成：建 AEO 達標版", "", "製作示範案例集", "進行中"],
        ["", "10站達標", "累計 10 個百科頁面", "", "", "計算平均 AEO 提升", "待達成"],
        ["", "30站達標", "累計 30 個百科頁面", "", "", "生成澳門 AI 可見性指數 v0.1", "待達成"],
        ["", "首次政府接觸", "任何正式/非正式接觸", "", "", "記錄反饋+後續動作", "待達成"],
        ["", "AI 引用事件", "AI 回答明確引用知識圖譜", "", "", "截圖+時間戳", "待達成"]
      ]
    },
    {
      "range": "聚合數據!A1:M2",
      "values": [
        ["統計日期", "總站數", "活躍站數", "平均 AEO 分", "平均技術分", "平均 AI問答分", "平均內容分", "品牌平均出現率", "行業分佈", "知識圖譜覆蓋率", "本月新增站數", "本月 AEO 提升 (平均)", "備註"],
        ["2026-03-07", "4", "4", "—", "26/30", "—", "20/20", "—", "食品:2, 科技:1, 咖啡:1", "4/4 互聯", "4", "—", "Phase 0 啟動，AI問答分待測"]
      ]
    }
  ]
}' > /dev/null

echo "✓ 資料已填入"

# Step 3: Bold + freeze header rows
curl -s -X POST "$API/$SPREADSHEET_ID:batchUpdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "requests": [
    {"repeatCell": {"range": {"sheetId": 0, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.1, "green": 0.1, "blue": 0.18}, "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}, "bold": true}}}, "fields": "userEnteredFormat(backgroundColor,textFormat)"}},
    {"repeatCell": {"range": {"sheetId": 1, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.09, "green": 0.13, "blue": 0.24}, "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}, "bold": true}}}, "fields": "userEnteredFormat(backgroundColor,textFormat)"}},
    {"repeatCell": {"range": {"sheetId": 2, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.06, "green": 0.2, "blue": 0.38}, "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}, "bold": true}}}, "fields": "userEnteredFormat(backgroundColor,textFormat)"}},
    {"repeatCell": {"range": {"sheetId": 3, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.33, "green": 0.2, "blue": 0.51}, "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}, "bold": true}}}, "fields": "userEnteredFormat(backgroundColor,textFormat)"}},
    {"repeatCell": {"range": {"sheetId": 4, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.91, "green": 0.27, "blue": 0.35}, "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}, "bold": true}}}, "fields": "userEnteredFormat(backgroundColor,textFormat)"}},
    {"repeatCell": {"range": {"sheetId": 5, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.17, "green": 0.18, "blue": 0.26}, "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}, "bold": true}}}, "fields": "userEnteredFormat(backgroundColor,textFormat)"}},
    {"repeatCell": {"range": {"sheetId": 6, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.04, "green": 0.1, "blue": 0.19}, "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}, "bold": true}}}, "fields": "userEnteredFormat(backgroundColor,textFormat)"}},
    {"updateSheetProperties": {"properties": {"sheetId": 0, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},
    {"updateSheetProperties": {"properties": {"sheetId": 1, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},
    {"updateSheetProperties": {"properties": {"sheetId": 2, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},
    {"updateSheetProperties": {"properties": {"sheetId": 3, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},
    {"updateSheetProperties": {"properties": {"sheetId": 4, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},
    {"updateSheetProperties": {"properties": {"sheetId": 5, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},
    {"updateSheetProperties": {"properties": {"sheetId": 6, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},
    {"autoResizeDimensions": {"dimensions": {"sheetId": 0, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 19}}},
    {"autoResizeDimensions": {"dimensions": {"sheetId": 1, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 21}}},
    {"autoResizeDimensions": {"dimensions": {"sheetId": 2, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 13}}},
    {"autoResizeDimensions": {"dimensions": {"sheetId": 3, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 23}}},
    {"autoResizeDimensions": {"dimensions": {"sheetId": 4, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 16}}},
    {"autoResizeDimensions": {"dimensions": {"sheetId": 5, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 7}}},
    {"autoResizeDimensions": {"dimensions": {"sheetId": 6, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 13}}}
  ]
}' > /dev/null

echo "✓ 格式設定完成"

# Step 4: Add data validation for AI 問答測試 sheet
curl -s -X POST "$API/$SPREADSHEET_ID:batchUpdate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "requests": [
    {"setDataValidation": {"range": {"sheetId": 2, "startRowIndex": 1, "endRowIndex": 501, "startColumnIndex": 1, "endColumnIndex": 2}, "rule": {"condition": {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": "BEFORE"}, {"userEnteredValue": "AFTER-7天"}, {"userEnteredValue": "AFTER-30天"}, {"userEnteredValue": "AFTER-90天"}, {"userEnteredValue": "月度追蹤"}]}, "showCustomUi": true, "strict": false}}},
    {"setDataValidation": {"range": {"sheetId": 2, "startRowIndex": 1, "endRowIndex": 501, "startColumnIndex": 5, "endColumnIndex": 6}, "rule": {"condition": {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": "ChatGPT"}, {"userEnteredValue": "Claude"}, {"userEnteredValue": "Gemini"}, {"userEnteredValue": "Perplexity"}]}, "showCustomUi": true, "strict": false}}},
    {"setDataValidation": {"range": {"sheetId": 2, "startRowIndex": 1, "endRowIndex": 501, "startColumnIndex": 6, "endColumnIndex": 7}, "rule": {"condition": {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": "是"}, {"userEnteredValue": "否"}]}, "showCustomUi": true, "strict": false}}},
    {"setDataValidation": {"range": {"sheetId": 2, "startRowIndex": 1, "endRowIndex": 501, "startColumnIndex": 7, "endColumnIndex": 8}, "rule": {"condition": {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": "第1位"}, {"userEnteredValue": "第2位"}, {"userEnteredValue": "第3位"}, {"userEnteredValue": "更後"}, {"userEnteredValue": "未出現"}]}, "showCustomUi": true, "strict": false}}},
    {"setDataValidation": {"range": {"sheetId": 2, "startRowIndex": 1, "endRowIndex": 501, "startColumnIndex": 8, "endColumnIndex": 9}, "rule": {"condition": {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": "準確"}, {"userEnteredValue": "部分準確"}, {"userEnteredValue": "不準確"}, {"userEnteredValue": "未提及"}]}, "showCustomUi": true, "strict": false}}},
    {"setDataValidation": {"range": {"sheetId": 2, "startRowIndex": 1, "endRowIndex": 501, "startColumnIndex": 9, "endColumnIndex": 10}, "rule": {"condition": {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": "正面"}, {"userEnteredValue": "中性"}, {"userEnteredValue": "負面"}, {"userEnteredValue": "未提及"}]}, "showCustomUi": true, "strict": false}}},
    {"setDataValidation": {"range": {"sheetId": 5, "startRowIndex": 1, "endRowIndex": 101, "startColumnIndex": 6, "endColumnIndex": 7}, "rule": {"condition": {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": "待達成"}, {"userEnteredValue": "進行中"}, {"userEnteredValue": "已達成"}]}, "showCustomUi": true, "strict": false}}}
  ]
}' > /dev/null

echo "✓ 下拉選單已建立"
echo ""
echo "=== 完成！==="
echo "表格 URL: https://docs.google.com/spreadsheets/d/$SPREADSHEET_ID"
echo ""
echo "已建立 7 個分頁："
echo "  1. 客戶總表     — 4 個自有品牌已預填"
echo "  2. 技術掃描     — BEFORE 掃描結果已預填"
echo "  3. AI 問答測試   — 含 6 個下拉選單"
echo "  4. AEO 評分     — 技術分+內容分已預填"
echo "  5. 部署記錄     — 現有部署已預填"
echo "  6. 里程碑       — 5 個目標已預設"
echo "  7. 聚合數據     — 初始統計已填入"

# Save spreadsheet ID for future use
echo "$SPREADSHEET_ID" > /Users/ki/Documents/cloudpipe-landing/scripts/.sheet_id
echo ""
echo "Spreadsheet ID 已存到 .sheet_id"
