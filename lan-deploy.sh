#!/bin/bash

echo "🚀 FixIt LAN Competition Mode Deployment"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Install SQLite dependencies
echo "📦 Installing SQLite dependencies..."
npm install sqlite3 sqlite

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Build frontend for production
echo "🔨 Building frontend for production..."
npm run build

# Go back to root directory
cd ..

# Create competition.db if it doesn't exist
echo "🗄️ Setting up SQLite database..."
if [ ! -f "backend/competition.db" ]; then
    touch backend/competition.db
    echo "✅ Created competition.db"
else
    echo "✅ competition.db already exists"
fi

# Create .env file for LAN mode if it doesn't exist
if [ ! -f "backend/.env.lan" ]; then
    cat > backend/.env.lan << EOF
# LAN Configuration
PORT=5000
NODE_ENV=production
JWT_SECRET=fixit-lan-secret-2024
EOF
    echo "✅ Created backend/.env.lan"
else
    echo "✅ backend/.env.lan already exists"
fi

echo ""
echo "🎉 LAN Deployment Complete!"
echo "=========================================="
echo ""
echo "To start the LAN competition server:"
echo "   cd backend"
echo "   npm run lan:start"
echo ""
echo "The server will display the access URL for other devices"
echo ""
