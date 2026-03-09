#!/bin/bash
# Cloudflare Pages 鏡像批量部署腳本
# 用法: bash deploy-cf-mirrors.sh (自動讀取持久 API Token)

set -e

# === 自動載入持久 API Token ===
TOKEN_FILE="$HOME/.cloudflare/api-token"
if [ -z "$CLOUDFLARE_API_TOKEN" ] && [ -f "$TOKEN_FILE" ]; then
    export CLOUDFLARE_API_TOKEN=$(cat "$TOKEN_FILE")
    echo "✓ 使用持久 API Token"
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "⚠ 未找到 API Token"
    echo "  設置: bash ~/.openclaw/workspace/scripts/setup-cf-token.sh <token>"
    echo "  取得: https://dash.cloudflare.com/profile/api-tokens"
    exit 1
fi

echo "=== Cloudflare Pages 鏡像部署 ==="
echo ""

# 定義站點
declare -A SITES
SITES[aeo-travel-food]="$HOME/Documents/aeo-demo-travel-food"
SITES[aeo-finance]="$HOME/Documents/aeo-demo-finance"
SITES[aeo-luxury]="$HOME/Documents/aeo-demo-luxury"
SITES[aeo-education]="$HOME/Documents/aeo-demo-education"
SITES[cloudpipe-directory]="$HOME/Documents/aeo-platform-plan/directory"

for project in "${!SITES[@]}"; do
  dir="${SITES[$project]}"
  echo "--- 部署 $project ($dir) ---"

  # 建立專案（忽略已存在的錯誤）
  wrangler pages project create "$project" --production-branch main 2>/dev/null || true

  # 部署
  cd "$dir"
  wrangler pages deploy . --project-name "$project" --branch main --commit-dirty=true

  echo "✓ $project.pages.dev 已部署"
  echo ""
done

echo "=== 全部完成 ==="
echo ""
echo "鏡像站點列表："
echo "  https://cloudpipe-landing.pages.dev"
echo "  https://aeo-travel-food.pages.dev"
echo "  https://aeo-finance.pages.dev"
echo "  https://aeo-luxury.pages.dev"
echo "  https://aeo-education.pages.dev"
echo "  https://cloudpipe-directory.pages.dev"
