#!/bin/bash

# Demo Mode QA Test Script
# This script will be executed once demo mode is ready

set -e

FRONTEND_DIR="/Users/tyler/Desktop/Gauntlet/location-detection-ai/frontend"
TEST_LOG="$FRONTEND_DIR/demo-test-results.log"

echo "======================================"
echo "Demo Mode QA Test Execution"
echo "Date: $(date)"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Function to log results
log_test() {
    local status=$1
    local test_name=$2
    local details=$3

    echo -e "${status} ${test_name}" | tee -a "$TEST_LOG"
    if [ -n "$details" ]; then
        echo "  $details" | tee -a "$TEST_LOG"
    fi
}

pass() {
    ((TESTS_PASSED++))
    log_test "${GREEN}✓${NC}" "$1" "$2"
}

fail() {
    ((TESTS_FAILED++))
    log_test "${RED}✗${NC}" "$1" "$2"
}

skip() {
    ((TESTS_SKIPPED++))
    log_test "${YELLOW}○${NC}" "$1" "$2"
}

# Initialize log file
echo "Demo Mode QA Test Results" > "$TEST_LOG"
echo "Date: $(date)" >> "$TEST_LOG"
echo "======================================" >> "$TEST_LOG"
echo "" >> "$TEST_LOG"

cd "$FRONTEND_DIR"

echo "1. Checking File Structure..."
echo "------------------------------------"

# Check demo directory exists
if [ -d "src/demo" ]; then
    pass "src/demo directory exists"
else
    fail "src/demo directory NOT FOUND"
fi

# Check subdirectories
for dir in "src/demo/assets/blueprints" "src/demo/data" "src/demo/mocks"; do
    if [ -d "$dir" ]; then
        pass "$dir exists"
    else
        fail "$dir NOT FOUND"
    fi
done

# Check key files
declare -a files=(
    "src/demo/data/detectionResults.ts"
    "src/demo/data/jobs.ts"
    "src/demo/data/uploadResponses.ts"
    "src/demo/mocks/handlers.ts"
    "src/demo/mocks/browser.ts"
    "src/demo/DemoBanner.tsx"
    "src/demo/README.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        pass "$file exists"
    else
        fail "$file NOT FOUND"
    fi
done

echo ""
echo "2. Checking package.json Configuration..."
echo "------------------------------------"

# Check for demo script
if grep -q '"demo"' package.json; then
    pass "npm run demo script found"
else
    fail "npm run demo script NOT CONFIGURED"
fi

# Check MSW dependency
if grep -q '"msw"' package.json; then
    pass "MSW dependency found"
else
    fail "MSW dependency NOT FOUND"
fi

echo ""
echo "3. TypeScript Validation..."
echo "------------------------------------"

if npm run typecheck 2>&1 | grep -q "error"; then
    fail "TypeScript errors found"
else
    pass "TypeScript validation passed"
fi

echo ""
echo "4. File Content Validation..."
echo "------------------------------------"

# Check if handlers.ts exports handlers
if [ -f "src/demo/mocks/handlers.ts" ]; then
    if grep -q "export.*handlers" src/demo/mocks/handlers.ts; then
        pass "Mock handlers exported correctly"
    else
        fail "Mock handlers not properly exported"
    fi
fi

# Check if DemoBanner.tsx is a valid React component
if [ -f "src/demo/DemoBanner.tsx" ]; then
    if grep -q "export.*DemoBanner" src/demo/DemoBanner.tsx; then
        pass "DemoBanner component exported correctly"
    else
        fail "DemoBanner component not properly exported"
    fi
fi

echo ""
echo "5. Blueprint Assets Check..."
echo "------------------------------------"

# Count blueprint files
if [ -d "src/demo/assets/blueprints" ]; then
    blueprint_count=$(find src/demo/assets/blueprints -type f \( -name "*.svg" -o -name "*.png" -o -name "*.jpg" \) | wc -l)
    if [ $blueprint_count -gt 0 ]; then
        pass "Found $blueprint_count blueprint asset(s)"
    else
        fail "No blueprint assets found"
    fi
fi

echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "${GREEN}Passed:${NC}  $TESTS_PASSED"
echo -e "${RED}Failed:${NC}  $TESTS_FAILED"
echo -e "${YELLOW}Skipped:${NC} $TESTS_SKIPPED"
echo "--------------------------------------"
echo "Total:   $((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))"
echo ""

# Write summary to log
echo "" >> "$TEST_LOG"
echo "======================================" >> "$TEST_LOG"
echo "Test Summary" >> "$TEST_LOG"
echo "======================================" >> "$TEST_LOG"
echo "Passed:  $TESTS_PASSED" >> "$TEST_LOG"
echo "Failed:  $TESTS_FAILED" >> "$TEST_LOG"
echo "Skipped: $TESTS_SKIPPED" >> "$TEST_LOG"
echo "Total:   $((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))" >> "$TEST_LOG"

# Exit with appropriate code
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Some tests failed. See $TEST_LOG for details.${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run 'npm run demo' to start the demo mode"
    echo "  2. Test the complete user flow manually"
    echo "  3. Check browser console for errors"
    echo "  4. Verify no network calls to real APIs"
    exit 0
fi
