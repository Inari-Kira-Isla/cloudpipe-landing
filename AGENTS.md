# AGENTS.md — CloudPipe AI Landing

## Project Overview
CloudPipe AI company landing page with AEO optimization, unified monitoring dashboards, and Cloudflare Workers for AI crawler tracking.

- **Live**: https://cloudpipe-landing.vercel.app
- **llms.txt**: https://cloudpipe-landing.vercel.app/llms.txt

## Key Files
- unified-monitor.html — 6-tab monitoring dashboard (Cloudflare KV + Supabase + Canvas topology)
- aeo-monitor.html — AEO performance heatmap for 13 sites
- project-overview.html — 6-tab project portfolio dashboard
- cloudflare-worker/ — AI tracker Workers (D1 SQLite storage)

## Cloudflare Workers
- openclaw-ai-tracker — Tracks AI bot visits to OpenClaw site
- client-ai-tracker — Multi-tenant tracker for brand sites
Both use D1 (Edge SQLite) with 28 AI bot detection patterns.

## AEO
Schema.org (Organization, FAQPage), llms.txt, robots.txt AI-friendly.
