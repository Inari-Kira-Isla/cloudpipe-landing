// ============================================
// CloudPipe Client Sites AI Tracker
// Multi-tenant Cloudflare Worker
// Tracks AI bot visits for all client sites
// ============================================

const CLIENT_SITES = {
  // === 4 品牌站 ===
  "yamanakada":           "https://inari-kira-isla.github.io/yamanakada",
  "inari-global-foods":   "https://inari-kira-isla.github.io/inari-global-foods",
  "after-school-coffee":  "https://inari-kira-isla.github.io/after-school-coffee",
  "sea-urchin-delivery":  "https://inari-kira-isla.github.io/sea-urchin-delivery",
  // === 4 AEO Demo 站 ===
  "aeo-demo-education":   "https://inari-kira-isla.github.io/aeo-demo-education",
  "aeo-demo-finance":     "https://inari-kira-isla.github.io/aeo-demo-finance",
  "aeo-demo-luxury":      "https://inari-kira-isla.github.io/aeo-demo-luxury",
  "aeo-demo-travel-food": "https://inari-kira-isla.github.io/aeo-demo-travel-food",
  // === 澳門百科 ===
  "cloudpipe-macao-app":  "https://cloudpipe-macao-app.vercel.app",
  // === 其他 ===
  "mind-coffee":          "https://mind-coffee.vercel.app",
  "bni-macau":            "https://bni-macau.vercel.app",
  "test-cafe-demo":       "https://test-cafe-demo.vercel.app",
};

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
  // Chinese AI Bots
  "Baiduspider": "Baidu/Ernie AI",
  "Sogou": "Sogou AI",
  "ChatGLM": "ChatGLM/Zhipu AI",
  "360Spider": "360 AI",
  "HunyuanBot": "Tencent Hunyuan",
  "SenseChat": "SenseChat AI",
  "SparkBot": "Spark/iFlytek AI",
  "Kimi": "Kimi/Moonshot AI",
  "Doubao": "Doubao AI",
  "XiaoIce": "XiaoIce AI",
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

// Bot name → owner mapping for Supabase
const BOT_OWNERS = {
  "GPTBot": "OpenAI", "ChatGPT-User": "OpenAI", "OAI-SearchBot": "OpenAI",
  "anthropic-ai": "Anthropic", "ClaudeBot": "Anthropic", "claude-web": "Anthropic",
  "PerplexityBot": "Perplexity", "Google-Extended": "Google", "Googlebot": "Google",
  "Bingbot": "Microsoft", "CCBot": "Common Crawl", "Bytespider": "ByteDance",
  "YouBot": "You.com", "cohere-ai": "Cohere", "Applebot": "Apple",
  "meta-externalagent": "Meta", "FacebookBot": "Meta", "ia_archiver": "Internet Archive",
  // Chinese AI
  "Baiduspider": "Baidu", "Sogou": "Sogou", "ChatGLM": "Zhipu AI",
  "360Spider": "Qihoo 360", "HunyuanBot": "Tencent", "SenseChat": "SenseTime",
  "SparkBot": "iFlytek", "Kimi": "Moonshot AI", "Doubao": "ByteDance", "XiaoIce": "XiaoIce",
};

// Bot region mapping for CN vs International comparison
const BOT_REGIONS = {
  "GPTBot": "International", "ChatGPT-User": "International", "OAI-SearchBot": "International",
  "anthropic-ai": "International", "ClaudeBot": "International", "claude-web": "International",
  "PerplexityBot": "International", "Google-Extended": "International", "Googlebot": "International",
  "Bingbot": "International", "CCBot": "International",
  "YouBot": "International", "cohere-ai": "International", "Applebot": "International",
  "meta-externalagent": "International", "FacebookBot": "International", "ia_archiver": "International",
  // Chinese AI
  "Bytespider": "CN", "Baiduspider": "CN", "Sogou": "CN", "ChatGLM": "CN",
  "360Spider": "CN", "HunyuanBot": "CN", "SenseChat": "CN",
  "SparkBot": "CN", "Kimi": "CN", "Doubao": "CN", "XiaoIce": "CN",
};

