<think>用户要求根据 AGENTS.md 内容为 repo "cloudpipe-landing" 生成 GEMINI.md 文件。我需要：

1. 解析 AGENTS.md 内容
2. 按照要求的格式（9点要求）生成 GEMINI.md
3. 直接输出 Markdown 内容，不加包装

让我分析 AGENTS.md 的内容：
- 项目名称：CloudPipe AI Landing
- 用途：公司落地页，AEO优化，统一监控面板，Cloudflare Workers用于AI爬虫追踪
- 关键文件：unified-monitor.html, aeo-monitor.html, project-overview.html, cloudflare-worker/
- Cloudflare Workers：openclaw-ai-tracker, client-ai-tracker，使用D1 SQLite
- AEO：Schema.org, llms.txt, robots.txt

现在按照要求的格式生成：
1. # 标题 - 项目名称
2. ## Overview - 2-3句简述
3. ## Tech Stack - 技术栈
4. ## Architecture - 关键目录和架构说明
5. ## Commands - 开发/构建/部署指令
6. ## Coding Style - 代码风格规范
7. ## Important Rules - 重要规则和禁止事项
8. 保持简洁，不超过80行
9. 保留中文内容（因为AGENTS.md是中文的）

让我生成内容：</think>

# CloudPipe AI Landing

## Overview
CloudPipe AI 公司落地页，基于 AEO（AI Engine Optimization）优化，集成统一监控面板和 Cloudflare Workers AI 爬虫追踪系统。支持 6 分页监控仪表板和 13 站点 AEO 热力图。

## Tech Stack
- **前端框架**: HTML/CSS/JS (Vanilla)
- **后端/Edge**: Cloudflare Workers (D1 SQLite)
- **监控存储**: Cloudflare KV + Supabase
- **部署平台**: Vercel

## Architecture
- `unified-monitor.html` — 6 分页统一监控面板（KV + Supabase + Canvas 拓扑）
- `aeo-monitor.html` — 13 站点 AEO 性能热力图
- `project-overview.html` — 6 分页项目组合仪表板
- `cloudflare-worker/` — AI 追踪 Workers（D1 SQLite 存储）

## Commands
```bash
# 本地开发
vercel dev

# 部署
vercel deploy --prod
```

## Coding Style
- 前端纯 HTML/CSS/JS，无框架依赖
- Cloudflare Workers 使用 ES Module 语法
- D1 数据库操作遵循 SQL 注入防护规范

## Important Rules
- **禁止**: 在前端代码中硬编码敏感 API Key
- **必须**: llms.txt 和 robots.txt 保持 AI 爬虫友好
- **必须**: 所有页面遵循 Schema.org 结构化数据（Organization, FAQPage）