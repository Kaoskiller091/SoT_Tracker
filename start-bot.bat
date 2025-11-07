@echo off
title Sea of Thieves Companion Bot
color 0A

echo ===================================================
echo       SEA OF THIEVES COMPANION BOT LAUNCHER
echo ===================================================
echo ===================================================
echo   	  Created by:Kaoskiller09
echo ===================================================
echo.
echo Starting bot initialization...
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if .env file exists
if not exist .env (
    color 0E
    echo WARNING: .env file not found.
    echo Creating a template .env file...
    echo DISCORD_TOKEN=your_discord_token_here> .env
    echo DB_HOST=localhost>> .env
    echo DB_PORT=3306>> .env
    echo DB_USER=root>> .env
    echo DB_PASSWORD=>> .env
    echo DB_NAME=sotc>> .env
    echo API_PORT=3001>> .env
    echo ADMIN_IDS=your_discord_id_here>> .env
    echo CLIENT_ID=your_bot_client_id_here>> .env
    echo.
    echo Please edit the .env file with your actual credentials.
    echo.
    pause
    exit /b 1
)

:: Check if MySQL is running
echo Checking MySQL status...
sc query MySQL >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0E
    echo WARNING: MySQL service not found or not running.
    echo The bot requires MySQL to be running.
    echo.
    choice /C YN /M "Do you want to continue anyway?"
    if %ERRORLEVEL% EQU 2 exit /b 1
) else (
    echo MySQL service is running.
)

:: Create logs directory if it doesn't exist
if not exist logs mkdir logs

:: Get current date and time for log filename
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "logdate=%dt:~0,8%_%dt:~8,6%"
set "logfile=logs\bot_%logdate%.log"

echo.
echo Starting bot with the following configuration:
echo - Log file: %logfile%
echo - Database: MySQL
echo - API Port: 3001 (default)
echo.

echo Starting bot... Press Ctrl+C to stop or use /shutdown command.
echo.

:: Start the bot and log output
node index.js > %logfile% 2>&1

:: Check if the bot exited with code 0 (graceful shutdown)
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo.
    echo Bot was shut down gracefully.
    echo.
) else (
    color 0C
    echo.
    echo ERROR: The bot crashed with exit code %ERRORLEVEL%.
    echo Check the log file for details: %logfile%
    echo.
    
    :: Show the last few lines of the log
    echo Last few lines of the log:
    echo ----------------------------
    type %logfile% | findstr /v /c:"" | tail -n 10
    echo ----------------------------
    echo.
    
    choice /C YN /M "Do you want to restart the bot?"
    if %ERRORLEVEL% EQU 1 (
        color 0A
        echo Restarting bot...
        goto :restart
    )
)

echo.
echo Press any key to exit...
pause > nul
exit /b 0

:restart
echo.
echo Restarting bot in 5 seconds...
timeout /t 5 /nobreak > nul
start "" "%~f0"
exit /b 0
