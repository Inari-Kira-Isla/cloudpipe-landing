#!/bin/bash
# 修復所有 3 個 Cloudflare Workers（KV 讀取錯誤處理）
# 用法: wrangler login && bash fix-workers.sh

set -e

echo "=== 部署修復後的 Workers ==="

echo ""
echo "1/3 部署 client-ai-tracker..."
cd ~/Documents/cloudpipe-landing/cloudflare-worker/client-tracker
wrangler deploy
echo "✓ client-ai-tracker 已更新"

echo ""
echo "2/3 部署 openclaw-ai-tracker..."
cd ~/Documents/Openclaw/configs
wrangler deploy
echo "✓ openclaw-ai-tracker 已更新"

echo ""
echo "3/3 部署 cloudpipe-ai-tracker..."
cd ~/Documents/cloudpipe-landing/cloudflare-worker
wrangler deploy
echo "✓ cloudpipe-ai-tracker 已更新"

echo ""
echo "=== 驗證 ==="
sleep 2
echo -n "client-ai-tracker: "
curl -s -o /dev/null -w "HTTP %{http_code}" "https://client-ai-tracker.inariglobal.workers.dev/yamanakada/ai-stats.json"
echo ""
echo -n "openclaw-ai-tracker: "
curl -s -o /dev/null -w "HTTP %{http_code}" "https://openclaw-ai-tracker.inariglobal.workers.dev/ai-stats.json"
echo ""
echo -n "cloudpipe-ai-tracker: "
curl -s -o /dev/null -w "HTTP %{http_code}" "https://cloudpipe-ai-tracker.inariglobal.workers.dev/ai-stats.json"
echo ""

echo ""
echo "=== 完成！刷新 unified-monitor.html 檢查 ==="
