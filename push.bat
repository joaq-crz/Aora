@echo off
echo ========================================
echo Pushing to GitHub: Aora
echo ========================================
echo.

echo [1/6] Checking git status...
git status
echo.

echo [2/6] Adding all files...
git add .
echo.

echo [3/6] Committing changes...
git commit -m "feat: Multi-Persona AI Sales Agent with Gemini 3.5 Flash"
echo.

echo [4/6] Setting remote repository...
git remote add origin https://github.com/joaq-crz/Aora.git 2>nul
git remote set-url origin https://github.com/joaq-crz/Aora.git
echo.

echo [5/6] Ensuring main branch...
git branch -M main
echo.

echo [6/6] Pushing to GitHub...
git push -u origin main
echo.

echo ========================================
echo Done! Check: https://github.com/joaq-crz/Aora
echo ========================================
pause
