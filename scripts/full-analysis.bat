@echo off
REM Full Analysis Script for RistoManager Pro (Windows)
REM Run this script for comprehensive analysis of security, performance, and quality

echo 🚀 Starting Full Analysis of RistoManager Pro...
echo ==================================================

REM Create reports directory with timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "TIMESTAMP=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"
set "REPORT_DIR=reports\full_analysis_%TIMESTAMP%"
mkdir "%REPORT_DIR%" 2>nul

echo 📁 Reports will be saved to: %REPORT_DIR%

REM 1. Security Analysis
echo.
echo 🔒 PHASE 1: Security Analysis
echo -----------------------------
call scripts\security-scan.bat
copy reports\*.txt "%REPORT_DIR%\" 2>nul
copy reports\*.json "%REPORT_DIR%\" 2>nul

REM 2. Quality Analysis
echo.
echo 🎯 PHASE 2: Quality Analysis
echo ----------------------------
call scripts\quality-scan.bat
copy reports\*.txt "%REPORT_DIR%\" 2>nul
xcopy reports\coverage "%REPORT_DIR%\coverage\" /E /I 2>nul

REM 3. Performance Analysis
echo.
echo ⚡ PHASE 3: Performance Analysis
echo --------------------------------
call scripts\performance-scan.bat
copy reports\*.html "%REPORT_DIR%\" 2>nul
copy reports\*.txt "%REPORT_DIR%\" 2>nul

REM 4. Generate Summary Report
echo.
echo 📋 Generating Summary Report...
(
echo # RistoManager Pro - Full Analysis Report
echo Generated on: %date% %time%
echo.
echo ## Analysis Overview
echo - **Security**: Check security-*.txt files
echo - **Quality**: Check eslint-, typescript-, prettier-, test-*.txt files
echo - **Performance**: Check lighthouse.html and bundle-*.txt files
echo - **Coverage**: Check coverage/ directory
echo.
echo ## Quick Commands
echo ```bash
echo # Run individual scans
echo npm run security:check
echo npm run quality:check
echo npm run bundle:analyze
echo.
echo # Fix common issues
echo npm run lint:fix
echo npm run format
echo npm run audit:fix
echo ```
echo.
echo ## Next Steps
echo 1. Review all reports in this directory
echo 2. Address any critical issues found
echo 3. Update dependencies if needed
echo 4. Improve test coverage if below 80%%
echo 5. Optimize bundle size if over 1MB
) > "%REPORT_DIR%\SUMMARY.md"

echo.
echo ✅ Full analysis completed!
echo 📁 All reports saved to: %REPORT_DIR%
echo 📋 Summary report: %REPORT_DIR%\SUMMARY.md
echo.
echo 🔍 To view reports:
echo    cd %REPORT_DIR%
echo    dir
echo.
echo 🛠️ To fix issues:
echo    npm run lint:fix
echo    npm run format
echo    npm run audit:fix

pause
