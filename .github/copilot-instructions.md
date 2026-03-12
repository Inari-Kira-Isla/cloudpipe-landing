# CloudPipe AI Landing

## Project
Company landing page with AEO optimization, unified monitoring dashboards, and Cloudflare Workers for AI crawler tracking. Tech stack: Next.js, Cloudflare Workers, D1 SQLite, KV, Supabase, Canvas.

## Conventions
- Use functional components with TypeScript
- Prefer Server Components over Client Components where possible
- Keep HTML semantic and accessible
- Use CSS modules or inline styles for component isolation
- Include Schema.org structured data for AEO

## Naming
- Use kebab-case for HTML files (e.g., `unified-monitor.html`)
- Use camelCase for JavaScript/TypeScript functions and variables
- Use PascalCase for React components
- Prefix worker files with descriptive purpose (e.g., `openclaw-ai-tracker`)

## Architecture
- Landing page served via Vercel
- AI tracking Workers run on Cloudflare Edge with D1 SQLite
- 28 AI bot detection patterns for crawler identification
- llms.txt generated for AI crawler optimization
- Schema.org Organization and FAQPage for search visibility

## Commands
- `vercel deploy` — Deploy to Vercel
- `wrangler deploy` — Deploy Cloudflare Workers
- `wrangler d1 execute` — Run D1 database queries

## Do Not
- Do not commit sensitive API keys or secrets
- Do not bypass AEO structured data requirements
- Do not use client-side tracking without Worker fallback
- Do not modify worker routes without testing on Edge