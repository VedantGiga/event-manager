@echo off
echo Installing Event Management System...
echo.

echo [1/4] Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies
    pause
    exit /b 1
)

echo [2/4] Installing frontend dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo Error installing frontend dependencies
    pause
    exit /b 1
)
cd ..

echo [3/4] Checking environment...
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
)

echo [4/4] Starting servers...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
call npm run dev