async function hashIP(ip) {
  const data = new TextEncoder().encode(ip + "cloudpipe-salt-2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

async function writeToSupabase(env, siteSlug, botInfo, request) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return;
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(`/${siteSlug}`, "") || "/";
    const referer = request.headers.get("referer") || null;
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "0.0.0.0";
    const ipHash = await hashIP(ip);
    const today = new Date().toISOString().split("T")[0];

    // Detect if this is a cross-site visit from the spider web
    let fromSite = null;
    if (referer) {
      for (const slug of Object.keys(CLIENT_SITES)) {
        if (referer.includes(slug) || referer.includes(CLIENT_SITES[slug])) {
          fromSite = slug;
          break;
        }
      }
    }

    const row = {
      bot_name: botInfo.pattern,
      bot_owner: BOT_OWNERS[botInfo.pattern] || "Unknown",
      path: path,
      referer: referer,
      ip_hash: ipHash,
      session_id: `${ipHash}-${botInfo.pattern}-${today}`,
      ua_raw: (request.headers.get("user-agent") || "").substring(0, 500),
      site: siteSlug,
      page_type: fromSite ? "spider-web" : (path === "/" ? "home" : "page"),
      industry: fromSite || null,
      category: null,
    };

    await fetch(`${env.SUPABASE_URL}/rest/v1/crawler_visits`, {
      method: "POST",
      headers: {
        "apikey": env.SUPABASE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(row),
    });
  } catch (e) { /* silently ignore */ }
}

async function logAIVisit(env, siteSlug, botInfo, request) {
  const today = new Date().toISOString().split("T")[0];
  const url = new URL(request.url);
  const prefix = `site:${siteSlug}:`;

  // Increment daily counter
  const dayKey = `${prefix}day:${today}:${botInfo.pattern}`;
  const current = parseInt((await env.AI_FOOTPRINT.get(dayKey)) || "0");
  await env.AI_FOOTPRINT.put(dayKey, String(current + 1), { expirationTtl: 30 * 86400 });

  // Store visit log
  const logKey = `${prefix}log:${today}`;
  const existing = JSON.parse((await env.AI_FOOTPRINT.get(logKey)) || "[]");
  existing.push({
    ts: Date.now(),
    bot: botInfo.name,
    ua: (request.headers.get("user-agent") || "").substring(0, 100),
    path: url.pathname.replace(`/${siteSlug}`, "") || "/",
    ref: request.headers.get("referer") || "",
  });
  if (existing.length > 500) existing.shift();
  await env.AI_FOOTPRINT.put(logKey, JSON.stringify(existing), { expirationTtl: 30 * 86400 });

  // Update total counter
  const totalKey = `${prefix}total:${botInfo.pattern}`;
  const total = parseInt((await env.AI_FOOTPRINT.get(totalKey)) || "0");
  await env.AI_FOOTPRINT.put(totalKey, String(total + 1));

  // 方案 A: Also write to Supabase for cross-site tracking
  writeToSupabase(env, siteSlug, botInfo, request);
}

async function logGeneralVisit(env, siteSlug, request) {
  const today = new Date().toISOString().split("T")[0];
  const prefix = `site:${siteSlug}:`;
  const dayKey = `${prefix}day:${today}:_human`;
  const current = parseInt((await env.AI_FOOTPRINT.get(dayKey)) || "0");
  await env.AI_FOOTPRINT.put(dayKey, String(current + 1), { expirationTtl: 30 * 86400 });
  const totalKey = `${prefix}total:_human`;
  const total = parseInt((await env.AI_FOOTPRINT.get(totalKey)) || "0");
  await env.AI_FOOTPRINT.put(totalKey, String(total + 1));
}

async function safeKVGet(kv, key) {
  try { return await kv.get(key); } catch (e) { return null; }
}

async function getSiteStats(env, siteSlug) {
  const today = new Date().toISOString().split("T")[0];
  const prefix = `site:${siteSlug}:`;
  const stats = {
    today: {}, totals: {}, recentVisits: [],
    cnAI: { today: {}, totals: {} },
    intlAI: { today: {}, totals: {} },
    generatedAt: new Date().toISOString(), site: siteSlug
  };

  if (!env.AI_FOOTPRINT) return stats;

  try {
    // Build all KV keys and fetch in parallel
    const entries = Object.entries(AI_BOTS);
    const dayKeys = entries.map(([p]) => `${prefix}day:${today}:${p}`);
    const totalKeys = entries.map(([p]) => `${prefix}total:${p}`);
    const allKeys = [...dayKeys, ...totalKeys];

    const results = await Promise.allSettled(allKeys.map(k => env.AI_FOOTPRINT.get(k)));

    for (let i = 0; i < entries.length; i++) {
      const [pattern, name] = entries[i];
      const dayVal = results[i].status === "fulfilled" ? results[i].value : null;
      const totalVal = results[i + entries.length].status === "fulfilled" ? results[i + entries.length].value : null;
      const dayCount = parseInt(dayVal || "0");
      const total = parseInt(totalVal || "0");
      if (dayCount > 0) stats.today[name] = dayCount;
      if (total > 0) stats.totals[name] = total;
      const region = BOT_REGIONS[pattern] || "International";
      if (region === "CN") {
        if (dayCount > 0) stats.cnAI.today[name] = dayCount;
        if (total > 0) stats.cnAI.totals[name] = total;
      } else {
        if (dayCount > 0) stats.intlAI.today[name] = dayCount;
        if (total > 0) stats.intlAI.totals[name] = total;
      }
    }

    // Human visitor counts
    const [humanTodayR, humanTotalR] = await Promise.allSettled([
      env.AI_FOOTPRINT.get(`${prefix}day:${today}:_human`),
      env.AI_FOOTPRINT.get(`${prefix}total:_human`),
    ]);
    const humanToday = parseInt((humanTodayR.status === "fulfilled" ? humanTodayR.value : null) || "0");
    const humanTotal = parseInt((humanTotalR.status === "fulfilled" ? humanTotalR.value : null) || "0");
    if (humanToday > 0) stats.today["Human Visitors"] = humanToday;
    if (humanTotal > 0) stats.totals["Human Visitors"] = humanTotal;

    const logVal = await safeKVGet(env.AI_FOOTPRINT, `${prefix}log:${today}`);
    stats.recentVisits = JSON.parse(logVal || "[]").slice(-20);
  } catch (e) {
    stats._error = e.message;
  }
  return stats;
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  };
}

