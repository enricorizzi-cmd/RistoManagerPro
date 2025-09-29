@echo off
REM Performance Scan Script for RistoManager Pro (Windows)
REM Run this script to analyze performance metrics

echo ⚡ Starting Performance Scan...

REM Create reports directory
mkdir reports 2>nul

REM 1. Build the application
echo 🏗️ Building application...
npm run build

REM 2. Bundle analysis
echo 📊 Analyzing bundle size...
npm run bundle:analyze

REM 3. Lighthouse audit (requires app to be running)
echo 🚀 Starting Lighthouse audit...
echo Note: Make sure the app is running on http://localhost:3000
npx lighthouse http://localhost:3000 --output html --output-path ./reports/lighthouse.html --chrome-flags="--headless" --quiet 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Lighthouse audit failed - make sure app is running
)

REM 4. Bundle size check
echo 📦 Checking bundle sizes...
dir dist\assets\ > reports\bundle-sizes.txt 2>nul

REM 5. Memory usage analysis (if app is running)
echo 🧠 Memory usage analysis...
tasklist | findstr vite > reports\memory-usage.txt 2>nul
if %errorlevel% equ 0 (
    echo Vite process found, analyzing memory usage...
) else (
    echo No Vite process found for memory analysis
)

echo ⚡ Performance scan completed. Check reports\ directory for details.
