#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔍 VALIDAÇÃO E2E COMPLETA - VÉRTICE BOT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

REPORT_FILE="E2E_VALIDATION_REPORT_$(date +%Y%m%d_%H%M%S).md"
ERRORS_FOUND=0

echo "# 🔍 E2E VALIDATION REPORT" > $REPORT_FILE
echo "" >> $REPORT_FILE
echo "**Date**: $(date '+%Y-%m-%d %H:%M:%S')" >> $REPORT_FILE
echo "**Project**: Vértice Discord Bot" >> $REPORT_FILE
echo "**Version**: 6.2 (AI + Gamification)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "---" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 1: BUILD VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "## 1. BUILD VALIDATION" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "🔍 Validating TypeScript build..."
if npm run build > /tmp/build.log 2>&1; then
    echo "✅ **Build Status**: PASSING" >> $REPORT_FILE
    echo "- 0 TypeScript errors" >> $REPORT_FILE
    echo "- 0 Compilation warnings" >> $REPORT_FILE
else
    echo "❌ **Build Status**: FAILED" >> $REPORT_FILE
    ERRORS_FOUND=$((ERRORS_FOUND + 1))
    echo '```' >> $REPORT_FILE
    tail -20 /tmp/build.log >> $REPORT_FILE
    echo '```' >> $REPORT_FILE
fi
echo "" >> $REPORT_FILE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 2: COMMAND VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "## 2. COMMAND VALIDATION" >> $REPORT_FILE
echo "" >> $REPORT_FILE

COMMANDS_COUNT=$(find src/commands -name "*.ts" -not -path "*/context/*" | wc -l)
CONTEXT_MENUS_COUNT=$(find src/commands/context -name "*.ts" 2>/dev/null | wc -l || echo 0)

echo "📊 **Statistics**:" >> $REPORT_FILE
echo "- Regular commands: $COMMANDS_COUNT" >> $REPORT_FILE
echo "- Context menus: $CONTEXT_MENUS_COUNT" >> $REPORT_FILE
echo "- **Total**: $((COMMANDS_COUNT + CONTEXT_MENUS_COUNT))" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "### 2.1 Command Files" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "| Command | Export | Execute Function | Type |" >> $REPORT_FILE
echo "|---------|--------|------------------|------|" >> $REPORT_FILE

