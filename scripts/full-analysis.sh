#!/bin/bash

# Full Analysis Script for RistoManager Pro
# Run this script for comprehensive analysis of security, performance, and quality

echo "🚀 Starting Full Analysis of RistoManager Pro..."
echo "=================================================="

# Create reports directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="reports/full_analysis_$TIMESTAMP"
mkdir -p "$REPORT_DIR"

echo "📁 Reports will be saved to: $REPORT_DIR"

# 1. Security Analysis
echo ""
echo "🔒 PHASE 1: Security Analysis"
echo "-----------------------------"
bash scripts/security-scan.sh
cp -r reports/*.txt reports/*.json "$REPORT_DIR/" 2>/dev/null || true

# 2. Quality Analysis
echo ""
echo "🎯 PHASE 2: Quality Analysis"
echo "----------------------------"
bash scripts/quality-scan.sh
cp -r reports/*.txt reports/coverage "$REPORT_DIR/" 2>/dev/null || true

# 3. Performance Analysis
echo ""
echo "⚡ PHASE 3: Performance Analysis"
echo "--------------------------------"
bash scripts/performance-scan.sh
cp -r reports/*.html reports/*.txt "$REPORT_DIR/" 2>/dev/null || true

# 4. Generate Summary Report
echo ""
echo "📋 Generating Summary Report..."
cat > "$REPORT_DIR/SUMMARY.md" << EOF
# RistoManager Pro - Full Analysis Report
Generated on: $(date)

## Analysis Overview
- **Security**: Check security-*.txt files
- **Quality**: Check eslint-, typescript-, prettier-, test-*.txt files
- **Performance**: Check lighthouse.html and bundle-*.txt files
- **Coverage**: Check coverage/ directory

## Quick Commands
\`\`\`bash
# Run individual scans
npm run security:check
npm run quality:check
npm run bundle:analyze

# Fix common issues
npm run lint:fix
npm run format
npm run audit:fix
\`\`\`

## Next Steps
1. Review all reports in this directory
2. Address any critical issues found
3. Update dependencies if needed
4. Improve test coverage if below 80%
5. Optimize bundle size if over 1MB
EOF

echo ""
echo "✅ Full analysis completed!"
echo "📁 All reports saved to: $REPORT_DIR"
echo "📋 Summary report: $REPORT_DIR/SUMMARY.md"
echo ""
echo "🔍 To view reports:"
echo "   cd $REPORT_DIR"
echo "   ls -la"
echo ""
echo "🛠️ To fix issues:"
echo "   npm run lint:fix"
echo "   npm run format"
echo "   npm run audit:fix"
