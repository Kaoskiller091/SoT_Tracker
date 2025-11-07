@echo off
echo Starting Sea of Thieves Discord Bot...
echo.

:: Deploy slash commands
echo Deploying slash commands...
node deploy-commands.js
echo.

:: Start the bot
echo Starting bot...
node index.js

:: If the bot crashes, this will prevent the window from closing immediately
pause
