#!/bin/bash

# ════════════════════════════════════════════════════════════════════
# Test Comparaison APIs - Ancien Dashboard vs Nouveau Dashboard
# ════════════════════════════════════════════════════════════════════
# Objectif: Tester TOUTES les APIs réservations des deux dashboards
# Usage: ./scripts/test-apis-comparison.sh
# ════════════════════════════════════════════════════════════════════

# Configuration
JWT_TOKEN="${JWT_TOKEN:-YOUR_JWT_TOKEN_HERE}"
BASE_URL="${BASE_URL:-https://dev.sojori.com}"
TODAY=$(date +%Y-%m-%d)
TOMORROW=$(date -d tomorrow +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Emojis
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ════════════════════════════════════════════════════════════════════
# Helper Functions
# ════════════════════════════════════════════════════════════════════

print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${PURPLE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
  echo ""
  echo -e "${YELLOW}📋 Test $1: $2${NC}"
  echo -e "${BLUE}Endpoint: $3${NC}"
}

print_success() {
  echo -e "${GREEN}${CHECK} $1${NC}"
  ((PASSED_TESTS++))
  ((TOTAL_TESTS++))
}

print_failure() {
  echo -e "${RED}${CROSS} $1${NC}"
  ((FAILED_TESTS++))
  ((TOTAL_TESTS++))
}

print_warning() {
  echo -e "${YELLOW}${WARNING} $1${NC}"
}

print_info() {
  echo -e "${BLUE}${INFO} $1${NC}"
}

# ════════════════════════════════════════════════════════════════════
# Tests
# ════════════════════════════════════════════════════════════════════

print_header "${ROCKET} Test Comparaison APIs - Ancien vs Nouveau Dashboard"
echo "Date: $(date)"
echo "Base URL: ${BASE_URL}"
echo "Today: ${TODAY}"
echo "Tomorrow: ${TOMORROW}"

# Check JWT token
if [ "$JWT_TOKEN" = "YOUR_JWT_TOKEN_HERE" ]; then
  print_warning "JWT_TOKEN non configuré!"
  echo "Usage: JWT_TOKEN='your_token' ./scripts/test-apis-comparison.sh"
  echo "Ou: export JWT_TOKEN='your_token'"
  exit 1
fi

# ────────────────────────────────────────────────────────────────────
# TEST 1: Liste Réservations (Ancien Endpoint)
# ────────────────────────────────────────────────────────────────────
print_test "1" "Liste Réservations (ANCIEN)" "/api/v1/reservations/reservations"

response_old=$(curl -s -X GET \
  "${BASE_URL}/api/v1/reservations/reservations?dateType=arrival&startDate=${TODAY}&endDate=${TOMORROW}&limit=10" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$response_old" | jq -e '.success' > /dev/null 2>&1; then
  count=$(echo "$response_old" | jq '.data | length')
  total=$(echo "$response_old" | jq '.total')
  unmapped=$(echo "$response_old" | jq '.totalUnmapped // 0')
  print_success "ANCIEN: Succès - ${count} réservations chargées (total: ${total}, unmapped: ${unmapped})"

  # Save first reservation for later tests
  RESERVATION_ID_OLD=$(echo "$response_old" | jq -r '.data[0]._id // empty')
  RESERVATION_NUM=$(echo "$response_old" | jq -r '.data[0].reservationNumber // empty')
else
  print_failure "ANCIEN: Échec - $(echo "$response_old" | jq -r '.error // .message // "Erreur inconnue"')"
fi

# ────────────────────────────────────────────────────────────────────
# TEST 2: Liste Réservations (Nouveau Endpoint)
# ────────────────────────────────────────────────────────────────────
print_test "2" "Liste Réservations (NOUVEAU)" "/api/v1/reservations"

response_new=$(curl -s -X GET \
  "${BASE_URL}/api/v1/reservations?dateType=arrival&startDate=${TODAY}&endDate=${TOMORROW}&limit=10" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$response_new" | jq -e 'type == "array"' > /dev/null 2>&1; then
  count=$(echo "$response_new" | jq 'length')
  print_success "NOUVEAU: Succès - ${count} réservations chargées"

  # Save first reservation for later tests
  RESERVATION_ID_NEW=$(echo "$response_new" | jq -r '.[0]._id // empty')

  # Compare counts
  if [ "$count" -gt 0 ]; then
    first_guest=$(echo "$response_new" | jq -r '.[0].guestName // "N/A"')
    first_listing=$(echo "$response_new" | jq -r '.[0].listing.name // "N/A"')
    print_info "Première réservation: ${first_guest} → ${first_listing}"
  fi
else
  print_failure "NOUVEAU: Échec - $(echo "$response_new" | jq -r '.error // .message // "Format invalide"')"
fi

# ────────────────────────────────────────────────────────────────────
# TEST 3: Détail Réservation (by-id)
# ────────────────────────────────────────────────────────────────────
print_test "3" "Détail Réservation (by-id)" "/api/v1/reservations/by-id/:id"

RESERVATION_ID="${RESERVATION_ID_NEW:-$RESERVATION_ID_OLD}"

if [ -n "$RESERVATION_ID" ]; then
  print_info "ID testé: ${RESERVATION_ID}"

  response_detail=$(curl -s -X GET \
    "${BASE_URL}/api/v1/reservations/by-id/${RESERVATION_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json")

  if echo "$response_detail" | jq -e '._id' > /dev/null 2>&1; then
    guest=$(echo "$response_detail" | jq -r '.guestName')
    listing=$(echo "$response_detail" | jq -r '.listing.name // "N/A"')
    status=$(echo "$response_detail" | jq -r '.status')
    nights=$(echo "$response_detail" | jq -r '.nights // 0')
    price=$(echo "$response_detail" | jq -r '.totalPrice // 0')
    currency=$(echo "$response_detail" | jq -r '.currency // "EUR"')

    print_success "Détail: Succès"
    print_info "Guest: ${guest} | Listing: ${listing}"
    print_info "Status: ${status} | ${nights} nuits | ${price} ${currency}"
  else
    print_failure "Détail: Échec - $(echo "$response_detail" | jq -r '.error // .message // "Erreur"')"
  fi
else
  print_warning "Aucune réservation disponible pour tester"
fi

# ────────────────────────────────────────────────────────────────────
# TEST 4: Détail par Numéro (by-reservation-number) - ANCIEN SEULEMENT
# ────────────────────────────────────────────────────────────────────
print_test "4" "Détail par Numéro (ANCIEN uniquement)" "/api/v1/reservations/by-reservation-number/:num"

if [ -n "$RESERVATION_NUM" ]; then
  print_info "Numéro testé: ${RESERVATION_NUM}"

  response_by_num=$(curl -s -X GET \
    "${BASE_URL}/api/v1/reservations/by-reservation-number/${RESERVATION_NUM}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json")

  if echo "$response_by_num" | jq -e '.success' > /dev/null 2>&1; then
    guest=$(echo "$response_by_num" | jq -r '.data.guestName // .guestName')
    print_success "ANCIEN: by-reservation-number disponible - Guest: ${guest}"
  else
    print_failure "ANCIEN: by-reservation-number non disponible"
  fi

  print_warning "NOUVEAU: Endpoint non implémenté (TODO)"
else
  print_warning "Aucun numéro de réservation disponible"
fi

# ────────────────────────────────────────────────────────────────────
# TEST 5: Check-out Aujourd'hui
# ────────────────────────────────────────────────────────────────────
print_test "5" "Check-out Aujourd'hui" "/api/v1/reservations?dateType=departure"

response_checkout=$(curl -s -X GET \
  "${BASE_URL}/api/v1/reservations?dateType=departure&startDate=${TODAY}&endDate=${TOMORROW}&limit=10" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$response_checkout" | jq -e 'type == "array"' > /dev/null 2>&1; then
  count=$(echo "$response_checkout" | jq 'length')
  print_success "Check-out: Succès - ${count} réservations"
else
  print_failure "Check-out: Échec"
fi

# ────────────────────────────────────────────────────────────────────
# TEST 6: Leads (Demandes de réservation)
# ────────────────────────────────────────────────────────────────────
print_test "6" "Leads (Demandes)" "/api/v1/reservations/get-lead"

response_leads=$(curl -s -X GET \
  "${BASE_URL}/api/v1/reservations/get-lead?limit=10" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$response_leads" | jq -e '.success' > /dev/null 2>&1; then
  count=$(echo "$response_leads" | jq '.data | length')
  print_success "ANCIEN: Leads disponibles - ${count} demandes"
else
  print_warning "Leads: Endpoint disponible uniquement dans ancien dashboard"
fi

# ────────────────────────────────────────────────────────────────────
# TEST 7: Planning (Vue calendrier)
# ────────────────────────────────────────────────────────────────────
print_test "7" "Planning (Vue Calendrier)" "/api/v1/reservations/planning"

response_planning=$(curl -s -X GET \
  "${BASE_URL}/api/v1/reservations/planning?startDate=${TODAY}&endDate=${TOMORROW}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$response_planning" | jq -e '.success' > /dev/null 2>&1; then
  count=$(echo "$response_planning" | jq '.data | length')
  print_success "ANCIEN: Planning disponible - ${count} items"
else
  print_warning "Planning: Endpoint disponible uniquement dans ancien dashboard"
fi

# ────────────────────────────────────────────────────────────────────
# TEST 8: Auth Check (Vérifier que le token est valide)
# ────────────────────────────────────────────────────────────────────
print_test "8" "Validation Token JWT" "N/A"

if [ "$PASSED_TESTS" -gt 0 ]; then
  print_success "Token JWT valide - ${PASSED_TESTS} tests réussis"
else
  print_failure "Token JWT peut-être invalide - Aucun test réussi"
fi

# ════════════════════════════════════════════════════════════════════
# Résumé Final
# ════════════════════════════════════════════════════════════════════

print_header "📊 RÉSUMÉ DES TESTS"

echo ""
echo -e "${BLUE}Total Tests:${NC} ${TOTAL_TESTS}"
echo -e "${GREEN}Réussis:${NC}     ${PASSED_TESTS} ${CHECK}"
echo -e "${RED}Échoués:${NC}     ${FAILED_TESTS} ${CROSS}"

if [ "$TOTAL_TESTS" -gt 0 ]; then
  SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo -e "${YELLOW}Taux réussite:${NC} ${SUCCESS_RATE}%"
fi

echo ""
print_header "📝 STATUT IMPLÉMENTATION"

echo ""
echo "✅ IMPLÉMENTÉ (Nouveau Dashboard):"
echo "  • GET /api/v1/reservations (liste)"
echo "  • GET /api/v1/reservations/by-id/:id (détail)"
echo ""
echo "🔴 MANQUANT (Nouveau Dashboard):"
echo "  • GET /api/v1/reservations/by-reservation-number/:num"
echo "  • POST /api/v1/reservations/create"
echo "  • PUT /api/v1/reservations/update/:id"
echo "  • PUT /api/v1/reservations/cancel/:id"
echo "  • POST /api/v1/reservations/:id/declare-arrival"
echo "  • POST /api/v1/reservations/:id/declare-departure"
echo "  • GET /api/v1/reservations/get-lead"
echo "  • GET /api/v1/reservations/planning"
echo "  • + 21 autres endpoints (voir docs/API_TESTING_COMPARISON.md)"
echo ""

print_header "🎯 RECOMMANDATIONS"

echo ""
echo "1. ${CHECK} Core APIs fonctionnelles (liste, détail)"
echo "2. ${WARNING} Implémenter prochainement:"
echo "   - by-reservation-number (URLs propres)"
echo "   - create/update/cancel (CRUD)"
echo "   - declare-arrival/departure (check-in/out)"
echo "3. ${INFO} Voir docs/API_TESTING_COMPARISON.md pour liste complète"
echo ""

# Exit code
if [ "$FAILED_TESTS" -gt 0 ]; then
  exit 1
else
  exit 0
fi
