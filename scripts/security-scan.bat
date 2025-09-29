@echo off
REM Security Scan Script for RistoManager Pro (Windows)
REM Run this script periodically to check for security issues

echo 🔒 Starting Security Scan...

REM Create reports directory
mkdir reports 2>nul

REM 1. NPM Audit
echo 📦 Running NPM audit...
npm audit --audit-level moderate > reports\npm-audit.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ NPM audit passed
) else (
    echo ❌ NPM audit found issues - check reports\npm-audit.txt
)

REM 2. Dependency check
echo 🔍 Checking dependencies...
npx audit-ci --config .audit-ci.json > reports\dependency-check.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Dependency check passed
) else (
    echo ❌ Dependency check found issues - check reports\dependency-check.txt
)

REM 3. Check for known vulnerable packages
echo 🛡️ Scanning for vulnerable packages...
npx snyk test --json > reports\snyk-report.json 2>&1
npx snyk test > reports\snyk-report.txt 2>&1

REM 4. License check
echo 📄 Checking licenses...
npx license-checker --json > reports\licenses.json 2>&1
npx license-checker > reports\licenses.txt 2>&1

echo 🔒 Security scan completed. Check reports\ directory for details.
