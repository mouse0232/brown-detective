#!/bin/bash
set -e

echo "🚀 开始部署到 Cloudflare Pages..."

# 安装 wrangler（如果未安装）
if ! command -v wrangler &> /dev/null; then
    echo "📦 安装 wrangler..."
    npm install -g wrangler
fi

# 验证 wrangler.toml 配置
echo "📋 检查 wrangler.toml 配置..."
if [ ! -f wrangler.toml ]; then
    echo "❌ wrangler.toml 不存在"
    exit 1
fi

# 部署到 Cloudflare Pages
echo "🌐 部署到 Cloudflare Pages..."
npx wrangler pages deploy public --project-name=creepjs-antibot

echo "✅ 部署完成！"
