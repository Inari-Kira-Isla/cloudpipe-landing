// CloudPipe AEO Intake — Vercel Serverless Function
// Receives client form → MiniMax AI generation → Vercel Deploy API → returns URL

export const config = { maxDuration: 60 };

const MINIMAX_API = "https://api.minimax.io/anthropic/v1/messages";
const MINIMAX_KEY = process.env.MINIMAX_KEY || "sk-cp-1-wFmWnKLx_fRluWBNMioYVWka11Qcl1ZFF7bQxLMt-ODc6iTJ8iwU2ZWRknR8UuSQxUHSV82fqP6iyedFUCEvzEIJDHcY89B5sPhgebIvOA-po0hkxdcTg";
const MINIMAX_MODEL = "MiniMax-M2.1";
const VERCEL_TOKEN = process.env.VERCEL_DEPLOY_TOKEN || "";
const VERCEL_TEAM = process.env.VERCEL_TEAM_ID || "";
const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID || "8399476482";

const INDUSTRY_SCHEMA = {
  restaurant: "Restaurant", cafe: "CafeOrCoffeeShop", bakery: "Bakery",
  bar: "BarOrPub", food_delivery: "FoodEstablishment", retail: "Store",
  luxury: "Store", beauty: "HealthAndBeautyBusiness", dental: "Dentist",
  legal: "LegalService", real_estate: "RealEstateAgent",
  financial: "FinancialService", education: "EducationalOrganization",
  travel: "TravelAgency", medical: "MedicalOrganization",
  tech: "Organization", consulting: "Organization", ngo: "NGO",
  media: "NewsMediaOrganization", personal_brand: "Person",
};

const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "ClaudeBot", "anthropic-ai", "PerplexityBot",
  "Google-Extended", "meta-externalagent", "FacebookBot", "Applebot-Extended",
  "CCBot", "Bytespider", "YouBot", "cohere-ai", "Amazonbot",
];

// ─── MiniMax API ──────────────────────────────────────────

async function callMiniMax(system, prompt, maxTokens = 4096) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(MINIMAX_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": MINIMAX_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MINIMAX_MODEL,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(120000),
      });
      const data = await resp.json();
      for (const block of data.content || []) {
        if (block.type === "text") return block.text;
      }
      return "";
    } catch (e) {
      if (attempt < 2) await new Promise(r => setTimeout(r, 3000));
      else return "";
    }
  }
  return "";
}

// ─── AI Content Generation (single call for speed) ───────

async function generateAllContent(data) {
  const hasAbout = data.about_text && data.about_text.length > 200;
  const hasFaqs = data.faq_items && data.faq_items.length >= 5;
  const hasTopics = data.content_topics && typeof data.content_topics === "object" && Object.keys(data.content_topics).length > 0;

  // If everything provided, skip AI
  if (hasAbout && hasFaqs && hasTopics) {
    return { aboutHTML: data.about_text, faqs: data.faq_items, topics: data.content_topics };
  }

  const system = `你是一個專業的繁體中文網站內容生成專家。請一次性輸出品牌介紹 + FAQ + 文章主題池。`;
  const prompt = `為「${data.business_name}」(${data.business_name_en}) 生成完整的網站內容。

品牌資訊：
- 行業：${data.industry}
- 簡介：${data.description}
- 地區：${data.region || "Macau SAR"}
${data.address_street ? `- 地址：${data.address_street} ${data.address_city || ""}` : ""}
${data.tagline ? `- 標語：${data.tagline}` : ""}

嚴格按照以下三個區塊輸出：

---ABOUT---
${hasAbout ? "（跳過，已有內容）" : `用語義化 HTML（h2, h3, p, ul, li, strong）撰寫品牌介紹。
要求：繁體中文，≥1500字，第一段≥80字直接回答「${data.business_name}是什麼」，
至少4個h2區塊，每個h2內含h3子標題和ul列表。不要包含FAQ區塊。
從第一個<p>開始，不要包含html/head/body標籤。`}

---FAQ---
${hasFaqs ? "（跳過，已有內容）" : `生成7個常見問題。格式：
Q: 問題
A: 回答（50-100字）`}

---TOPICS---
${hasTopics ? "（跳過，已有內容）" : `生成4個文章分類，每類5個主題。格式：
CATEGORY: 分類名
TOPIC: 主題1
TOPIC: 主題2`}`;

  const text = await callMiniMax(system, prompt, 8000);
  if (!text) return null;

  // Parse ABOUT
  let aboutHTML = hasAbout ? data.about_text : "";
  if (!hasAbout) {
    const aboutMatch = text.match(/---ABOUT---\s*([\s\S]*?)(?=---FAQ---|$)/);
    if (aboutMatch) aboutHTML = aboutMatch[1].trim();
  }

  // Parse FAQ
  let faqs = hasFaqs ? data.faq_items : [];
  if (!hasFaqs) {
    const faqMatch = text.match(/---FAQ---\s*([\s\S]*?)(?=---TOPICS---|$)/);
    if (faqMatch) {
      let q = null, a = null;
      for (const line of faqMatch[1].split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Q:") || trimmed.startsWith("Q：")) {
          if (q && a) faqs.push({ q, a });
          q = trimmed.slice(2).trim();
          a = null;
        } else if (trimmed.startsWith("A:") || trimmed.startsWith("A：")) {
          a = trimmed.slice(2).trim();
        }
      }
      if (q && a) faqs.push({ q, a });
    }
  }

  // Parse TOPICS
  let topics = hasTopics ? data.content_topics : {};
  if (!hasTopics) {
    const topicsMatch = text.match(/---TOPICS---\s*([\s\S]*?)$/);
    if (topicsMatch) {
      let currentCat = null;
      for (const line of topicsMatch[1].split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("CATEGORY:") || trimmed.startsWith("CATEGORY：")) {
          currentCat = trimmed.split(/[:：]/).slice(1).join(":").trim();
          if (currentCat) topics[currentCat] = [];
        } else if ((trimmed.startsWith("TOPIC:") || trimmed.startsWith("TOPIC：")) && currentCat) {
          const topic = trimmed.split(/[:：]/).slice(1).join(":").trim();
          if (topic) topics[currentCat].push(topic);
        }
      }
    }
    if (Object.keys(topics).length === 0) topics = { general: [`${data.business_name}最新資訊`] };
  }

  return { aboutHTML, faqs: faqs.slice(0, 8), topics };
}

