/**
 * CloudPipe AI — AEO/GEO 生態系追蹤 Google Sheets 自動建立腳本
 *
 * 使用方法：
 * 1. 開 https://script.google.com
 * 2. 建新專案
 * 3. 貼上此代碼
 * 4. 點「執行」> 選 createAEOTrackerSheet
 * 5. 授權後自動建立完整的 7 分頁表格
 */

function createAEOTrackerSheet() {
  const ss = SpreadsheetApp.create("CloudPipe AI — AEO 生態系追蹤");

  // ========== 1. 客戶總表 ==========
  const sheet1 = ss.getSheetByName("Sheet1");
  sheet1.setName("客戶總表");
  const headers1 = [
    "編號", "客戶名稱", "英文名", "行業分類", "Schema 類型",
    "現有網站", "CloudPipe URL", "來源渠道", "聯繫人", "電話/微信",
    "登記日期", "上線日期", "授權狀態", "計畫層級", "AEO BEFORE 分",
    "AEO AFTER 7天", "AEO AFTER 30天", "AEO AFTER 90天", "備註"
  ];
  sheet1.getRange(1, 1, 1, headers1.length).setValues([headers1]);
  sheet1.getRange(1, 1, 1, headers1.length)
    .setBackground("#1a1a2e")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet1.setFrozenRows(1);

  // Pre-fill 4 owned brands
  const brands = [
    ["S001", "稻荷環球食品", "Inari Global Foods", "食品貿易", "Organization",
     "https://inari-global-foods.vercel.app", "", "自有品牌", "Joe", "",
     "2026-03-07", "", "已授權", "free", "", "", "", "", "海膽進口"],
    ["S002", "海膽速遞", "Sea Urchin Express", "食品零售/配送", "Organization",
     "https://sea-urchin-delivery.vercel.app", "", "自有品牌", "Joe", "",
     "2026-03-07", "", "已授權", "free", "", "", "", "", "海膽外送"],
    ["S003", "山中田", "Yamanakada", "科技顧問", "Organization",
     "https://yamanakada.vercel.app", "", "自有品牌", "Joe", "",
     "2026-03-07", "", "已授權", "free", "", "", "", "", "AI 科技顧問"],
    ["S004", "After School Coffee", "After School Coffee", "咖啡", "CafeOrCoffeeShop",
     "https://after-school-coffee.vercel.app", "", "自有品牌", "Joe", "",
     "2026-03-07", "", "已授權", "free", "", "", "", "", "學生咖啡店"],
  ];
  sheet1.getRange(2, 1, brands.length, brands[0].length).setValues(brands);
  sheet1.autoResizeColumns(1, headers1.length);

  // ========== 2. 技術掃描 ==========
  const sheet2 = ss.insertSheet("技術掃描");
  const headers2 = [
    "客戶編號", "掃描日期", "掃描類型", "llms.txt", "llms-full.txt",
    "Schema.org 類型", "Schema 完整度", "Open Graph", "SSR 可抓取",
    "多語言-英文", "多語言-葡文", "FAQ 結構", "FAQ 題數",
    "Sitemap.xml", "Sitemap URL數", "robots.txt AI友善",
    "AI 爬蟲數", "security.txt", "知識圖譜連結數",
    "技術總分 (/30)", "備註"
  ];
  sheet2.getRange(1, 1, 1, headers2.length).setValues([headers2]);
  sheet2.getRange(1, 1, 1, headers2.length)
    .setBackground("#16213e")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet2.setFrozenRows(1);

  // Pre-fill current technical scan results
  const techScans = [
    ["S001", "2026-03-07", "BEFORE", "✓", "✗", "Organization+FAQ", "95%", "✓ 完整",
     "✓", "弱", "✗", "✓", "6", "✓", "2", "✓", "13", "✓", "4", "26", ""],
    ["S002", "2026-03-07", "BEFORE", "✓", "✗", "Organization+FAQ", "95%", "✓ 完整",
     "✓", "弱", "✗", "✓", "5", "✓", "3", "✓", "11", "✗", "4", "26", "缺 security.txt"],
    ["S003", "2026-03-07", "BEFORE", "✓", "✗", "Org+Website+FAQ", "90%", "✓ 完整",
     "⚠ JS混合", "弱", "✗", "✓", "7", "✓", "5", "✓", "12", "✓", "0", "26", "sameAs 空"],
    ["S004", "2026-03-07", "BEFORE", "✓", "✗", "CafeOrCoffeeShop+FAQ", "95%", "✓ 完整",
     "✓", "弱", "✗", "✓", "6", "✓", "2", "✓", "11", "✗", "4", "26", "缺 security.txt"],
  ];
  sheet2.getRange(2, 1, techScans.length, techScans[0].length).setValues(techScans);
  sheet2.autoResizeColumns(1, headers2.length);

  // ========== 3. AI 問答測試 ==========
  const sheet3 = ss.insertSheet("AI 問答測試");
  const headers3 = [
    "客戶編號", "測試類型", "測試日期", "查詢編號", "查詢原文",
    "平台", "品牌是否出現", "出現位置", "資訊準確度", "情感傾向",
    "回答摘要", "截圖文件名", "備註"
  ];
  sheet3.getRange(1, 1, 1, headers3.length).setValues([headers3]);
  sheet3.getRange(1, 1, 1, headers3.length)
    .setBackground("#0f3460")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet3.setFrozenRows(1);

  // Add data validation for platforms
  const platformRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["ChatGPT", "Claude", "Gemini", "Perplexity"], true)
    .build();
  sheet3.getRange(2, 6, 500, 1).setDataValidation(platformRule);

  // Add data validation for 品牌是否出現
  const appearRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["是", "否"], true)
    .build();
  sheet3.getRange(2, 7, 500, 1).setDataValidation(appearRule);

  // Add data validation for 出現位置
  const posRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["第1位", "第2位", "第3位", "更後", "未出現"], true)
    .build();
  sheet3.getRange(2, 8, 500, 1).setDataValidation(posRule);

  // Add data validation for accuracy
  const accRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["準確", "部分準確", "不準確", "未提及"], true)
    .build();
  sheet3.getRange(2, 9, 500, 1).setDataValidation(accRule);

  // Add data validation for sentiment
  const sentRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["正面", "中性", "負面", "未提及"], true)
    .build();
  sheet3.getRange(2, 10, 500, 1).setDataValidation(sentRule);

  // Add data validation for test type
  const testTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["BEFORE", "AFTER-7天", "AFTER-30天", "AFTER-90天", "月度追蹤"], true)
    .build();
  sheet3.getRange(2, 2, 500, 1).setDataValidation(testTypeRule);

  sheet3.autoResizeColumns(1, headers3.length);

  // ========== 4. AEO 評分 ==========
  const sheet4 = ss.insertSheet("AEO 評分");
  const headers4 = [
    "客戶編號", "客戶名稱", "評分日期", "評分類型",
    "技術分 (/30)", "— llms.txt (+5)", "— Schema (+8)", "— OG (+4)",
    "— SSR (+5)", "— 英文 (+4)", "— 葡文 (+2)", "— robots.txt (+2)",
    "AI問答分 (/50)", "— 出現率 (×30)", "— 位置分 (+10)", "— 準確度 (+10)",
    "內容分 (/20)", "— 深度>1000字 (+8)", "— FAQ結構 (+6)", "— 定期更新 (+6)",
    "AEO 總分 (/100)", "等級", "備註"
  ];
  sheet4.getRange(1, 1, 1, headers4.length).setValues([headers4]);
  sheet4.getRange(1, 1, 1, headers4.length)
    .setBackground("#533483")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet4.setFrozenRows(1);

  // Pre-fill technical scores (AI問答分 pending BEFORE test)
  const scores = [
    ["S001", "稻荷環球食品", "2026-03-07", "BEFORE (技術)",
     "26", "5", "8", "4", "5", "0", "0", "2",
     "", "", "", "",
     "20", "8", "6", "6",
     "", "", "AI問答分待 BEFORE 測試"],
    ["S002", "海膽速遞", "2026-03-07", "BEFORE (技術)",
     "26", "5", "8", "4", "5", "0", "0", "2",
     "", "", "", "",
     "20", "8", "6", "6",
     "", "", "AI問答分待 BEFORE 測試"],
    ["S003", "山中田", "2026-03-07", "BEFORE (技術)",
     "26", "5", "8", "4", "5", "0", "0", "2",
     "", "", "", "",
     "20", "8", "6", "6",
     "", "", "AI問答分待 BEFORE 測試"],
    ["S004", "After School Coffee", "2026-03-07", "BEFORE (技術)",
     "26", "5", "8", "4", "5", "0", "0", "2",
     "", "", "", "",
     "20", "8", "6", "6",
     "", "", "AI問答分待 BEFORE 測試"],
  ];
  sheet4.getRange(2, 1, scores.length, scores[0].length).setValues(scores);
  sheet4.autoResizeColumns(1, headers4.length);

  // ========== 5. 部署記錄 ==========
  const sheet5 = ss.insertSheet("部署記錄");
  const headers5 = [
    "客戶編號", "上線 URL", "部署日期", "模板版本", "Schema 類型",
    "llms.txt 路徑", "llms-full.txt 路徑", "內容頁數", "中文字數", "英文字數",
    "Vercel Project", "GitHub Repo", "自訂域名", "知識圖譜已錄入",
    "Cloudflare Worker", "備註"
  ];
  sheet5.getRange(1, 1, 1, headers5.length).setValues([headers5]);
  sheet5.getRange(1, 1, 1, headers5.length)
    .setBackground("#e94560")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet5.setFrozenRows(1);

  // Pre-fill existing deployments
  const deploys = [
    ["S001", "https://inari-global-foods.vercel.app", "2026-03-06", "v0.1", "Organization+FAQ",
     "/llms.txt", "—", "1+articles", "~3500", "~200",
     "inari-global-foods", "—", "—", "✓",
     "client-ai-tracker", "Phase 0 初版"],
    ["S002", "https://sea-urchin-delivery.vercel.app", "2026-03-06", "v0.1", "Organization+FAQ",
     "/llms.txt", "—", "1+articles", "~4500", "~200",
     "sea-urchin-delivery", "—", "—", "✓",
     "client-ai-tracker", "Phase 0 初版"],
    ["S003", "https://yamanakada.vercel.app", "2026-03-07", "v0.1", "Organization+FAQ+WebSite",
     "/llms.txt", "—", "1+articles", "~2500", "~200",
     "yamanakada", "—", "—", "✓",
     "client-ai-tracker", "Phase 0 初版"],
    ["S004", "https://after-school-coffee.vercel.app", "2026-03-06", "v0.1", "CafeOrCoffeeShop+FAQ",
     "/llms.txt", "—", "1", "~4000", "~100",
     "after-school-coffee", "—", "—", "✓",
     "client-ai-tracker", "Phase 0 初版"],
  ];
  sheet5.getRange(2, 1, deploys.length, deploys[0].length).setValues(deploys);
  sheet5.autoResizeColumns(1, headers5.length);

  // ========== 6. 里程碑 ==========
  const sheet6 = ss.insertSheet("里程碑");
  const headers6 = [
    "日期", "里程碑類型", "觸發條件", "描述", "證據附件路徑",
    "後續動作", "狀態"
  ];
  sheet6.getRange(1, 1, 1, headers6.length).setValues([headers6]);
  sheet6.getRange(1, 1, 1, headers6.length)
    .setBackground("#2b2d42")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet6.setFrozenRows(1);

  // Add milestone validation
  const milestoneRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      "Phase 0 完成", "10站達標", "30站達標", "50站達標", "100站達標",
      "首個付費客戶", "首次政府接觸", "AI 引用事件", "其他"
    ], true).build();
  sheet6.getRange(2, 2, 100, 1).setDataValidation(milestoneRule);

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["待達成", "已達成", "進行中"], true)
    .build();
  sheet6.getRange(2, 7, 100, 1).setDataValidation(statusRule);

  // Pre-fill milestone targets
  const milestones = [
    ["", "Phase 0 完成", "4 個自有品牌全部上線", "待達成：建 AEO 達標版", "", "製作示範案例集", "進行中"],
    ["", "10站達標", "累計 10 個百科頁面", "", "", "計算平均 AEO 提升", "待達成"],
    ["", "30站達標", "累計 30 個百科頁面", "", "", "生成澳門 AI 可見性指數 v0.1", "待達成"],
    ["", "首次政府接觸", "任何正式/非正式接觸", "", "", "記錄反饋+後續動作", "待達成"],
    ["", "AI 引用事件", "AI 回答明確引用知識圖譜", "", "", "截圖+時間戳", "待達成"],
  ];
  sheet6.getRange(2, 1, milestones.length, milestones[0].length).setValues(milestones);
  sheet6.autoResizeColumns(1, headers6.length);

  // ========== 7. 聚合數據 ==========
  const sheet7 = ss.insertSheet("聚合數據");
  const headers7 = [
    "統計日期", "總站數", "活躍站數", "平均 AEO 分",
    "平均技術分", "平均 AI問答分", "平均內容分",
    "品牌平均出現率", "行業分佈", "知識圖譜覆蓋率",
    "本月新增站數", "本月 AEO 提升 (平均)", "備註"
  ];
  sheet7.getRange(1, 1, 1, headers7.length).setValues([headers7]);
  sheet7.getRange(1, 1, 1, headers7.length)
    .setBackground("#0a1931")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet7.setFrozenRows(1);

  // Initial aggregate entry
  const agg = [
    ["2026-03-07", "4", "4", "—",
     "26/30", "—", "20/20",
     "—", "食品:2, 科技:1, 咖啡:1", "4/4 互聯",
     "4", "—", "Phase 0 啟動，AI問答分待測"]
  ];
  sheet7.getRange(2, 1, 1, agg[0].length).setValues(agg);
  sheet7.autoResizeColumns(1, headers7.length);

  // ========== Dashboard formatting ==========
  // Set tab colors
  sheet1.setTabColor("#39d2c0"); // 客戶總表 - teal
  sheet2.setTabColor("#3fb950"); // 技術掃描 - green
  sheet3.setTabColor("#58a6ff"); // AI 問答測試 - blue
  sheet4.setTabColor("#bc8cff"); // AEO 評分 - purple
  sheet5.setTabColor("#f85149"); // 部署記錄 - red
  sheet6.setTabColor("#d29922"); // 里程碑 - gold
  sheet7.setTabColor("#f0883e"); // 聚合數據 - orange

  Logger.log("AEO 追蹤表格已建立: " + ss.getUrl());
  SpreadsheetApp.getUi().alert(
    "CloudPipe AI AEO 追蹤表格建立完成！\n\n" +
    "已建立 7 個分頁：\n" +
    "1. 客戶總表（已預填 4 個自有品牌）\n" +
    "2. 技術掃描（已預填掃描結果）\n" +
    "3. AI 問答測試（含下拉選單）\n" +
    "4. AEO 評分（已預填技術分）\n" +
    "5. 部署記錄（已預填現有部署）\n" +
    "6. 里程碑（已預填目標）\n" +
    "7. 聚合數據\n\n" +
    "表格 URL: " + ss.getUrl()
  );

  return ss.getUrl();
}
