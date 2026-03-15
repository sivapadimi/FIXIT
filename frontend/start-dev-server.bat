@echo off
echo 🚀 FixIt Frontend Development Server
echo ====================================
echo.
echo This script will start the React development server
echo which enables React Router and all navigation functionality
echo.
echo ❌ DO NOT open HTML files directly
echo ✅ ALWAYS use this development server
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found
    echo Please run this script from the frontend directory
    echo.
    echo Correct command:
    echo cd fixit-frontend
    echo start-dev-server.bat
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Error: npm install failed
        pause
        exit /b 1
    )
)

REM Start development server
echo 🌐 Starting React development server...
echo.
echo ✅ Server will start at: http://localhost:5173
echo ✅ Navigation buttons will work properly
echo ✅ React Router will be active
echo.
echo 🔄 Press Ctrl+C to stop the server
echo.
call npm run dev

pause
