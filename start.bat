@echo off
echo Starting SSI Smart Manufacturing System...

:: Start the Backend in a new window
echo Starting Backend Server on Port 5003...
start cmd /k "cd backend && node server.js"

:: Start the Frontend in a new window
echo Starting Frontend Development Server...
start cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo You can access the dashboard at: http://localhost:3000
echo.
pause
