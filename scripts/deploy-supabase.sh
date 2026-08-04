#!/bin/bash
# ============================================
# ILUNI FTE WebApps - Supabase Deployment Script
# ============================================

set -e  # Exit on error

echo "🗄️  Deploying to Supabase..."

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run 'bun run setup' first."
    exit 1
fi

# Source .env file
source .env

# Validate required environment variables
if [ -z "$SUPABASE_ACCESS_TOKEN" ] || [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ Missing Supabase credentials in .env"
    echo "Please set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_ID"
    exit 1
fi

echo "✅ Supabase credentials loaded"
echo "   Project ID: $SUPABASE_PROJECT_ID"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please run 'bun run setup' first."
    exit 1
fi

# Link to Supabase project (if not already linked)
if [ ! -f .supabase/config.toml ]; then
    echo "🔗 Linking to Supabase project..."
    supabase link --project-ref "$SUPABASE_PROJECT_ID" --token "$SUPABASE_ACCESS_TOKEN"
else
    echo "✅ Already linked to Supabase project"
fi

# Push schema to Supabase
echo ""
echo "📤 Pushing schema to Supabase..."
supabase db push --project-ref "$SUPABASE_PROJECT_ID" --token "$SUPABASE_ACCESS_TOKEN"

echo ""
echo "✅ Supabase deployment complete!"
echo ""
echo "📊 View your database at:"
echo "   https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID/editor"