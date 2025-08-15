@echo off
echo Starting Event Management System...
echo.

echo Installing dependencies...
call npm install
cd client
call npm install
cd ..

echo.
echo Starting development servers...
call npm run dev