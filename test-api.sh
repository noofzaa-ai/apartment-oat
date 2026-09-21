#!/bin/bash
# Test subscription admin API endpoints

BASE_URL="http://localhost:3000"
ADMIN_USER_ID=40

echo "=== Testing Subscription Admin APIs ==="
echo ""

# Create session for admin user
echo "1. Creating admin session..."
SESSION_RESPONSE=$(node -e "
const { createSession } = require('./lib/session.ts');
(async () => {
  const session = await createSession({ userId: $ADMIN_USER_ID });
  console.log(session);
})();
" 2>/dev/null)

# Since session creation is complex, let's test endpoints directly with a manual approach
# For now, test without auth to see endpoint structure

echo ""
echo "2. Testing GET /api/admin/subscriptions (list)"
curl -s "$BASE_URL/api/admin/subscriptions?page=1&limit=3" | jq '.' || echo "Failed"

echo ""
echo "3. Testing GET /api/admin/subscriptions/9 (detail - TRIAL subscription)"
curl -s "$BASE_URL/api/admin/subscriptions/9" | jq '.' || echo "Failed"

echo ""
echo "4. Testing POST /api/admin/subscriptions/9/extend-trial"
curl -s -X POST "$BASE_URL/api/admin/subscriptions/9/extend-trial" \
  -H "Content-Type: application/json" \
  -d '{"days": 7}' | jq '.' || echo "Failed"

echo ""
echo "5. Testing POST /api/admin/subscriptions/7/change-plan (STARTER -> STANDARD)"
curl -s -X POST "$BASE_URL/api/admin/subscriptions/7/change-plan" \
  -H "Content-Type: application/json" \
  -d '{"planCode": "STANDARD"}' | jq '.' || echo "Failed"

echo ""
echo "6. Testing GET /api/admin/subscriptions with filters"
curl -s "$BASE_URL/api/admin/subscriptions?status=TRIAL&limit=2" | jq '.subscriptions | length' || echo "Failed"

echo ""
echo "7. Testing GET /api/admin/subscriptions with plan filter"
curl -s "$BASE_URL/api/admin/subscriptions?plan=STARTER&limit=2" | jq '.subscriptions[0].plan.code' || echo "Failed"

echo ""
echo "=== Tests Complete ==="
