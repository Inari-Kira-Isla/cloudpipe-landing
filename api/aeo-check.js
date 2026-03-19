// CloudPipe AEO Score Checker — Vercel Edge Function
// Checks a URL for AEO (AI Engine Optimization) readiness

export const config = { runtime: "edge" };

const AI_BOTS = [
  "GPTBot", "ClaudeBot", "anthropic-ai", "PerplexityBot",
  "Google-Extended", "meta-externalagent", "FacebookBot",
  "Applebot-Extended", "CCBot", "Bytespider", "YouBot", "cohere-ai"
];

async function checkURL(targetUrl) {
  const results = {
    url: targetUrl,
    timestamp: new Date().toISOString(),
    checks: {},
    score: 0,
    maxScore: 100,
    grade: "F"
  };

  const origin = new URL(targetUrl).origin;

  // 1. Check robots.txt (15 points)
  try {
    const r = await fetch(origin + "/robots.txt", {
      headers: { "User-Agent": "CloudPipe-AEO-Checker/1.0" },
      signal: AbortSignal.timeout(5000)
    });
    if (r.ok) {
      const text = await r.text();
      const lower = text.toLowerCase();
      const allowedBots = AI_BOTS.filter(b => lower.includes(b.toLowerCase()));
      const hasWildcardAllow = /user-agent:\s*\*[\s\S]*?allow:\s*\//im.test(text);
      const blocksAI = AI_BOTS.some(b => {
        const regex = new RegExp(`user-agent:\\s*${b}[\\s\\S]*?disallow:\\s*\\/`, "im");
        return regex.test(text);
      });

      let score = 0;
      if (hasWildcardAllow && !blocksAI) score += 5;
      score += Math.min(10, Math.round(allowedBots.length / AI_BOTS.length * 10));

      results.checks.robots = {
        exists: true,
        score,
        maxScore: 15,
        allowedBots: allowedBots.length,
        totalBots: AI_BOTS.length,
        blocksAI,
        detail: allowedBots.length >= 8 ? "AI 爬蟲全面開放" :
                allowedBots.length >= 4 ? "部分 AI 爬蟲已允許" :
                hasWildcardAllow ? "通用允許但未明確歡迎 AI" : "需要加入 AI 爬蟲允許規則"
      };
      results.score += score;
    } else {
      results.checks.robots = { exists: false, score: 3, maxScore: 15, detail: "robots.txt 不存在（預設允許所有）" };
      results.score += 3;
    }
  } catch (e) {
    results.checks.robots = { exists: false, score: 0, maxScore: 15, detail: "無法訪問 robots.txt", error: e.message };
  }

  // 2. Check llms.txt (20 points)
  try {
    const r = await fetch(origin + "/llms.txt", {
      headers: { "User-Agent": "CloudPipe-AEO-Checker/1.0" },
      signal: AbortSignal.timeout(5000)
    });
    if (r.ok) {
      const text = await r.text();
      let score = 10; // exists
      if (text.length > 200) score += 3; // substantial content
      if (text.includes("##")) score += 2; // structured with headings
      if (/https?:\/\//.test(text)) score += 2; // contains URLs
      if (/license|授權|cc by/i.test(text)) score += 3; // has license info
      score = Math.min(20, score);

      results.checks.llms = {
        exists: true,
        score,
        maxScore: 20,
        length: text.length,
        detail: score >= 18 ? "完整的 AI 導覽文件" :
                score >= 12 ? "基本 llms.txt 已建立" : "llms.txt 內容需要充實"
      };
      results.score += score;
    } else {
      results.checks.llms = { exists: false, score: 0, maxScore: 20, detail: "未建立 llms.txt — AI 爬蟲無法了解你的網站" };
    }
  } catch (e) {
    results.checks.llms = { exists: false, score: 0, maxScore: 20, detail: "無法訪問 llms.txt", error: e.message };
  }

  // 3. Check HTML content — Schema, SSR, meta tags (40 points)
  try {
    const r = await fetch(targetUrl, {
      headers: { "User-Agent": "CloudPipe-AEO-Checker/1.0" },
      signal: AbortSignal.timeout(8000)
    });
    if (r.ok) {
      const html = await r.text();
      let score = 0;

      // Schema.org (10 pts)
      const hasSchema = html.includes("application/ld+json");
      const schemaCount = (html.match(/application\/ld\+json/g) || []).length;
      if (hasSchema) {
        score += Math.min(10, 5 + schemaCount * 2);
      }
      results.checks.schema = {
        exists: hasSchema,
        count: schemaCount,
        score: Math.min(10, hasSchema ? 5 + schemaCount * 2 : 0),
        maxScore: 10,
        detail: schemaCount >= 3 ? "豐富的結構化數據" :
                schemaCount >= 1 ? "基本 Schema 已建立" : "缺少 Schema.org 結構化數據"
      };

      // SSR Content (10 pts)
      const textContent = html.replace(/<script[\s\S]*?<\/script>/gi, "")
                              .replace(/<style[\s\S]*?<\/style>/gi, "")
                              .replace(/<[^>]+>/g, " ")
                              .replace(/\s+/g, " ").trim();
      const wordCount = textContent.length;
      const isSSR = wordCount > 500;
      const ssrScore = wordCount > 3000 ? 10 : wordCount > 1000 ? 7 : wordCount > 500 ? 4 : 1;
      score += ssrScore;
      results.checks.ssr = {
        isSSR,
        contentLength: wordCount,
        score: ssrScore,
        maxScore: 10,
        detail: wordCount > 3000 ? "內容豐富，AI 爬蟲可完整讀取" :
                wordCount > 1000 ? "基本內容可讀" :
                wordCount > 500 ? "內容偏少，建議擴充" : "內容極少或依賴 JS 渲染 — AI 爬蟲可能看不到"
      };

      // Meta tags (10 pts)
      let metaScore = 0;
      if (/<meta[^>]+description/i.test(html)) metaScore += 2;
      if (/<meta[^>]+og:title/i.test(html)) metaScore += 2;
      if (/<link[^>]+canonical/i.test(html)) metaScore += 2;
      if (/rel=["']llms-txt["']/i.test(html)) metaScore += 2;
      if (/<meta[^>]+robots/i.test(html)) metaScore += 2;
      score += metaScore;
      results.checks.meta = {
        score: metaScore,
        maxScore: 10,
        hasDescription: /<meta[^>]+description/i.test(html),
        hasOG: /<meta[^>]+og:title/i.test(html),
        hasCanonical: /<link[^>]+canonical/i.test(html),
        hasLlmsTxtLink: /rel=["']llms-txt["']/i.test(html),
        hasRobotsTag: /<meta[^>]+robots/i.test(html),
        detail: metaScore >= 8 ? "Meta 標籤完整" :
                metaScore >= 4 ? "部分 Meta 標籤已設定" : "缺少關鍵 Meta 標籤"
      };

      // Semantic HTML (5 pts)
      let semScore = 0;
      if (/<h1/i.test(html)) semScore += 1;
      if (/<h2/i.test(html)) semScore += 1;
      if (/<h3/i.test(html)) semScore += 1;
      if (/<(article|section|main|nav)/i.test(html)) semScore += 1;
      if (/<address/i.test(html)) semScore += 1;
      score += semScore;
      results.checks.semantic = {
        score: semScore,
        maxScore: 5,
        detail: semScore >= 4 ? "語義化 HTML 結構良好" :
                semScore >= 2 ? "基本語義結構" : "缺少語義化標籤"
      };

      // FAQ Structure (5 pts)
      const hasFAQ = /FAQPage/i.test(html);
      const faqScore = hasFAQ ? 5 : 0;
      score += faqScore;
      results.checks.faq = {
        exists: hasFAQ,
        score: faqScore,
        maxScore: 5,
        detail: hasFAQ ? "FAQPage 結構已建立" : "缺少 FAQ 結構化數據"
      };

      results.score += score;
    }
  } catch (e) {
    results.checks.html = { error: true, detail: "無法訪問頁面: " + e.message };
  }

  // 4. Check sitemap.xml (10 points)
  try {
    const r = await fetch(origin + "/sitemap.xml", {
      headers: { "User-Agent": "CloudPipe-AEO-Checker/1.0" },
      signal: AbortSignal.timeout(5000)
    });
    if (r.ok) {
      const text = await r.text();
      const urlCount = (text.match(/<loc>/g) || []).length;
      const hasLlms = text.includes("llms.txt");
      let score = 5;
      if (urlCount >= 3) score += 2;
      if (hasLlms) score += 3;
      score = Math.min(10, score);

      results.checks.sitemap = {
        exists: true,
        score,
        maxScore: 10,
        urlCount,
        includesLlms: hasLlms,
        detail: score >= 8 ? "Sitemap 完整且包含 llms.txt" :
                score >= 5 ? "基本 Sitemap 已建立" : "Sitemap 需要優化"
      };
      results.score += score;
    } else {
      results.checks.sitemap = { exists: false, score: 0, maxScore: 10, detail: "未建立 sitemap.xml" };
    }
  } catch (e) {
    results.checks.sitemap = { exists: false, score: 0, maxScore: 10, detail: "無法訪問 sitemap.xml", error: e.message };
  }

  // Calculate grade
  const pct = results.score / results.maxScore * 100;
  if (pct >= 90) results.grade = "A+";
  else if (pct >= 80) results.grade = "A";
  else if (pct >= 70) results.grade = "B+";
  else if (pct >= 60) results.grade = "B";
  else if (pct >= 50) results.grade = "C";
  else if (pct >= 35) results.grade = "D";
  else results.grade = "F";

  results.recommendations = [];
  if (!results.checks.llms?.exists) results.recommendations.push("建立 llms.txt 文件 — 讓 AI 了解你的品牌");
  if ((results.checks.robots?.allowedBots || 0) < 4) results.recommendations.push("在 robots.txt 明確允許 AI 爬蟲");
  if (!results.checks.schema?.exists) results.recommendations.push("加入 Schema.org JSON-LD 結構化數據");
  if ((results.checks.ssr?.contentLength || 0) < 1000) results.recommendations.push("增加頁面內容量（建議 2,900+ 字）");
  if (!results.checks.meta?.hasLlmsTxtLink) results.recommendations.push("在 <head> 加入 <link rel=\"llms-txt\">");
  if (!results.checks.faq?.exists) results.recommendations.push("加入 FAQPage Schema 結構");
  if (!results.checks.sitemap?.includesLlms) results.recommendations.push("在 sitemap.xml 加入 llms.txt URL");

  return results;
}

export default async function handler(request) {
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  const targetUrl = url.searchParams.get("url");
  if (!targetUrl) {
    return new Response(JSON.stringify({
      service: "CloudPipe AEO Score Checker",
      version: "1.0",
      usage: "GET /api/aeo-check?url=https://example.com",
      description: "檢測網站的 AEO（AI Engine Optimization）就緒程度",
      parameters: {
        url: "(必填) 要檢測的完整網址，例如 https://example.com"
      },
      checks: [
        "robots.txt AI 爬蟲開放 (15分)",
        "llms.txt AI 導覽文件 (20分)",
        "Schema.org 結構化數據 (10分)",
        "SSR 伺服器端渲染 (10分)",
        "Meta 標籤完整性 (10分)",
        "語義化 HTML (5分)",
        "FAQ 結構化數據 (5分)",
        "Sitemap 完整性 (10分)"
      ],
      tool: "https://cloudpipe-landing.vercel.app/aeo-score.html"
    }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  // Validate URL
  try {
    new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const results = await checkURL(targetUrl);
    return new Response(JSON.stringify(results, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Check failed: " + e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
