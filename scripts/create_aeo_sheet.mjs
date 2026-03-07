/**
 * CloudPipe AI — AEO 追蹤 Google Sheets 建立腳本
 * 使用 OAuth2 + REST API (不依賴 googleapis 庫)
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const CLIENT_ID = '764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com';
const CLIENT_SECRET = 'd-FL95Q19q7MQmFpd7hHD0Ty';
const REDIRECT_URI = 'http://localhost:3847';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

function apiRequest(method, url, token, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getAuthToken() {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=${encodeURIComponent(SCOPES)}&response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:3847`);
      const code = url.searchParams.get('code');
      if (!code) { res.writeHead(200); res.end('Waiting...'); return; }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>授權成功！可以關閉此頁面。</h1>');
      server.close();

      // Exchange code for token
      const tokenData = `code=${encodeURIComponent(code)}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&grant_type=authorization_code`;
      const tokenRes = await new Promise((res2, rej2) => {
        const r = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, resp => {
          let d = ''; resp.on('data', c => d += c); resp.on('end', () => res2(JSON.parse(d)));
        });
        r.on('error', rej2);
        r.write(tokenData);
        r.end();
      });

      if (tokenRes.access_token) {
        resolve(tokenRes.access_token);
      } else {
        reject(new Error('Token exchange failed: ' + JSON.stringify(tokenRes)));
      }
    });

    server.listen(3847, () => {
      console.log('Opening browser for auth...');
      try { execSync(`open "${authUrl}"`, { stdio: 'ignore' }); } catch {}
      console.log('\n如瀏覽器未自動打開，請手動打開：\n' + authUrl + '\n');
    });

    setTimeout(() => { server.close(); reject(new Error('Auth timeout')); }, 300000);
  });
}

async function main() {
  const token = await getAuthToken();
  console.log('Authenticated! Creating spreadsheet...');

  const API = 'https://sheets.googleapis.com/v4/spreadsheets';

  // Step 1: Create spreadsheet
  const sheet = await apiRequest('POST', API, token, {
    properties: { title: 'CloudPipe AI — AEO 生態系追蹤', locale: 'zh_TW' },
    sheets: [
      { properties: { title: '客戶總表', sheetId: 0, tabColorStyle: { rgbColor: { red: 0.22, green: 0.82, blue: 0.75 } } } },
      { properties: { title: '技術掃描', sheetId: 1, tabColorStyle: { rgbColor: { red: 0.25, green: 0.73, blue: 0.31 } } } },
      { properties: { title: 'AI 問答測試', sheetId: 2, tabColorStyle: { rgbColor: { red: 0.35, green: 0.65, blue: 1.0 } } } },
      { properties: { title: 'AEO 評分', sheetId: 3, tabColorStyle: { rgbColor: { red: 0.74, green: 0.55, blue: 1.0 } } } },
      { properties: { title: '部署記錄', sheetId: 4, tabColorStyle: { rgbColor: { red: 0.97, green: 0.32, blue: 0.37 } } } },
      { properties: { title: '里程碑', sheetId: 5, tabColorStyle: { rgbColor: { red: 0.82, green: 0.6, blue: 0.13 } } } },
      { properties: { title: '聚合數據', sheetId: 6, tabColorStyle: { rgbColor: { red: 0.94, green: 0.53, blue: 0.24 } } } },
    ],
  });

  if (sheet.error) {
    console.error('Create failed:', JSON.stringify(sheet.error, null, 2));
    process.exit(1);
  }

  const id = sheet.spreadsheetId;
  const url = sheet.spreadsheetUrl;
  console.log(`Created: ${url}`);

  // Step 2: Fill data
  await apiRequest('POST', `${API}/${id}/values:batchUpdate`, token, {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: '客戶總表!A1:S5',
        values: [
          ['編號','客戶名稱','英文名','行業分類','Schema 類型','現有網站','CloudPipe URL','來源渠道','聯繫人','電話/微信','登記日期','上線日期','授權狀態','計畫層級','AEO BEFORE 分','AEO AFTER 7天','AEO AFTER 30天','AEO AFTER 90天','備註'],
          ['S001','稻荷環球食品','Inari Global Foods','食品貿易','Organization','https://inari-global-foods.vercel.app','','自有品牌','Joe','','2026-03-07','','已授權','free','','','','','海膽進口'],
          ['S002','海膽速遞','Sea Urchin Express','食品零售/配送','Organization','https://sea-urchin-delivery.vercel.app','','自有品牌','Joe','','2026-03-07','','已授權','free','','','','','海膽外送'],
          ['S003','山中田','Yamanakada','科技顧問','Organization','https://yamanakada.vercel.app','','自有品牌','Joe','','2026-03-07','','已授權','free','','','','','AI 科技顧問'],
          ['S004','After School Coffee','After School Coffee','咖啡','CafeOrCoffeeShop','https://after-school-coffee.vercel.app','','自有品牌','Joe','','2026-03-07','','已授權','free','','','','','學生咖啡店'],
        ],
      },
      {
        range: '技術掃描!A1:U5',
        values: [
          ['客戶編號','掃描日期','掃描類型','llms.txt','llms-full.txt','Schema.org 類型','Schema 完整度','Open Graph','SSR 可抓取','多語言-英文','多語言-葡文','FAQ 結構','FAQ 題數','Sitemap.xml','Sitemap URL數','robots.txt AI友善','AI 爬蟲數','security.txt','知識圖譜連結數','技術總分 (/30)','備註'],
          ['S001','2026-03-07','BEFORE','✓','✗','Organization+FAQ','95%','✓ 完整','✓','弱','✗','✓','6','✓','2','✓','13','✓','4','26',''],
          ['S002','2026-03-07','BEFORE','✓','✗','Organization+FAQ','95%','✓ 完整','✓','弱','✗','✓','5','✓','3','✓','11','✗','4','26','缺 security.txt'],
          ['S003','2026-03-07','BEFORE','✓','✗','Org+Website+FAQ','90%','✓ 完整','⚠ JS混合','弱','✗','✓','7','✓','5','✓','12','✓','0','26','sameAs 空'],
          ['S004','2026-03-07','BEFORE','✓','✗','CafeOrCoffeeShop+FAQ','95%','✓ 完整','✓','弱','✗','✓','6','✓','2','✓','11','✗','4','26','缺 security.txt'],
        ],
      },
      {
        range: 'AI 問答測試!A1:M1',
        values: [['客戶編號','測試類型','測試日期','查詢編號','查詢原文','平台','品牌是否出現','出現位置','資訊準確度','情感傾向','回答摘要','截圖文件名','備註']],
      },
      {
        range: 'AEO 評分!A1:W5',
        values: [
          ['客戶編號','客戶名稱','評分日期','評分類型','技術分 (/30)','— llms.txt (+5)','— Schema (+8)','— OG (+4)','— SSR (+5)','— 英文 (+4)','— 葡文 (+2)','— robots.txt (+2)','AI問答分 (/50)','— 出現率 (×30)','— 位置分 (+10)','— 準確度 (+10)','內容分 (/20)','— 深度>1000字 (+8)','— FAQ結構 (+6)','— 定期更新 (+6)','AEO 總分 (/100)','等級','備註'],
          ['S001','稻荷環球食品','2026-03-07','BEFORE (技術)','26','5','8','4','5','0','0','2','','','','','20','8','6','6','','','AI問答分待 BEFORE 測試'],
          ['S002','海膽速遞','2026-03-07','BEFORE (技術)','26','5','8','4','5','0','0','2','','','','','20','8','6','6','','','AI問答分待 BEFORE 測試'],
          ['S003','山中田','2026-03-07','BEFORE (技術)','26','5','8','4','5','0','0','2','','','','','20','8','6','6','','','AI問答分待 BEFORE 測試'],
          ['S004','After School Coffee','2026-03-07','BEFORE (技術)','26','5','8','4','5','0','0','2','','','','','20','8','6','6','','','AI問答分待 BEFORE 測試'],
        ],
      },
      {
        range: '部署記錄!A1:P5',
        values: [
          ['客戶編號','上線 URL','部署日期','模板版本','Schema 類型','llms.txt 路徑','llms-full.txt 路徑','內容頁數','中文字數','英文字數','Vercel Project','GitHub Repo','自訂域名','知識圖譜已錄入','Cloudflare Worker','備註'],
          ['S001','https://inari-global-foods.vercel.app','2026-03-06','v0.1','Organization+FAQ','/llms.txt','—','1+articles','~3500','~200','inari-global-foods','—','—','✓','client-ai-tracker','Phase 0 初版'],
          ['S002','https://sea-urchin-delivery.vercel.app','2026-03-06','v0.1','Organization+FAQ','/llms.txt','—','1+articles','~4500','~200','sea-urchin-delivery','—','—','✓','client-ai-tracker','Phase 0 初版'],
          ['S003','https://yamanakada.vercel.app','2026-03-07','v0.1','Org+Website+FAQ','/llms.txt','—','1+articles','~2500','~200','yamanakada','—','—','✓','client-ai-tracker','Phase 0 初版'],
          ['S004','https://after-school-coffee.vercel.app','2026-03-06','v0.1','CafeOrCoffeeShop+FAQ','/llms.txt','—','1','~4000','~100','after-school-coffee','—','—','✓','client-ai-tracker','Phase 0 初版'],
        ],
      },
      {
        range: '里程碑!A1:G6',
        values: [
          ['日期','里程碑類型','觸發條件','描述','證據附件路徑','後續動作','狀態'],
          ['','Phase 0 完成','4 個自有品牌全部上線','待達成：建 AEO 達標版','','製作示範案例集','進行中'],
          ['','10站達標','累計 10 個百科頁面','','','計算平均 AEO 提升','待達成'],
          ['','30站達標','累計 30 個百科頁面','','','生成澳門 AI 可見性指數 v0.1','待達成'],
          ['','首次政府接觸','任何正式/非正式接觸','','','記錄反饋+後續動作','待達成'],
          ['','AI 引用事件','AI 回答明確引用知識圖譜','','','截圖+時間戳','待達成'],
        ],
      },
      {
        range: '聚合數據!A1:M2',
        values: [
          ['統計日期','總站數','活躍站數','平均 AEO 分','平均技術分','平均 AI問答分','平均內容分','品牌平均出現率','行業分佈','知識圖譜覆蓋率','本月新增站數','本月 AEO 提升 (平均)','備註'],
          ['2026-03-07','4','4','—','26/30','—','20/20','—','食品:2, 科技:1, 咖啡:1','4/4 互聯','4','—','Phase 0 啟動，AI問答分待測'],
        ],
      },
    ],
  });
  console.log('Data filled.');

  // Step 3: Format + freeze + validation
  await apiRequest('POST', `${API}/${id}:batchUpdate`, token, {
    requests: [
      ...[{id:0,r:0.10,g:0.10,b:0.18},{id:1,r:0.09,g:0.13,b:0.24},{id:2,r:0.06,g:0.20,b:0.38},{id:3,r:0.33,g:0.20,b:0.51},{id:4,r:0.91,g:0.27,b:0.35},{id:5,r:0.17,g:0.18,b:0.26},{id:6,r:0.04,g:0.10,b:0.19}].map(s=>({
        repeatCell:{range:{sheetId:s.id,startRowIndex:0,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:s.r,green:s.g,blue:s.b},textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}
      })),
      ...[0,1,2,3,4,5,6].map(id=>({updateSheetProperties:{properties:{sheetId:id,gridProperties:{frozenRowCount:1}},fields:'gridProperties.frozenRowCount'}})),
      ...[{id:0,e:19},{id:1,e:21},{id:2,e:13},{id:3,e:23},{id:4,e:16},{id:5,e:7},{id:6,e:13}].map(s=>({autoResizeDimensions:{dimensions:{sheetId:s.id,dimension:'COLUMNS',startIndex:0,endIndex:s.e}}})),
      {setDataValidation:{range:{sheetId:2,startRowIndex:1,endRowIndex:501,startColumnIndex:1,endColumnIndex:2},rule:{condition:{type:'ONE_OF_LIST',values:[{userEnteredValue:'BEFORE'},{userEnteredValue:'AFTER-7天'},{userEnteredValue:'AFTER-30天'},{userEnteredValue:'AFTER-90天'},{userEnteredValue:'月度追蹤'}]},showCustomUi:true,strict:false}}},
      {setDataValidation:{range:{sheetId:2,startRowIndex:1,endRowIndex:501,startColumnIndex:5,endColumnIndex:6},rule:{condition:{type:'ONE_OF_LIST',values:[{userEnteredValue:'ChatGPT'},{userEnteredValue:'Claude'},{userEnteredValue:'Gemini'},{userEnteredValue:'Perplexity'}]},showCustomUi:true,strict:false}}},
      {setDataValidation:{range:{sheetId:2,startRowIndex:1,endRowIndex:501,startColumnIndex:6,endColumnIndex:7},rule:{condition:{type:'ONE_OF_LIST',values:[{userEnteredValue:'是'},{userEnteredValue:'否'}]},showCustomUi:true,strict:false}}},
      {setDataValidation:{range:{sheetId:2,startRowIndex:1,endRowIndex:501,startColumnIndex:7,endColumnIndex:8},rule:{condition:{type:'ONE_OF_LIST',values:[{userEnteredValue:'第1位'},{userEnteredValue:'第2位'},{userEnteredValue:'第3位'},{userEnteredValue:'更後'},{userEnteredValue:'未出現'}]},showCustomUi:true,strict:false}}},
      {setDataValidation:{range:{sheetId:2,startRowIndex:1,endRowIndex:501,startColumnIndex:8,endColumnIndex:9},rule:{condition:{type:'ONE_OF_LIST',values:[{userEnteredValue:'準確'},{userEnteredValue:'部分準確'},{userEnteredValue:'不準確'},{userEnteredValue:'未提及'}]},showCustomUi:true,strict:false}}},
      {setDataValidation:{range:{sheetId:2,startRowIndex:1,endRowIndex:501,startColumnIndex:9,endColumnIndex:10},rule:{condition:{type:'ONE_OF_LIST',values:[{userEnteredValue:'正面'},{userEnteredValue:'中性'},{userEnteredValue:'負面'},{userEnteredValue:'未提及'}]},showCustomUi:true,strict:false}}},
      {setDataValidation:{range:{sheetId:5,startRowIndex:1,endRowIndex:101,startColumnIndex:6,endColumnIndex:7},rule:{condition:{type:'ONE_OF_LIST',values:[{userEnteredValue:'待達成'},{userEnteredValue:'進行中'},{userEnteredValue:'已達成'}]},showCustomUi:true,strict:false}}},
    ],
  });

  console.log('\n=== 完成！===');
  console.log(`\nURL: ${url}`);
  console.log(`ID: ${id}`);
  console.log('\n已建立 7 個分頁：');
  console.log('  1. 客戶總表     — 4 個自有品牌已預填');
  console.log('  2. 技術掃描     — BEFORE 掃描結果已預填');
  console.log('  3. AI 問答測試   — 含 6 個下拉選單');
  console.log('  4. AEO 評分     — 技術分+內容分已預填');
  console.log('  5. 部署記錄     — 現有部署已預填');
  console.log('  6. 里程碑       — 5 個目標已預設');
  console.log('  7. 聚合數據     — 初始統計已填入');

  fs.writeFileSync('/Users/ki/Documents/cloudpipe-landing/scripts/.sheet_id', id);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
