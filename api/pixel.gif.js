// Cloudflare Worker equivalent for Vercel
// Returns 1x1 transparent GIF and logs AI bot visits

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

// 1x1 transparent GIF (GIF89a format)
const gifData = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x0A,
  0x00, 0x01, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x4C, 0x01, 0x00, 0x3B
]);

export default async function handler(req, res) {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const botInfo = detectAIBot(userAgent);

    // Log AI visit asynchronously (don't wait for it)
    if (botInfo) {
      logAIVisit(botInfo, req).catch(err => {
        console.error('[pixel.gif] Failed to log visit:', err.message);
      });
    }

    // Return 1x1 transparent GIF with proper headers
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', gifData.length.toString());
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).end(gifData);
  } catch (error) {
    console.error('[pixel.gif] Error:', error.message);
    res.status(200).end(gifData || Buffer.from([]));
  }
}

async function logAIVisit(botInfo, req) {
  // Log to Supabase for analytics
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[pixel.gif] Supabase credentials not configured');
    return;
  }

  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '0.0.0.0';
    const ipHash = await hashIP(ip);
    const today = new Date().toISOString().split('T')[0];
    const referer = req.headers['referer'] || null;
    const path = req.url || '/';

    const response = await fetch(`${supabaseUrl}/rest/v1/crawler_visits`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        bot_name: botInfo.pattern,
        bot_owner: 'Unknown',
        path: path,
        referer: referer,
        ip_hash: ipHash,
        session_id: `${ipHash}-${botInfo.pattern}-${today}`,
        ua_raw: (req.headers['user-agent'] || '').substring(0, 500),
        site: 'cloudpipe-landing',
        page_type: path === '/' || path === '/pixel.gif' ? 'home' : 'page',
        industry: null,
        category: null,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[pixel.gif] Supabase error (${response.status}):`, errorText.substring(0, 200));
    }
  } catch (error) {
    console.error('[pixel.gif] Supabase write failed:', error.message);
  }
}

async function hashIP(ip) {
  const crypto = require('crypto');
  const data = Buffer.from(ip + 'cloudpipe-salt-2026');
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return hash.substring(0, 16);
}
