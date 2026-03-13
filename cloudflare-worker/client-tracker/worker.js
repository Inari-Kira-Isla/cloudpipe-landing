// ============================================
// CloudPipe Client Sites AI Tracker
// Multi-tenant Cloudflare Worker — D1 storage
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
  // === 產品站 ===
  "mind-coffee":          "https://mind-coffee.vercel.app",
  "bni-macau":            "https://bni-macau.vercel.app",
  "test-cafe-demo":       "https://test-cafe-demo.vercel.app",
  // === 知識百科 ===
  "world-encyclopedia":   "https://inari-kira-isla.github.io/world-encyclopedia",
  "japan-encyclopedia":   "https://inari-kira-isla.github.io/japan-encyclopedia",
  // === 平台站 ===
  "cloudpipe-landing":    "https://cloudpipe-landing.vercel.app",
  "cloudpipe-directory":  "https://cloudpipe-directory.vercel.app",
  "openclaw":             "https://inari-kira-isla.github.io/Openclaw",
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
  const path = new URL(request.url).pathname.replace(`/${siteSlug}`, "") || "/";
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO ai_visit_counts (site_slug, visit_date, bot_pattern, count_today)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(site_slug, visit_date, bot_pattern)
       DO UPDATE SET count_today=count_today+1, updated_at=CURRENT_TIMESTAMP`
    ).bind(siteSlug, today, botInfo.pattern),
    env.DB.prepare(
      `INSERT INTO ai_visit_logs (site_slug, visit_date, timestamp_ms, bot_pattern, bot_name, ua, page_path, referer, source, bot_owner, bot_region)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proxy', ?, ?)`
    ).bind(
      siteSlug, today, Date.now(), botInfo.pattern, botInfo.name,
      (request.headers.get("user-agent") || "").substring(0, 200),
      path, request.headers.get("referer") || "",
      BOT_OWNERS[botInfo.pattern] || "Unknown",
      BOT_REGIONS[botInfo.pattern] || "International"
    ),
  ]);
  await writeToSupabase(env, siteSlug, botInfo, request);
}

async function getSiteStats(env, siteSlug) {
  const today = new Date().toISOString().split("T")[0];
  const stats = {
    today: {}, totals: {}, recentVisits: [],
    cnAI: { today: {}, totals: {} },
    intlAI: { today: {}, totals: {} },
    generatedAt: new Date().toISOString(), site: siteSlug,
  };

  if (!env.DB) return stats;

  try {
    const [todayCounts, totalCounts, logs] = await env.DB.batch([
      env.DB.prepare(
        `SELECT bot_pattern, count_today FROM ai_visit_counts WHERE site_slug=? AND visit_date=?`
      ).bind(siteSlug, today),
      env.DB.prepare(
        `SELECT bot_pattern, SUM(count_today) as total FROM ai_visit_counts WHERE site_slug=? GROUP BY bot_pattern`
      ).bind(siteSlug),
      env.DB.prepare(
        `SELECT timestamp_ms as ts, bot_name as bot, ua, page_path as path, referer as ref, source as src
         FROM ai_visit_logs WHERE site_slug=? AND visit_date=?
         ORDER BY timestamp_ms DESC LIMIT 20`
      ).bind(siteSlug, today),
    ]);

    for (const row of todayCounts.results || []) {
      const name = AI_BOTS[row.bot_pattern];
      if (!name || row.count_today <= 0) continue;
      stats.today[name] = row.count_today;
      const region = BOT_REGIONS[row.bot_pattern] || "International";
      if (region === "CN") stats.cnAI.today[name] = row.count_today;
      else stats.intlAI.today[name] = row.count_today;
    }

    for (const row of totalCounts.results || []) {
      const name = AI_BOTS[row.bot_pattern];
      if (!name || row.total <= 0) continue;
      stats.totals[name] = row.total;
      const region = BOT_REGIONS[row.bot_pattern] || "International";
      if (region === "CN") stats.cnAI.totals[name] = row.total;
      else stats.intlAI.totals[name] = row.total;
    }

    stats.recentVisits = (logs.results || []).map(r => ({
      ts: r.ts, bot: r.bot, ua: r.ua, path: r.path, ref: r.ref, src: r.src,
    }));
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
    catch (e) { return new Response(JSON.stringify({ error: e.message, stack: e.stack?.split("\n").slice(0, 3) }), { status: 500, headers: corsHeaders() }); }
  },
};

