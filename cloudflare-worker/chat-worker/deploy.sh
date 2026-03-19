#!/bin/bash
# Deploy chat worker to Cloudflare
# Usage: bash deploy.sh

set -e
cd "$(dirname "$0")"

echo "=== 1. Create D1 tables ==="
npx wrangler d1 execute ai-tracker --file=schema.sql --remote

echo ""
echo "=== 2. Import knowledge ==="
/usr/local/bin/python3 import-knowledge.py > seed.sql
npx wrangler d1 execute ai-tracker --file=seed.sql --remote

echo ""
echo "=== 3. Set MiniMax API key ==="
echo "Run manually if not set: npx wrangler secret put MINIMAX_API_KEY"

echo ""
echo "=== 4. Deploy worker ==="
npx wrangler deploy

echo ""
echo "=== Done! ==="
echo "Test: curl -X POST https://client-chat-worker.<your-subdomain>.workers.dev/inari-global-foods/chat -H 'Content-Type: application/json' -d '{\"messages\":[{\"role\":\"user\",\"content\":\"你好\"}]}'"
