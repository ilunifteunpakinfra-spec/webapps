#!/bin/bash
# ============================================
# ILUNI FTE WebApps - Development Setup Script
# ============================================

set -e  # Exit on error

echo "🚀 Setting up ILUNI FTE WebApps development environment..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first: https://bun.sh"
    exit 1
fi

echo "✅ Bun version: $(bun --version)"
echo ""

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        echo "✅ .env file created at: $PROJECT_ROOT/.env"
        echo "⚠️  Please update .env with your actual Supabase and Vercel credentials"
    else
        echo "❌ .env.example not found. Cannot create .env file."
        exit 1
    fi
else
    echo "✅ .env file exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies with Bun..."
cd "$PROJECT_ROOT"
bun install

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Skipping automatic install."
    echo "   Install manually: https://supabase.com/docs/guides/cli"
else
    echo "✅ Supabase CLI installed: $(supabase --version)"
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Skipping automatic install."
    echo "   Install manually: npm install -g vercel"
else
    echo "✅ Vercel CLI installed"
fi

echo ""
echo "=========================================="
echo "✨ Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update .env file with your Supabase and Vercel credentials:"
echo "   nano $PROJECT_ROOT/.env"
echo ""
echo "2. Start development server:"
echo "   cd $PROJECT_ROOT"
echo "   bun dev"
echo ""
echo "3. Visit: http://localhost:3000"
echo ""
echo "=========================================="
echo "Available commands:"
echo "=========================================="
echo "  bun dev                  - Start development server"
echo "  bun run setup            - Run this setup script"
echo "  bun run deploy:supabase  - Deploy database schema"
echo "  bun run deploy:vercel    - Deploy to Vercel"
echo "  bun run deploy           - Deploy everything"
echo ""
