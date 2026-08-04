#!/bin/bash
# ============================================
# ILUNI FTE WebApps - Create Admin User Script
# ============================================

set -e

echo "👤 Admin User Setup"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Run 'bun run setup' first."
    exit 1
fi

# Load environment variables
source .env

# Validate Supabase credentials
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Missing Supabase credentials in .env"
    exit 1
fi

echo "📋 This script will create an admin user in Supabase Auth"
echo ""
echo "Required information:"
echo "  - Email address (will be used for login)"
echo "  - Password (min 6 characters)"
echo "  - Full name"
echo "  - Role: 'super_admin' or 'admin'"
echo ""

# Prompt for user details
read -p "Enter email: " ADMIN_EMAIL
read -p "Enter password (min 6 chars): " ADMIN_PASSWORD
read -p "Enter full name: " ADMIN_NAME
read -p "Enter role (super_admin/admin) [default: super_admin]: " ADMIN_ROLE
ADMIN_ROLE=${ADMIN_ROLE:-super_admin}

echo ""
echo "Creating admin user..."

# Create user via Supabase Admin API
RESPONSE=$(curl -s -X POST \
  "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"role\": \"$ADMIN_ROLE\",
      \"nama\": \"$ADMIN_NAME\"
    }
  }")

# Check if creation was successful
if echo "$RESPONSE" | grep -q "id"; then
    USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo ""
    echo "✅ Admin user created successfully!"
    echo ""
    echo "👤 Admin Details:"
    echo "   Email: $ADMIN_EMAIL"
    echo "   Name: $ADMIN_NAME"
    echo "   Role: $ADMIN_ROLE"
    echo "   User ID: $USER_ID"
    echo ""
    echo "🔐 Login at: http://localhost:3000/login"
    echo ""
    echo "⚠️  IMPORTANT: Save these credentials securely!"
    echo ""
else
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"msg":"[^"]*"' | cut -d'"' -f4)
    echo "❌ Failed to create admin user: $ERROR_MSG"
    exit 1
fi