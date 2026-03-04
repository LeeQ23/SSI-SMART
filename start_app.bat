@echo off
echo Starting SSI Smart Manufacturing System...

:: Start Backend
start "Backend Server" cmd /k "cd backend && node server.js"

:: Start Frontend
start "Frontend Client" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5003
echo Frontend: http://localhost:3000
echo.
echo You can close this window, but keep the other two windows open.
pause
