# CloudPipe Landing

## Project
CloudPipe AI company landing page with AEO optimization, unified monitoring dashboards, and Cloudflare Workers for AI crawler tracking. Tech: Vercel, Cloudflare Workers (D1), Supabase, Canvas.

## Conventions
- Use semantic HTML with Schema.org markup
- Implement AEO patterns: Organization schema, FAQPage, llms.txt
- Follow Cloudflare Workers best practices for edge functions
- Keep dashboard UIs clean with consistent 6-tab layouts

## Naming
- Use kebab-case for HTML files (unified-monitor.html, aeo-monitor.html)
- Use camelCase for JavaScript functions
- Name Workers descriptively (openclaw-ai-tracker, client-ai-tracker)

## Architecture
- Landing page hosted on Vercel
- AI bot tracking via Cloudflare Workers with D1 SQLite storage
- 28 AI bot detection patterns for crawler identification
- Dashboard data sourced from Cloudflare KV + Supabase + Canvas topology

## Commands
- `vercel deploy` — Deploy to Vercel
- `wrangler deploy` — Deploy Cloudflare Workers
- `wrangler d1 execute` — Run D1 database commands

## Do Not
- Remove Schema.org structured data from landing pages
- Disable llms.txt or robots.txt AI-friendly directives
- Expose sensitive data in Worker responses
- Hardcode API keys in client-side code