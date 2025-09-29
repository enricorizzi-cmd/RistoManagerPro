#!/bin/bash

# Performance Scan Script for RistoManager Pro
# Run this script to analyze performance metrics

echo "⚡ Starting Performance Scan..."

# Create reports directory
mkdir -p reports

# 1. Build the application
echo "🏗️ Building application..."
npm run build

# 2. Bundle analysis
echo "📊 Analyzing bundle size..."
npm run bundle:analyze

# 3. Lighthouse audit (requires app to be running)
echo "🚀 Starting Lighthouse audit..."
echo "Note: Make sure the app is running on http://localhost:3000"
npx lighthouse http://localhost:3000 \
  --output html \
  --output-path ./reports/lighthouse.html \
  --chrome-flags="--headless" \
  --quiet || echo "⚠️ Lighthouse audit failed - make sure app is running"

# 4. Bundle size check
echo "📦 Checking bundle sizes..."
ls -la dist/assets/ > reports/bundle-sizes.txt

# 5. Memory usage analysis (if app is running)
echo "🧠 Memory usage analysis..."
if pgrep -f "vite" > /dev/null; then
    echo "Vite process found, analyzing memory usage..."
    ps aux | grep vite >> reports/memory-usage.txt
else
    echo "No Vite process found for memory analysis"
fi

echo "⚡ Performance scan completed. Check reports/ directory for details."
