#!/bin/bash

# Manual test script for Phase 2 Admin User Management APIs
# Usage: ./manual-test-admin-api.sh

BASE_URL="http://localhost:3000"

echo "================================="
echo "Phase 2 Admin User API Manual Tests"
echo "================================="
echo ""

echo "Note: All endpoints require authentication."
echo "Expected response: 401 unauthorized or 403 forbidden"
echo ""

echo "[TEST 1] GET /api/admin/users (list users)"
curl -s -X GET "$BASE_URL/api/admin/users?page=1&limit=10" | jq '.' || echo "Request failed"
echo ""

echo "[TEST 2] GET /api/admin/users/1 (user detail)"
curl -s -X GET "$BASE_URL/api/admin/users/1" | jq '.' || echo "Request failed"
echo ""

echo "[TEST 3] PATCH /api/admin/users/1 (update user)"
curl -s -X PATCH "$BASE_URL/api/admin/users/1" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACTIVE"}' | jq '.' || echo "Request failed"
echo ""

echo "[TEST 4] POST /api/admin/users/1/suspend (suspend user)"
curl -s -X POST "$BASE_URL/api/admin/users/1/suspend" \
  -H "Content-Type: application/json" \
  -d '{"suspend":true}' | jq '.' || echo "Request failed"
echo ""

echo "[TEST 5] POST /api/admin/users/1/notes (create note)"
curl -s -X POST "$BASE_URL/api/admin/users/1/notes" \
  -H "Content-Type: application/json" \
  -d '{"note":"Test admin note"}' | jq '.' || echo "Request failed"
echo ""

echo "[TEST 6] GET /api/admin/users/1/notes (list notes)"
curl -s -X GET "$BASE_URL/api/admin/users/1/notes" | jq '.' || echo "Request failed"
echo ""

echo "================================="
echo "All endpoints tested"
echo "================================="