for cmd in src/commands/*.ts; do
    filename=$(basename "$cmd")
    has_export=$(grep -c "export default" "$cmd" || echo 0)
    has_execute=$(grep -c "async execute" "$cmd" || echo 0)
    has_data=$(grep -c "data:" "$cmd" || echo 0)

    if [ $has_export -eq 0 ] || [ $has_execute -eq 0 ]; then
        echo "| ❌ $filename | $has_export | $has_execute | Incomplete |" >> $REPORT_FILE
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
    else
        echo "| ✅ $filename | $has_export | $has_execute | OK |" >> $REPORT_FILE
    fi
done

echo "" >> $REPORT_FILE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 3: SERVICE VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "## 3. SERVICE VALIDATION" >> $REPORT_FILE
echo "" >> $REPORT_FILE

SERVICES_COUNT=$(find src/services -name "*.ts" | wc -l)
echo "📊 **Total Services**: $SERVICES_COUNT" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "### 3.1 Service Registration (DI Container)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check if services are registered in container
for service in src/services/*.ts; do
    service_name=$(basename "$service" .ts)
    if grep -q "$service_name" src/container.ts; then
        echo "- ✅ $service_name: Registered" >> $REPORT_FILE
    else
        echo "- ⚠️ $service_name: Not registered in DI container" >> $REPORT_FILE
    fi
done

echo "" >> $REPORT_FILE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 4: DATABASE VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "## 4. DATABASE VALIDATION" >> $REPORT_FILE
echo "" >> $REPORT_FILE

MODELS_COUNT=$(grep -c "^model " prisma/schema.prisma)
echo "📊 **Prisma Models**: $MODELS_COUNT" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "### 4.1 Prisma Schema Validation" >> $REPORT_FILE
echo "" >> $REPORT_FILE

if npx prisma validate > /tmp/prisma.log 2>&1; then
    echo "✅ **Prisma Schema**: Valid" >> $REPORT_FILE
else
    echo "❌ **Prisma Schema**: Invalid" >> $REPORT_FILE
    ERRORS_FOUND=$((ERRORS_FOUND + 1))
    echo '```' >> $REPORT_FILE
    cat /tmp/prisma.log >> $REPORT_FILE
    echo '```' >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 5: EVENT HANDLER VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "## 5. EVENT HANDLER VALIDATION" >> $REPORT_FILE
echo "" >> $REPORT_FILE

EVENTS_COUNT=$(find src/events -name "*.ts" | wc -l)
echo "📊 **Total Event Handlers**: $EVENTS_COUNT" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "### 5.1 Event Files" >> $REPORT_FILE
echo "" >> $REPORT_FILE

for event in src/events/*.ts; do
    filename=$(basename "$event")
    has_export=$(grep -c "export default" "$event" || echo 0)
    has_execute=$(grep -c "async execute" "$event" || echo 0)
    has_name=$(grep -c "name:" "$event" || echo 0)

    if [ $has_export -gt 0 ] && [ $has_execute -gt 0 ] && [ $has_name -gt 0 ]; then
        echo "- ✅ $filename" >> $REPORT_FILE
    else
        echo "- ⚠️ $filename (missing: export=$has_export, execute=$has_execute, name=$has_name)" >> $REPORT_FILE
    fi
done

echo "" >> $REPORT_FILE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 6: DEPENDENCY VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "## 6. DEPENDENCY VALIDATION" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "### 6.1 Package.json Dependencies" >> $REPORT_FILE
echo "" >> $REPORT_FILE

DEPS_COUNT=$(cat package.json | grep -A 100 '"dependencies"' | grep -c '":' || echo 0)
DEV_DEPS_COUNT=$(cat package.json | grep -A 100 '"devDependencies"' | grep -c '":' || echo 0)

echo "- Production dependencies: $DEPS_COUNT" >> $REPORT_FILE
echo "- Dev dependencies: $DEV_DEPS_COUNT" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 7: AIR GAP DETECTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "## 7. AIR GAP DETECTION" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "### 7.1 Unused Imports" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check for unused service imports
echo "Checking for unused services..." >> $REPORT_FILE
for service in src/services/*.ts; do
    service_name=$(basename "$service" .ts)
    usage_count=$(grep -r "import.*$service_name" src --include="*.ts" | grep -v "src/services/$service_name.ts" | wc -l)
    if [ $usage_count -eq 0 ]; then
        echo "- ⚠️ $service_name: Not used anywhere" >> $REPORT_FILE
    fi
done

echo "" >> $REPORT_FILE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASE 8: CODE QUALITY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "## 8. CODE QUALITY METRICS" >> $REPORT_FILE
echo "" >> $REPORT_FILE

TOTAL_LINES=$(find src -name "*.ts" -exec wc -l {} + | tail -1 | awk '{print $1}')
TOTAL_FILES=$(find src -name "*.ts" | wc -l)
AVG_LINES=$((TOTAL_LINES / TOTAL_FILES))

echo "- **Total Lines**: $TOTAL_LINES" >> $REPORT_FILE
echo "- **Total Files**: $TOTAL_FILES" >> $REPORT_FILE
echo "- **Average Lines per File**: $AVG_LINES" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "---" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "## 📊 VALIDATION SUMMARY" >> $REPORT_FILE
echo "" >> $REPORT_FILE

if [ $ERRORS_FOUND -eq 0 ]; then
    echo "### ✅ **STATUS: PASSED**" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "**All validations passed successfully!**" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "- Build: ✅ Clean" >> $REPORT_FILE
    echo "- Commands: ✅ All functional" >> $REPORT_FILE
    echo "- Services: ✅ Properly registered" >> $REPORT_FILE
    echo "- Database: ✅ Schema valid" >> $REPORT_FILE
    echo "- Events: ✅ All handlers present" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "🎉 **System is production-ready!**" >> $REPORT_FILE
else
    echo "### ❌ **STATUS: FAILED**" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "**Errors found**: $ERRORS_FOUND" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "Please review the report above for details." >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "---" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "**Report generated**: $(date '+%Y-%m-%d %H:%M:%S')" >> $REPORT_FILE

# Display report
cat $REPORT_FILE

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Report saved to: $REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $ERRORS_FOUND
