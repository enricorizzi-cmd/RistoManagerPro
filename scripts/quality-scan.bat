@echo off
REM Quality Scan Script for RistoManager Pro (Windows)
REM Run this script to check code quality and run tests

echo 🎯 Starting Quality Scan...

REM Create reports directory
mkdir reports 2>nul

REM 1. Linting
echo 🔍 Running ESLint...
npm run lint > reports\eslint-report.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ ESLint passed
) else (
    echo ❌ ESLint found issues - check reports\eslint-report.txt
)

REM 2. Type checking
echo 🔧 Running TypeScript type check...
npm run type-check > reports\typescript-report.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ TypeScript type check passed
) else (
    echo ❌ TypeScript type check found issues - check reports\typescript-report.txt
)

REM 3. Format check
echo 💅 Checking code formatting...
npm run format:check > reports\prettier-report.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ Code formatting is correct
) else (
    echo ❌ Code formatting issues found - check reports\prettier-report.txt
)

REM 4. Run tests with coverage
echo 🧪 Running tests with coverage...
npm run test:coverage > reports\test-report.txt 2>&1
if %errorlevel% equ 0 (
    echo ✅ All tests passed
) else (
    echo ❌ Some tests failed - check reports\test-report.txt
)

REM 5. Copy coverage report
if exist coverage (
    xcopy coverage reports\coverage\ /E /I 2>nul
    echo 📊 Coverage report copied to reports\coverage\
)

echo 🎯 Quality scan completed. Check reports\ directory for details.
