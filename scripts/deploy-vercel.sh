#!/bin/bash
# ============================================
# ILUNI FTE WebApps - Vercel Deployment Script
# ============================================

set -e  # Exit on error

echo "🚀 Deploying to Vercel..."

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run 'bun run setup' first."
    exit 1
fi

# Source .env file
source .env

# Validate required environment variables
if [ -z "$VERCEL_API_TOKEN" ] || [ -z "$VERCEL_PROJECT_ID" ]; then
    echo "❌ Missing Vercel credentials in .env"
    echo "Please set VERCEL_API_TOKEN and VERCEL_PROJECT_ID"
    exit 1
fi

echo "✅ Vercel credentials loaded"
echo "   Project ID: $VERCEL_PROJECT_ID"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please run 'bun run setup' first."
    exit 1
fi

# Pull Vercel project configuration
echo ""
echo "📥 Pulling Vercel project configuration..."
vercel pull --yes --token "$VERCEL_API_TOKEN" --environment=production --project="$VERCEL_PROJECT_ID" || true

# Build the project
echo ""
echo "🔨 Building project..."
bun run build

# Deploy to Vercel
echo ""
echo "📤 Deploying to Vercel..."
vercel deploy --prebuilt --token "$VERCEL_API_TOKEN" --prod --project="$VERCEL_PROJECT_ID"

echo ""
echo "✅ Vercel deployment complete!"
echo ""
echo "🌐 Your app is live at:"
echo "   https://$NEXT_PUBLIC_APP_URL"
echo ""
echo "📊 View deployment at:"
echo "   https://vercel.com/team/$vercel_team_id/$VERCEL_PROJECT_ID"