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

async function getSiteStats(env, siteSlug) {
  const today = new Date().toISOString().split("T")[0];
  const prefix = `site:${siteSlug}:`;
  const stats = { today: {}, totals: {}, recentVisits: [], generatedAt: new Date().toISOString(), site: siteSlug };

  for (const [pattern, name] of Object.entries(AI_BOTS)) {
    const dayCount = parseInt((await env.AI_FOOTPRINT.get(`${prefix}day:${today}:${pattern}`)) || "0");
    const total = parseInt((await env.AI_FOOTPRINT.get(`${prefix}total:${pattern}`)) || "0");
    if (dayCount > 0) stats.today[name] = dayCount;
    if (total > 0) stats.totals[name] = total;
  }
  // Human visitor counts
  const humanToday = parseInt((await env.AI_FOOTPRINT.get(`${prefix}day:${today}:_human`)) || "0");
  const humanTotal = parseInt((await env.AI_FOOTPRINT.get(`${prefix}total:_human`)) || "0");
  if (humanToday > 0) stats.today["Human Visitors"] = humanToday;
  if (humanTotal > 0) stats.totals["Human Visitors"] = humanTotal;

  stats.recentVisits = JSON.parse((await env.AI_FOOTPRINT.get(`${prefix}log:${today}`)) || "[]").slice(-20);
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
  },
};