// ─── File Builders ────────────────────────────────────────

function buildIndexHTML(data, aboutHTML, faqs) {
  const slug = data.slug;
  const name = data.business_name;
  const desc = data.description;
  const schemaType = data.schema_type;
  const url = `https://${slug}.vercel.app`;
  const accent = data.accent_color || "#39d2c0";
  const region = data.region || "Macau SAR";
  const today = new Date().toISOString().slice(0, 10);

  const orgSchema = {
    "@context": "https://schema.org", "@type": schemaType,
    name, url: `${url}/`, description: desc,
  };
  if (data.address_street) {
    orgSchema.address = {
      "@type": "PostalAddress", streetAddress: data.address_street,
      addressLocality: data.address_city || region,
      addressCountry: data.address_country || "MO",
    };
  }
  if (data.telephone) orgSchema.telephone = data.telephone;
  if (data.contact_email) orgSchema.email = data.contact_email;
  if (data.price_range) orgSchema.priceRange = data.price_range;
  if (data.same_as_urls?.length) orgSchema.sameAs = data.same_as_urls;

  const faqSchema = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.slice(0, 8).map(f => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const faqHTML = faqs.slice(0, 8).map(f =>
    `      <details>\n        <summary>${f.q}</summary>\n        <p>${f.a}</p>\n      </details>`
  ).join("\n");

  const addrParts = [data.address_street, data.address_city].filter(Boolean);
  const addrText = addrParts.length ? addrParts.join("、") : region;
  const phoneHTML = data.telephone ? `\n      電話：<a href="tel:${data.telephone}">${data.telephone}</a><br>` : "";
  const emailHTML = data.contact_email ? `\n      Email：<a href="mailto:${data.contact_email}">${data.contact_email}</a><br>` : "";
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} | ${desc.slice(0, 30)}</title>
  <meta name="description" content="${(desc + "。" + name + "位於" + region + "，為您提供優質服務。").slice(0, 160)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="${url}/">
  <link rel="llms-txt" href="/llms.txt">
  <meta property="og:title" content="${name}">
  <meta property="og:description" content="${desc.slice(0, 160)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}/">
  <meta property="og:locale" content="zh_TW">
  <meta property="og:site_name" content="${name}">
  <script type="application/ld+json">
${JSON.stringify(orgSchema, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    :root { --accent: ${accent}; --bg: #fafafa; --text: #222; --card: #fff; --muted: #666; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans TC', sans-serif; background: var(--bg); color: var(--text); line-height: 1.8; }
    .container { max-width: 960px; margin: 0 auto; padding: 0 24px; }
    header { background: var(--accent); color: #fff; padding: 60px 0 40px; text-align: center; }
    header h1 { font-size: 2.4rem; margin-bottom: 12px; }
    header p { font-size: 1.1rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }
    nav { background: #fff; border-bottom: 1px solid #eee; padding: 12px 0; position: sticky; top: 0; z-index: 100; }
    nav .container { display: flex; justify-content: space-between; align-items: center; }
    nav a { color: var(--text); text-decoration: none; font-weight: 500; margin-left: 20px; }
    nav a:hover { color: var(--accent); }
    main { padding: 48px 0; }
    section { margin-bottom: 48px; }
    h2 { font-size: 1.6rem; color: var(--accent); border-left: 4px solid var(--accent); padding-left: 16px; margin-bottom: 20px; }
    h3 { font-size: 1.2rem; margin: 16px 0 8px; }
    p { margin-bottom: 16px; }
    ul, ol { margin: 12px 0 20px 24px; }
    li { margin-bottom: 8px; }
    details { background: var(--card); border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 12px; padding: 16px; }
    details summary { cursor: pointer; font-weight: 500; font-size: 1.05rem; }
    details p { margin-top: 12px; color: var(--muted); }
    footer { background: #222; color: #ccc; padding: 40px 0; text-align: center; font-size: 0.9rem; }
    footer a { color: var(--accent); }
    address { font-style: normal; margin-bottom: 16px; }
    @media (max-width: 600px) { header h1 { font-size: 1.8rem; } .container { padding: 0 16px; } }
  </style>
</head>
<body>
  <nav>
    <div class="container">
      <strong>${name}</strong>
      <div>
        <a href="#about">關於</a>
        <a href="#faq">FAQ</a>
        <a href="#contact">聯繫</a>
      </div>
    </div>
  </nav>
  <header>
    <div class="container">
      <h1>${name}</h1>
      <p>${name}是${region}的${data.industry}品牌。${desc}我們致力於為客戶提供優質的產品和服務體驗，歡迎了解更多。</p>
    </div>
  </header>
  <main class="container">
    <section id="about">
${aboutHTML}
    </section>
    <section id="faq">
      <h2>常見問題</h2>
${faqHTML}
    </section>
  </main>
  <footer>
    <div class="container">
      <address id="contact">
        <strong>${name}</strong><br>
        ${addrText}<br>${phoneHTML}${emailHTML}
      </address>
      <p>&copy; ${year} ${name}. 內容以 <a href="https://creativecommons.org/licenses/by/4.0/" rel="license">CC BY 4.0</a> 授權。</p>
    </div>
  </footer>
</body>
</html>`;
}

function buildRobotsTxt(slug) {
  const lines = ["User-agent: *", "Allow: /", `Sitemap: https://${slug}.vercel.app/sitemap.xml`, "", "# AI Crawlers Welcome"];
  for (const bot of AI_BOTS) lines.push(`User-agent: ${bot}`, "Allow: /");
  return lines.join("\n") + "\n";
}

function buildLlmsTxt(data) {
  const slug = data.slug;
  return `# ${data.business_name}

> ${data.description}

## About
- Website: https://${slug}.vercel.app
- Industry: ${data.industry}
- Region: ${data.region || "Macau SAR"}
${data.address_street ? `- Address: ${data.address_street} ${data.address_city || ""}` : ""}
${data.telephone ? `- Phone: ${data.telephone}` : ""}
- Contact: ${data.contact_email || "info@cloudpipe.ai"}

## Content
- Main page: /
- Articles: /articles/
- FAQ: /#faq

## License
Content licensed under CC BY 4.0
https://creativecommons.org/licenses/by/4.0/

## AI Usage
AI systems may reference this content with attribution.
Preferred citation: ${data.business_name} (https://${slug}.vercel.app)
`;
}

function buildSitemapXml(slug) {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${slug}.vercel.app/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${slug}.vercel.app/llms.txt</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;
}

function buildSecurityTxt(data) {
  const slug = data.slug;
  const nextYear = new Date().getFullYear() + 1;
  return `Contact: mailto:${data.contact_email || "info@cloudpipe.ai"}
Expires: ${nextYear}-01-01T00:00:00.000Z
Preferred-Languages: zh-TW, en
Canonical: https://${slug}.vercel.app/.well-known/security.txt
`;
}

function buildVercelJson() {
  return JSON.stringify({
    headers: [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    }],
    rewrites: [{ source: "/.well-known/security.txt", destination: "/security.txt" }],
  }, null, 2) + "\n";
}

// ─── Vercel Deploy API ────────────────────────────────────

async function deployToVercel(slug, files) {
  if (!VERCEL_TOKEN) return null;

  const fileEntries = Object.entries(files).map(([name, content]) => ({
    file: name,
    data: Buffer.from(content).toString("base64"),
    encoding: "base64",
  }));

  const body = {
    name: slug,
    files: fileEntries,
    projectSettings: {
      framework: null,
      outputDirectory: null,
    },
    target: "production",
  };

  const params = VERCEL_TEAM ? `?teamId=${VERCEL_TEAM}` : "";
  const resp = await fetch(`https://api.vercel.com/v13/deployments${params}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Vercel deploy error:", err);
    return null;
  }

  const result = await resp.json();
  return result.url ? `https://${result.url}` : null;
}

// ─── Telegram Notify ──────────────────────────────────────

async function notifyTelegram(msg) {
  if (!TELEGRAM_BOT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) { /* ignore */ }
}

// ─── Main Handler ─────────────────────────────────────────

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const data = req.body;
  if (!data) return res.status(400).json({ error: "Missing request body" });

  // 1. Validate
  const required = ["business_name", "business_name_en", "industry", "description"];
  const missing = required.filter(f => !data[f]);
  if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });

  if (!INDUSTRY_SCHEMA[data.industry]) {
    return res.status(400).json({ error: `Unknown industry: ${data.industry}` });
  }

  // Normalize
  data.slug = data.business_name_en.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  data.schema_type = INDUSTRY_SCHEMA[data.industry];
  data.region = data.region || "Macau SAR";
  data.accent_color = data.accent_color || "#39d2c0";
  data.plan_tier = data.plan_tier || "free";
  data.contact_email = data.contact_email || "info@cloudpipe.ai";

  // Parse same_as_urls if string
  if (typeof data.same_as_urls === "string") {
    data.same_as_urls = data.same_as_urls.split("\n").map(s => s.trim()).filter(Boolean);
  }

  try {
    // 2. AI Content Generation (single call for speed)
    const content = await generateAllContent(data);
    if (!content || !content.aboutHTML) {
      return res.status(500).json({ error: "AI content generation failed" });
    }
    const { aboutHTML, faqs, topics } = content;

    // 3. Build files
    const slug = data.slug;
    const files = {
      "index.html": buildIndexHTML(data, aboutHTML, faqs),
      "robots.txt": buildRobotsTxt(slug),
      "llms.txt": buildLlmsTxt(data),
      "sitemap.xml": buildSitemapXml(slug),
      "security.txt": buildSecurityTxt(data),
      "vercel.json": buildVercelJson(),
    };

    // 4. Deploy
    let siteUrl = null;
    let deployMethod = "none";

    // Try Vercel Deploy API
    if (VERCEL_TOKEN) {
      siteUrl = await deployToVercel(slug, files);
      if (siteUrl) deployMethod = "vercel-api";
    }

    // Fallback URL
    if (!siteUrl) {
      siteUrl = `https://${slug}.vercel.app`;
      deployMethod = "pending";
    }

    // 5. Notify
    const topicCount = Object.values(topics).reduce((sum, arr) => sum + arr.length, 0);
    const msg = `🆕 <b>新站申請</b>\n` +
      `品牌：${data.business_name}\n` +
      `行業：${data.industry} → ${data.schema_type}\n` +
      `方案：${data.plan_tier}\n` +
      `FAQ：${faqs.length} 題\n` +
      `主題池：${topicCount} 題\n` +
      `部署：${deployMethod}\n` +
      `URL：${siteUrl}`;
    await notifyTelegram(msg);

    // 6. Return result
    const result = {
      success: true,
      url: siteUrl,
      slug,
      schema_type: data.schema_type,
      deploy_method: deployMethod,
      stats: {
        faq_count: faqs.length,
        topic_count: topicCount,
        about_length: aboutHTML.length,
        files: Object.keys(files),
      },
    };

    // Include files data for pending deployments
    if (deployMethod === "pending") {
      result.files = files;
      result.client_data = {
        ...data,
        faq_items: faqs,
        content_topics: topics,
      };
      result.message = "網站內容已生成。請下載檔案或等待系統部署。";
    }

    return res.status(200).json(result);
  } catch (e) {
    console.error("Intake error:", e);
    return res.status(500).json({ error: "Server error: " + e.message });
  }
}