export default {
  async fetch(request, env, ctx) {
    try { return await handleRequest(request, env, ctx); }
    catch (e) { return new Response(JSON.stringify({ error: e.message, stack: e.stack?.split("\n").slice(0,3) }), { status: 500, headers: corsHeaders() }); }
  },
};

async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // === List all tracked sites ===
    if (path === "/sites.json") {
      return new Response(JSON.stringify({
        sites: Object.keys(CLIENT_SITES),
        count: Object.keys(CLIENT_SITES).length,
      }, null, 2), { headers: corsHeaders() });
    }

    // === All sites combined stats ===
    if (path === "/all-stats.json") {
      const allStats = {};
      for (const slug of Object.keys(CLIENT_SITES)) {
        allStats[slug] = await getSiteStats(env, slug);
      }
      return new Response(JSON.stringify(allStats, null, 2), { headers: corsHeaders() });
    }

    // === Per-site stats: /{slug}/ai-stats.json ===
    const statsMatch = path.match(/^\/([a-z0-9-]+)\/ai-stats\.json$/);
    if (statsMatch) {
      const slug = statsMatch[1];
      if (!CLIENT_SITES[slug]) {
        return new Response(JSON.stringify({ error: "Unknown site", available: Object.keys(CLIENT_SITES) }), {
          status: 404, headers: corsHeaders(),
        });
      }
      const stats = await getSiteStats(env, slug);
      return new Response(JSON.stringify(stats, null, 2), { headers: corsHeaders() });
    }

    // === Beacon endpoint: POST /{slug}/beacon ===
    // Client-side JS can POST here to report AI bot visits detected on-page
    const beaconMatch = path.match(/^\/([a-z0-9-]+)\/beacon$/);
    if (beaconMatch && request.method === "POST") {
      const slug = beaconMatch[1];
      if (!CLIENT_SITES[slug]) {
        return new Response(JSON.stringify({ error: "Unknown site" }), { status: 404, headers: corsHeaders() });
      }
      try {
        const body = await request.json();
        if (body.bot && AI_BOTS[body.bot]) {
          const botInfo = { pattern: body.bot, name: AI_BOTS[body.bot] };
          ctx.waitUntil(logAIVisit(env, slug, botInfo, request));
        }
      } catch (e) { /* ignore malformed */ }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders() });
    }

    // === Tracking Pixel: GET /{slug}/pixel.gif ===
    // 1x1 transparent GIF — AI crawlers that load images will trigger this
    const pixelMatch = path.match(/^\/([a-z0-9-]+)\/pixel\.gif$/);
    if (pixelMatch && request.method === "GET") {
      const slug = pixelMatch[1];
      if (CLIENT_SITES[slug]) {
        const userAgent = request.headers.get("user-agent") || "";
        const botInfo = detectAIBot(userAgent);
        if (botInfo && env.AI_FOOTPRINT) {
          ctx.waitUntil(logAIVisit(env, slug, botInfo, request));
        }
        // Always log as a general visit for traffic counting
        if (!botInfo && env.AI_FOOTPRINT) {
          ctx.waitUntil(logGeneralVisit(env, slug, request));
        }
      }
      // Return 1x1 transparent GIF
      const gif = new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,0,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59]);
      return new Response(gif, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*",
          "X-Robots-Tag": "noindex",
        },
      });
    }

    // === Proxy mode: /{slug}/... ===
    const proxyMatch = path.match(/^\/([a-z0-9-]+)(\/.*)?$/);
    if (proxyMatch) {
      const slug = proxyMatch[1];
      const targetBase = CLIENT_SITES[slug];
      if (!targetBase) {
        return new Response(JSON.stringify({
          error: "Unknown site",
          available: Object.keys(CLIENT_SITES),
          usage: "/{site-slug}/ai-stats.json for stats, /{site-slug}/... for proxy",
        }, null, 2), { status: 404, headers: corsHeaders() });
      }

      const proxyPath = proxyMatch[2] || "/";
      const targetUrl = targetBase + proxyPath + url.search;
      const userAgent = request.headers.get("user-agent") || "";
      const botInfo = detectAIBot(userAgent);

      if (botInfo && env.AI_FOOTPRINT) {
        ctx.waitUntil(logAIVisit(env, slug, botInfo, request));
      }

      try {
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
        return new Response(response.body, { status: response.status, headers: newHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Proxy error", message: e.message }), {
          status: 502, headers: corsHeaders(),
        });
      }
    }

    // === Root: API info ===
    return new Response(JSON.stringify({
      name: "CloudPipe Client AI Tracker",
      version: "1.0.0",
      endpoints: {
        "/sites.json": "List all tracked sites",
        "/all-stats.json": "Combined stats for all sites",
        "/{slug}/ai-stats.json": "Per-site AI crawler statistics",
        "/{slug}/beacon": "POST beacon for client-side tracking",
        "/{slug}/...": "Reverse proxy to site (with AI detection)",
      },
      sites: Object.keys(CLIENT_SITES),
    }, null, 2), { headers: corsHeaders() });
}
