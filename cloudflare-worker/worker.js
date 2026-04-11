// ============================================
// CloudPipe AI Footprint Tracker
// Cloudflare Worker — Proxy to Vercel
// Aggregated KV storage (1 read instead of 59)
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

// === Supabase write (unified tracking) ===
async function hashIP(ip) {
  const data = new TextEncoder().encode(ip + "cloudpipe-salt-2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

async function writeToSupabase(env, botInfo, request) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return;
  try {
    const url = new URL(request.url);
    const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
    const ipHash = await hashIP(ip);
    const today = new Date().toISOString().split("T")[0];
    await fetch(`${env.SUPABASE_URL}/rest/v1/crawler_visits`, {
      method: "POST",
      headers: {
        "apikey": env.SUPABASE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        bot_name: botInfo.pattern,
        bot_owner: "Unknown",
        path: url.pathname,
        referer: request.headers.get("referer") || null,
        ip_hash: ipHash,
        session_id: `${ipHash}-${botInfo.pattern}-${today}`,
        ua_raw: (request.headers.get("user-agent") || "").substring(0, 500),
        site: "cloudpipe-landing",
        page_type: url.pathname === "/" ? "home" : "page",
        industry: null,
        category: null,
      }),
    });
  } catch (e) { /* silently ignore */ }
}

// Aggregated stats blob
const AGG_KEY = "agg-stats";

async function getAgg(env) {
  try {
    const raw = await env.AI_FOOTPRINT.get(AGG_KEY);
    return raw ? JSON.parse(raw) : { _date: "", today: {}, totals: {} };
  } catch (e) { return { _date: "", today: {}, totals: {} }; }
}

async function logAIVisit(env, botInfo, request) {
  const today = new Date().toISOString().split("T")[0];
  const url = new URL(request.url);

  // Update aggregated blob (1 read + 1 write)
  const agg = await getAgg(env);
  if (agg._date !== today) { agg.today = {}; agg._date = today; }
  agg.today[botInfo.pattern] = (agg.today[botInfo.pattern] || 0) + 1;
  agg.totals[botInfo.pattern] = (agg.totals[botInfo.pattern] || 0) + 1;
  await env.AI_FOOTPRINT.put(AGG_KEY, JSON.stringify(agg));

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
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // === Migrate legacy keys to aggregated blob ===
      if (url.pathname === "/migrate-agg") {
        if (!env.AI_FOOTPRINT) return new Response("No KV", { status: 500 });
        const today = new Date().toISOString().split("T")[0];
        const agg = { _date: today, today: {}, totals: {} };
        for (const [pattern] of Object.entries(AI_BOTS)) {
          try {
            const tv = await env.AI_FOOTPRINT.get(`total:${pattern}`);
            if (tv) agg.totals[pattern] = parseInt(tv);
            const dv = await env.AI_FOOTPRINT.get(`day:${today}:${pattern}`);
            if (dv) agg.today[pattern] = parseInt(dv);
          } catch (e) {}
        }
        try {
          const ht = await env.AI_FOOTPRINT.get(`total:_human`);
          if (ht) agg.totals["_human"] = parseInt(ht);
        } catch (e) {}
        await env.AI_FOOTPRINT.put(AGG_KEY, JSON.stringify(agg));
        return new Response(JSON.stringify({ migrated: agg }, null, 2), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // === AI Stats API endpoint (cached 900s) ===
      if (url.pathname === "/ai-stats.json") {
        const cache = caches.default;
        const cacheKey = new Request(request.url, { method: "GET" });
        const cached = await cache.match(cacheKey);
        if (cached) return cached;

        const today = new Date().toISOString().split("T")[0];
        const stats = { today: {}, totals: {}, recentVisits: [], generatedAt: new Date().toISOString() };

        if (!env.AI_FOOTPRINT) {
          return new Response(JSON.stringify(stats, null, 2), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" },
          });
        }

        try {
          // 1 KV read for all stats
          const agg = await getAgg(env);
          const todayData = (agg._date === today) ? agg.today : {};
          const totalData = agg.totals || {};

          for (const [pattern, name] of Object.entries(AI_BOTS)) {
            const dc = todayData[pattern] || 0;
            const tc = totalData[pattern] || 0;
            if (dc > 0) stats.today[name] = dc;
            if (tc > 0) stats.totals[name] = tc;
          }

          // 1 more KV read for recent visits
          try {
            const logVal = await env.AI_FOOTPRINT.get(`log:${today}`);
            stats.recentVisits = JSON.parse(logVal || "[]").slice(-20);
          } catch (e) {}
        } catch (e) { stats._error = e.message; }

        const hasData = Object.keys(stats.totals).length > 0;
        const ttl = hasData ? 900 : 60;
        const resp = new Response(JSON.stringify(stats, null, 2), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": `public, max-age=${ttl}` },
        });
        ctx.waitUntil(cache.put(cacheKey, resp.clone()));
        return resp;
      }

      // === Handle pixel.gif requests (tracking) ===
      if (url.pathname.includes("/pixel.gif")) {
        const userAgent = request.headers.get("user-agent") || "";
        const botInfo = detectAIBot(userAgent);

        if (botInfo && env.AI_FOOTPRINT) {
          ctx.waitUntil(logAIVisit(env, botInfo, request));
          ctx.waitUntil(writeToSupabase(env, botInfo, request));
        }

        // Return 1x1 transparent GIF with proper headers
        const gifData = new Uint8Array([
          0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
          0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x0A,
          0x00, 0x01, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
          0x00, 0x02, 0x02, 0x4C, 0x01, 0x00, 0x3B
        ]);

        return new Response(gifData, {
          status: 200,
          headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
            "Content-Length": gifData.length.toString(),
          },
        });
      }

      // === Proxy to Vercel ===
      const targetUrl = VERCEL_URL + url.pathname + url.search;
      const userAgent = request.headers.get("user-agent") || "";
      const botInfo = detectAIBot(userAgent);

      if (botInfo && env.AI_FOOTPRINT) {
        ctx.waitUntil(logAIVisit(env, botInfo, request));
        ctx.waitUntil(writeToSupabase(env, botInfo, request));
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
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