async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // === Recover KV data to D1 (safe, uses MAX) ===
    if (path === "/recover-kv") {
      if (!env.AI_FOOTPRINT || !env.DB) return new Response("Need both KV and D1 bindings", { status: 500 });
      const doWrite = url.searchParams.get("write") === "true";
      const results = {};

      for (const slug of Object.keys(CLIENT_SITES)) {
        const key = `site:${slug}:agg`;
        const raw = await env.AI_FOOTPRINT.get(key);
        if (!raw) { results[slug] = { kv: null }; continue; }
        const agg = JSON.parse(raw);
        const kvTotals = agg.totals || {};
        const kvToday = agg.today || {};
        const kvDate = agg._date || "";

        // Read current D1 totals for comparison
        let d1Totals = {};
        try {
          const d1Rows = await env.DB.prepare(
            `SELECT bot_pattern, SUM(count_today) as total FROM ai_visit_counts WHERE site_slug=? GROUP BY bot_pattern`
          ).bind(slug).all();
          for (const r of d1Rows.results || []) {
            d1Totals[r.bot_pattern] = r.total;
          }
        } catch (e) {}

        const entry = { kv: { date: kvDate, today: kvToday, totals: kvTotals }, d1: d1Totals, written: false };

        if (doWrite) {
          const stmts = [];
          for (const [pattern, total] of Object.entries(kvTotals)) {
            if (pattern === "_human") continue;
            const d1Val = d1Totals[pattern] || 0;
            if (total > d1Val) {
              stmts.push(
                env.DB.prepare(
                  `INSERT INTO ai_visit_counts (site_slug, visit_date, bot_pattern, count_today)
                   VALUES (?, '2026-01-01', ?, ?)
                   ON CONFLICT(site_slug, visit_date, bot_pattern)
                   DO UPDATE SET count_today=MAX(count_today, excluded.count_today)`
                ).bind(slug, pattern, total)
              );
            }
          }
          if (stmts.length > 0) {
            for (let i = 0; i < stmts.length; i += 50) {
              await env.DB.batch(stmts.slice(i, i + 50));
            }
            entry.written = true;
            entry.stmts = stmts.length;
          }
        }
        results[slug] = entry;
      }

      return new Response(JSON.stringify({ mode: doWrite ? "write" : "dry-run", results }, null, 2), { headers: corsHeaders() });
    }

    // === Migrate KV data to D1 (one-time, legacy) ===
    if (path === "/migrate-kv-to-d1") {
      if (!env.AI_FOOTPRINT || !env.DB) return new Response("Need both KV and D1 bindings", { status: 500 });
      const today = new Date().toISOString().split("T")[0];
      const results = {};

      for (const slug of Object.keys(CLIENT_SITES)) {
        const key = `site:${slug}:agg`;
        const raw = await env.AI_FOOTPRINT.get(key);
        const agg = raw ? JSON.parse(raw) : { _date: "", today: {}, totals: {} };
        const stmts = [];
        let counts = 0;

        for (const [pattern, total] of Object.entries(agg.totals || {})) {
          if (pattern === "_human") continue;
          const todayCount = (agg._date === today && agg.today[pattern]) ? agg.today[pattern] : 0;
          stmts.push(
            env.DB.prepare(
              `INSERT INTO ai_visit_counts (site_slug, visit_date, bot_pattern, count_today)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(site_slug, visit_date, bot_pattern)
               DO UPDATE SET count_today=MAX(count_today, excluded.count_today)`
            ).bind(slug, today, pattern, todayCount)
          );
          const histCount = total - todayCount;
          if (histCount > 0) {
            stmts.push(
              env.DB.prepare(
                `INSERT INTO ai_visit_counts (site_slug, visit_date, bot_pattern, count_today)
                 VALUES (?, '2026-01-01', ?, ?)
                 ON CONFLICT(site_slug, visit_date, bot_pattern)
                 DO UPDATE SET count_today=MAX(count_today, excluded.count_today)`
              ).bind(slug, pattern, histCount)
            );
          }
          counts++;
        }

        // Migrate logs
        let logCount = 0;
        try {
          const logVal = await env.AI_FOOTPRINT.get(`site:${slug}:log:${today}`);
          const logs = JSON.parse(logVal || "[]");
          for (const log of logs.slice(-100)) {
            const botPattern = Object.entries(AI_BOTS).find(([, n]) => n === log.bot)?.[0] || log.bot;
            stmts.push(
              env.DB.prepare(
                `INSERT INTO ai_visit_logs (site_slug, visit_date, timestamp_ms, bot_pattern, bot_name, ua, page_path, referer, source, bot_owner, bot_region)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proxy', ?, ?)`
              ).bind(slug, today, log.ts, botPattern, log.bot, (log.ua || "").substring(0, 200),
                log.path || "/", log.ref || "",
                BOT_OWNERS[botPattern] || "Unknown", BOT_REGIONS[botPattern] || "International")
            );
            logCount++;
          }
        } catch (e) {}

        // Execute in batches
        for (let i = 0; i < stmts.length; i += 50) {
          await env.DB.batch(stmts.slice(i, i + 50));
        }
        results[slug] = { counts, logs: logCount };
      }

      return new Response(JSON.stringify({ migrated: results }, null, 2), { headers: corsHeaders() });
    }

    // === List all tracked sites ===
    if (path === "/sites.json") {
      return new Response(JSON.stringify({
        sites: Object.keys(CLIENT_SITES),
        count: Object.keys(CLIENT_SITES).length,
      }, null, 2), { headers: corsHeaders() });
    }

    // === All sites combined stats (cached 900s = 15 min) ===
    if (path === "/all-stats.json") {
      const cache = caches.default;
      const cacheKey = new Request(request.url, { method: "GET" });
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      const allStats = {};
      for (const slug of Object.keys(CLIENT_SITES)) {
        allStats[slug] = await getSiteStats(env, slug);
      }
      const hasData = Object.values(allStats).some(s => Object.keys(s.totals || {}).length > 0);
      const ttl = hasData ? 900 : 60;
      const resp = new Response(JSON.stringify(allStats, null, 2), {
        headers: { ...corsHeaders(), "Cache-Control": `public, max-age=${ttl}` },
      });
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }

    // === Per-site stats: /{slug}/ai-stats.json (with Cache API) ===
    const statsMatch = path.match(/^\/([a-z0-9-]+)\/ai-stats\.json$/);
    if (statsMatch) {
      const slug = statsMatch[1];
      if (!CLIENT_SITES[slug]) {
        return new Response(JSON.stringify({ error: "Unknown site", available: Object.keys(CLIENT_SITES) }), {
          status: 404, headers: corsHeaders(),
        });
      }
      const cache = caches.default;
      const cacheKey = new Request(request.url, { method: "GET" });
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      const stats = await getSiteStats(env, slug);
      const hasData = Object.keys(stats.totals || {}).length > 0;
      const ttl = hasData ? 900 : 60;
      const resp = new Response(JSON.stringify(stats, null, 2), {
        headers: { ...corsHeaders(), "Cache-Control": `public, max-age=${ttl}` },
      });
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }

    // === Beacon endpoint: POST /{slug}/beacon ===
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

    // === Tracking Pixel: GET /{slug}/pixel.gif?p=/page-path ===
    const pixelMatch = path.match(/^\/([a-z0-9-]+)\/pixel\.gif$/);
    if (pixelMatch && request.method === "GET") {
      const slug = pixelMatch[1];
      if (CLIENT_SITES[slug]) {
        const userAgent = request.headers.get("user-agent") || "";
        const botInfo = detectAIBot(userAgent);
        if (botInfo && env.DB) {
          // Use ?p= query param as the actual page path instead of /pixel.gif
          const pagePath = url.searchParams.get("p") || "/";
          const patchedRequest = new Request(
            `${url.origin}/${slug}${pagePath}`,
            { headers: request.headers }
          );
          ctx.waitUntil(logAIVisit(env, slug, botInfo, patchedRequest));
        }
      }
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

      if (botInfo && env.DB) {
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
      version: "2.0.0",
      storage: "D1 (Edge SQLite)",
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
