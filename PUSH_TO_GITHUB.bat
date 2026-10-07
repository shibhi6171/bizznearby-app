@echo off
setlocal
title Upload BizzNearby to GitHub
cd /d "%~dp0"

echo ============================================================
echo  This uploads the whole BizzNearby project, keeping all folders,
echo  to:  https://github.com/shibhi6171/Bizznearby
echo.
echo  WARNING: it REPLACES everything currently in that repository.
echo.
echo  BEFORE YOU CONTINUE: open https://github.com in your browser and
echo  make sure you are signed in as  shibhi6171  (sign out of any other
echo  GitHub account first). Windows may have saved a different account.
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Install it from https://git-scm.com/download/win
  echo then double-click this file again.
  pause
  exit /b 1
)

if not exist "client\package.json" (
  echo Cannot find client\package.json. Put this file inside the "bizznearby" folder
  echo that contains the client, server and supabase folders, then run it again.
  pause
  exit /b 1
)

echo Press any key to continue, or close this window to cancel.
pause >nul

echo.
echo Removing any saved GitHub login from Windows so you can sign in as shibhi6171...
cmdkey /delete:git:https://github.com >nul 2>nul
cmdkey /delete:LegacyGeneric:target=git:https://github.com >nul 2>nul

if exist ".git" rmdir /s /q ".git"
git init -b main
git config core.autocrlf false
git add .
git -c user.name="BizzNearby" -c user.email="bizznearby@users.noreply.github.com" commit -q -m "BizzNearby full project"
git remote add origin https://shibhi6171@github.com/shibhi6171/Bizznearby.git
echo.
echo A sign-in window will open. Sign in as  shibhi6171  and click Authorize.
echo.
git push -f origin main
if errorlevel 1 (
  echo.
  echo The upload failed. Copy the message above and send it to Claude.
) else (
  echo.
  echo DONE. Open https://github.com/shibhi6171/Bizznearby and check you see:
  echo   client   server   supabase   README.md   render.yaml   vercel.json
)
pause
