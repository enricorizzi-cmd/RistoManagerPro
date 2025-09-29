#!/bin/bash

# Quality Scan Script for RistoManager Pro
# Run this script to check code quality and run tests

echo "🎯 Starting Quality Scan..."

# Create reports directory
mkdir -p reports

# 1. Linting
echo "🔍 Running ESLint..."
npm run lint > reports/eslint-report.txt 2>&1
if [ $? -eq 0 ]; then
    echo "✅ ESLint passed"
else
    echo "❌ ESLint found issues - check reports/eslint-report.txt"
fi

# 2. Type checking
echo "🔧 Running TypeScript type check..."
npm run type-check > reports/typescript-report.txt 2>&1
if [ $? -eq 0 ]; then
    echo "✅ TypeScript type check passed"
else
    echo "❌ TypeScript type check found issues - check reports/typescript-report.txt"
fi

# 3. Format check
echo "💅 Checking code formatting..."
npm run format:check > reports/prettier-report.txt 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Code formatting is correct"
else
    echo "❌ Code formatting issues found - check reports/prettier-report.txt"
fi

# 4. Run tests with coverage
echo "🧪 Running tests with coverage..."
npm run test:coverage > reports/test-report.txt 2>&1
if [ $? -eq 0 ]; then
    echo "✅ All tests passed"
else
    echo "❌ Some tests failed - check reports/test-report.txt"
fi

# 5. Copy coverage report
if [ -d "coverage" ]; then
    cp -r coverage reports/
    echo "📊 Coverage report copied to reports/coverage/"
fi

# 6. Code complexity analysis (if available)
echo "📈 Analyzing code complexity..."
if command -v npx &> /dev/null; then
    npx complexity-report src/ > reports/complexity-report.txt 2>&1 || true
fi

echo "🎯 Quality scan completed. Check reports/ directory for details."
