#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# Sojori Orchestrator - API Comparison Test Script
# Tests API endpoints between old and new dashboard
# ═══════════════════════════════════════════════════════════════════════

# Configuration
API_BASE="https://dev.sojori.com/api/v1/orchestrator"
TOKEN="${SOJORI_API_TOKEN:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Stats
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}  🧪 Sojori Orchestrator - API Comparison Test Suite     ${PURPLE}║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if token is provided
if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Warning: No API token provided${NC}"
  echo "   Set SOJORI_API_TOKEN environment variable or edit this script"
  echo "   Some tests may fail without authentication"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
  echo ""
fi

# Helper function to make API call
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -n "$data" ]; then
    curl -s -w "\n%{http_code}" -X "$method" "${API_BASE}${endpoint}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -w "\n%{http_code}" -X "$method" "${API_BASE}${endpoint}" \
      -H "Authorization: Bearer ${TOKEN}"
  fi
}

# Test function
run_test() {
  local test_num=$1
  local test_name=$2
  local method=$3
  local endpoint=$4
  local data=$5
  local status=$6

  echo -e "${BLUE}Test ${test_num}: ${test_name}${NC}"
  echo "  Endpoint: ${method} ${endpoint}"

  RESPONSE=$(api_call "$method" "$endpoint" "$data")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$status" == "IMPLEMENTED" ]; then
    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
      echo -e "  ${GREEN}✅ PASS${NC} - HTTP ${HTTP_CODE}"

      # Show additional info based on endpoint
      if [[ "$endpoint" == *"/reservations"* ]] && [[ "$endpoint" != *"/"*"/"* ]]; then
        COUNT=$(echo "$BODY" | jq -r '.pagination.total // .data | length // 0' 2>/dev/null)
        echo "     Found ${COUNT} reservations"
      elif [[ "$endpoint" == *"/stats"* ]]; then
        TOTAL=$(echo "$BODY" | jq -r '.data.plans.total // 0' 2>/dev/null)
        ACTIVE=$(echo "$BODY" | jq -r '.data.plans.active // 0' 2>/dev/null)
        echo "     Total: ${TOTAL}, Active: ${ACTIVE}"
      fi

      PASS_COUNT=$((PASS_COUNT + 1))
    else
      echo -e "  ${RED}❌ FAIL${NC} - HTTP ${HTTP_CODE}"
      echo "$BODY" | jq -C 2>/dev/null || echo "$BODY"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
  else
    echo -e "  ${YELLOW}⚠️  SKIP${NC} - Not yet implemented in new dashboard"
    SKIP_COUNT=$((SKIP_COUNT + 1))
  fi

  echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# PHASE 1: FONCTIONNALITÉS DE BASE (P0)
# ═══════════════════════════════════════════════════════════════════════

echo -e "${PURPLE}═══ PHASE 1: Fonctionnalités de Base (P0) ═══${NC}"
echo ""

run_test "1.1" "Liste des réservations (ACTIVE)" \
  "GET" "/reservations?limit=10&offset=0&reservationStatus=ACTIVE&sortBy=recent" \
  "" "IMPLEMENTED"

run_test "1.2" "Stats globales orchestration" \
  "GET" "/orchestration/stats" \
  "" "IMPLEMENTED"

# Get first reservation for detail test
FIRST_RESA=$(curl -s "${API_BASE}/reservations?limit=1&reservationStatus=ACTIVE" \
  -H "Authorization: Bearer ${TOKEN}" 2>/dev/null | jq -r '.data[0].reservationNumber // ""')

if [ -n "$FIRST_RESA" ] && [ "$FIRST_RESA" != "null" ]; then
  run_test "1.3" "Détail d'un plan (${FIRST_RESA})" \
    "GET" "/reservations/${FIRST_RESA}" \
    "" "IMPLEMENTED"
else
  echo -e "${BLUE}Test 1.3: Détail d'un plan${NC}"
  echo -e "  ${YELLOW}⚠️  SKIP${NC} - No active reservations found for testing"
  SKIP_COUNT=$((SKIP_COUNT + 1))
  echo ""
fi

# Note: Skip cancel test in automated suite (destructive)
echo -e "${BLUE}Test 1.4: Annuler un plan${NC}"
echo -e "  ${YELLOW}⚠️  SKIP${NC} - Destructive operation, test manually if needed"
echo "  Manual test: curl -X POST \"${API_BASE}/reservations/RESA_NUMBER/cancel\" \\"
echo "               -H \"Authorization: Bearer \$TOKEN\" \\"
echo "               -d '{\"reason\":\"Test\"}'"
SKIP_COUNT=$((SKIP_COUNT + 1))
echo ""

# ═══════════════════════════════════════════════════════════════════════
# PHASE 2: ACTIONS CRITIQUES (P1) - NOT YET IMPLEMENTED
# ═══════════════════════════════════════════════════════════════════════

echo -e "${PURPLE}═══ PHASE 2: Actions Critiques (P1) ═══${NC}"
echo ""

if [ -n "$FIRST_RESA" ] && [ "$FIRST_RESA" != "null" ]; then
  run_test "2.1" "Exécuter cron plan-based (run-once)" \
    "POST" "/reservations/${FIRST_RESA}/plan-cron/run-once" \
    "{}" "NOT_IMPLEMENTED"

  run_test "2.2" "Recalculer un plan" \
    "POST" "/reservations/${FIRST_RESA}/recalculate" \
    "{}" "NOT_IMPLEMENTED"
else
  echo -e "${YELLOW}⚠️  Skipping P1 tests - No reservation available${NC}"
  SKIP_COUNT=$((SKIP_COUNT + 2))
  echo ""
fi

run_test "2.3" "Admin Action Center - Stats Summary" \
  "GET" "/admin/action-centers/stats/summary" \
  "" "NOT_IMPLEMENTED"

run_test "2.4" "Admin Action Center - Liste temporelle" \
  "GET" "/admin/action-centers?view=temporal&timeRange=week" \
  "" "NOT_IMPLEMENTED"

# ═══════════════════════════════════════════════════════════════════════
# PHASE 3: CONFIGURATION (P1-P2)
# ═══════════════════════════════════════════════════════════════════════

echo -e "${PURPLE}═══ PHASE 3: Configuration (P1-P2) ═══${NC}"
echo ""

run_test "3.1" "Liste des templates de messages" \
  "GET" "/config/message-templates" \
  "" "NOT_IMPLEMENTED"

# ═══════════════════════════════════════════════════════════════════════
# BACKEND HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════

echo -e "${PURPLE}═══ Backend Health Check ═══${NC}"
echo ""

echo -e "${BLUE}Test: Service Health${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "https://dev.sojori.com/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Backend service is healthy"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}❌ FAIL${NC} - Backend service unhealthy (HTTP ${HTTP_CODE})"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════

echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}  📊 Test Summary                                          ${PURPLE}║${NC}"
echo -e "${PURPLE}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${PURPLE}║${NC}  ${GREEN}✅ Passed:${NC}  ${PASS_COUNT}                                              ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${RED}❌ Failed:${NC}  ${FAIL_COUNT}                                              ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${YELLOW}⚠️  Skipped:${NC} ${SKIP_COUNT}                                              ${PURPLE}║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ $TOTAL -gt 0 ]; then
  SUCCESS_RATE=$((PASS_COUNT * 100 / TOTAL))
  echo -e "Success rate: ${SUCCESS_RATE}% (${PASS_COUNT}/${TOTAL} tests passed)"
else
  echo -e "No tests executed"
fi

echo ""
echo "📝 Full comparison guide: docs/API_COMPARISON_TEST_GUIDE.md"
echo ""

# Exit with error if any tests failed
if [ $FAIL_COUNT -gt 0 ]; then
  exit 1
else
  exit 0
fi
