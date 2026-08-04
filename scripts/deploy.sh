#!/bin/bash
# ============================================
# ILUNI FTE WebApps - Complete Deployment Script
# ============================================

set -e  # Exit on error

echo "🚀 Starting complete deployment..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Make sure both deploy scripts are executable
chmod +x "$SCRIPT_DIR/deploy-supabase.sh"
chmod +x "$SCRIPT_DIR/deploy-vercel.sh"

# Deploy Supabase first
echo ""
echo "=========================================="
echo "Step 1: Deploying Supabase..."
echo "=========================================="
bash "$SCRIPT_DIR/deploy-supabase.sh"

echo ""
echo "=========================================="
echo "Step 2: Deploying Vercel..."
echo "=========================================="
bash "$SCRIPT_DIR/deploy-vercel.sh"

echo ""
echo "🎉 Complete deployment successful!"
echo ""
echo "📋 Summary:"
echo "  ✅ Supabase schema deployed"
echo "  ✅ Vercel app deployed"
echo ""
echo "🔗 Links:"
echo "  App URL: https://$NEXT_PUBLIC_APP_URL"
echo "  Supabase: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID"
echo "  Vercel: https://vercel.com/team/$vercel_team_id/$VERCEL_PROJECT_ID"