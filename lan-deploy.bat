@echo off
echo 🚀 FixIt LAN Competition Mode Deployment
echo ==========================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install

REM Install SQLite dependencies
echo 📦 Installing SQLite dependencies...
call npm install sqlite3 sqlite

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd ..\frontend
call npm install

REM Build frontend for production
echo 🔨 Building frontend for production...
call npm run build

REM Go back to root directory
cd ..

REM Create competition.db if it doesn't exist
echo 🗄️ Setting up SQLite database...
if not exist "backend\competition.db" (
    type nul > backend\competition.db
    echo ✅ Created competition.db
) else (
    echo ✅ competition.db already exists
)

REM Create .env file for LAN mode if it doesn't exist
if not exist "backend\.env.lan" (
    (
        echo # LAN Configuration
        echo PORT=5000
        echo NODE_ENV=production
        echo JWT_SECRET=fixit-lan-secret-2024
    ) > backend\.env.lan
    echo ✅ Created backend\.env.lan
) else (
    echo ✅ backend\.env.lan already exists
)

echo.
echo 🎉 LAN Deployment Complete!
echo ==========================================
echo.
echo To start the LAN competition server:
echo    cd backend
echo    npm run lan:start
echo.
echo The server will display the access URL for other devices
echo.
pause
