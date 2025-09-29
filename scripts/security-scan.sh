#!/bin/bash

# Security Scan Script for RistoManager Pro
# Run this script periodically to check for security issues

echo "🔒 Starting Security Scan..."

# Create reports directory
mkdir -p reports

# 1. NPM Audit
echo "📦 Running NPM audit..."
npm audit --audit-level moderate > reports/npm-audit.txt 2>&1
if [ $? -eq 0 ]; then
    echo "✅ NPM audit passed"
else
    echo "❌ NPM audit found issues - check reports/npm-audit.txt"
fi

# 2. Dependency check
echo "🔍 Checking dependencies..."
npx audit-ci --config .audit-ci.json > reports/dependency-check.txt 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Dependency check passed"
else
    echo "❌ Dependency check found issues - check reports/dependency-check.txt"
fi

# 3. Check for known vulnerable packages
echo "🛡️ Scanning for vulnerable packages..."
npx snyk test --json > reports/snyk-report.json 2>&1 || true
npx snyk test > reports/snyk-report.txt 2>&1 || true

# 4. License check
echo "📄 Checking licenses..."
npx license-checker --json > reports/licenses.json 2>&1 || true
npx license-checker > reports/licenses.txt 2>&1 || true

echo "🔒 Security scan completed. Check reports/ directory for details."
