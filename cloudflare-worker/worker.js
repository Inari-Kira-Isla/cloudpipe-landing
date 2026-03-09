// ============================================
// CloudPipe AI Footprint Tracker
// Cloudflare Worker — Proxy to Vercel
// ============================================

const VERCEL_URL = "https://cloudpipe-landing.vercel.app";

const AI_BOTS = {
  "GPTBot": "OpenAI GPT",
  "ChatGPT-User": "ChatGPT Browser",
  "OAI-SearchBot": "OpenAI Search",
  "anthropic-ai": "Anthropic Claude",
  "ClaudeBot": "Claude Crawler",
  "claude-web": "Claude Web",
  "PerplexityBot": "Perplexity AI",
  "Google-Extended": "Google Gemini Training",
  "Googlebot": "Google Search",
  "Bingbot": "Microsoft Bing AI",
  "CCBot": "Common Crawl",
  "Bytespider": "ByteDance AI",
  "YouBot": "You.com AI",
  "cohere-ai": "Cohere AI",
  "Applebot": "Apple AI",
  "meta-externalagent": "Meta AI",
  "FacebookBot": "Meta AI Bot",
  "ia_archiver": "Internet Archive",
};

function detectAIBot(userAgent) {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  for (const [pattern, name] of Object.entries(AI_BOTS)) {
    if (ua.includes(pattern.toLowerCase())) {
      return { pattern, name };
    }
  }
  return null;
}

async function logAIVisit(env, botInfo, request) {
  const today = new Date().toISOString().split("T")[0];
  const url = new URL(request.url);

  // Increment daily counter
  const dayKey = `day:${today}:${botInfo.pattern}`;
  const current = parseInt((await env.AI_FOOTPRINT.get(dayKey)) || "0");
  await env.AI_FOOTPRINT.put(dayKey, String(current + 1), { expirationTtl: 30 * 86400 });

  // Store visit log
  const logKey = `log:${today}`;
  const existing = JSON.parse((await env.AI_FOOTPRINT.get(logKey)) || "[]");
  existing.push({
    ts: Date.now(),
    bot: botInfo.name,
    ua: (request.headers.get("user-agent") || "").substring(0, 100),
    path: url.pathname,
    ref: request.headers.get("referer") || "",
  });
  if (existing.length > 500) existing.shift();
  await env.AI_FOOTPRINT.put(logKey, JSON.stringify(existing), { expirationTtl: 30 * 86400 });

  // Update total counter
  const totalKey = `total:${botInfo.pattern}`;
  const total = parseInt((await env.AI_FOOTPRINT.get(totalKey)) || "0");
  await env.AI_FOOTPRINT.put(totalKey, String(total + 1));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // === AI Stats API endpoint (cached 120s) ===
    if (url.pathname === "/ai-stats.json") {
      const cache = caches.default;
      const cacheKey = new Request(request.url, { method: "GET" });
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      const today = new Date().toISOString().split("T")[0];
      const stats = { today: {}, totals: {}, recentVisits: [], generatedAt: new Date().toISOString() };
      const ch = {"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=120"};
      if (!env.AI_FOOTPRINT) return new Response(JSON.stringify(stats, null, 2), { headers: ch });
      try {
        const entries = Object.entries(AI_BOTS);
        const dayKeys = entries.map(([p]) => `day:${today}:${p}`);
        const totalKeys = entries.map(([p]) => `total:${p}`);
        const results = await Promise.allSettled([...dayKeys, ...totalKeys].map(k => env.AI_FOOTPRINT.get(k)));
        for (let i = 0; i < entries.length; i++) {
          const [, name] = entries[i];
          const dayCount = parseInt((results[i].status==="fulfilled"?results[i].value:null) || "0");
          const total = parseInt((results[i+entries.length].status==="fulfilled"?results[i+entries.length].value:null) || "0");
          if (dayCount > 0) stats.today[name] = dayCount;
          if (total > 0) stats.totals[name] = total;
        }
        try { stats.recentVisits = JSON.parse((await env.AI_FOOTPRINT.get(`log:${today}`)) || "[]").slice(-20); } catch(e) {}
      } catch(e) { stats._error = e.message; }
      const resp = new Response(JSON.stringify(stats, null, 2), { headers: ch });
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }

    // === Proxy to Vercel ===
    const targetUrl = VERCEL_URL + url.pathname + url.search;
    const userAgent = request.headers.get("user-agent") || "";
    const botInfo = detectAIBot(userAgent);

    if (botInfo && env.AI_FOOTPRINT) {
      ctx.waitUntil(logAIVisit(env, botInfo, request));
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        "User-Agent": userAgent,
        "Accept": request.headers.get("accept") || "*/*",
        "Accept-Encoding": request.headers.get("accept-encoding") || "",
      },
    });

    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  },
};
