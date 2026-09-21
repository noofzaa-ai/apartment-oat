# Phase 3 Manual UI Testing Checklist

**Purpose**: Manual verification of admin subscription management UI  
**Pages**: /admin/subscriptions (list) and /admin/subscriptions/[id] (detail)

## Prerequisites

- [ ] Admin user credentials available
- [ ] Test subscriptions exist in database (run seed + create test data)
- [ ] Browser DevTools open (Network tab for API inspection)

## Test 1: Subscription List Page (/admin/subscriptions)

### Basic Display
- [ ] Page loads without errors
- [ ] Subscription table displays with columns: User, Plan, Status, Billing, Rooms, MRR, Days Left
- [ ] Pagination controls visible (if >25 subscriptions)

### Filters
- [ ] **Plan Filter**: Dropdown shows all plan codes (TRIAL, STARTER, STANDARD, PRO)
  - [ ] Select "PRO" → only PRO subscriptions shown
  - [ ] Clear filter → all subscriptions shown again
  
- [ ] **Status Filter**: Dropdown shows statuses (TRIAL, ACTIVE, CANCELED, EXPIRED)
  - [ ] Select "ACTIVE" → only ACTIVE subscriptions shown
  - [ ] Select "CANCELED" → only CANCELED subscriptions shown
  
- [ ] **Billing Cycle Filter**: Dropdown shows MONTHLY/YEARLY
  - [ ] Select "YEARLY" → only yearly subscriptions shown
  
- [ ] **Expiring Soon Filter**: Input field for days (e.g., 7, 30)
  - [ ] Enter "7" → only subscriptions expiring within 7 days shown
  - [ ] Network request includes expiringDays parameter

### Data Accuracy
- [ ] MRR calculation correct (check DevTools Network response)
  - [ ] Monthly subscription: MRR = pricePerRoom × roomCount
  - [ ] Yearly subscription: MRR = (pricePerRoom × roomCount) / 12
  
- [ ] Days Left calculation accurate
  - [ ] Positive number for active subscriptions
  - [ ] Negative number for expired subscriptions
  
- [ ] Room count matches user's apartments

### Pagination
- [ ] Page 1 shows first 25 subscriptions
- [ ] Click "Next" → loads page 2
- [ ] Click "Previous" → returns to page 1
- [ ] Total count displayed correctly

### Actions
- [ ] Click subscription row → navigates to detail page
- [ ] View button/link works

## Test 2: Subscription Detail Page (/admin/subscriptions/[id])

### Basic Display
- [ ] Page loads without errors
- [ ] User information section displays:
  - [ ] Display name, email, role, status
  - [ ] Created date, last login
  - [ ] Email verified badge

- [ ] Subscription information displays:
  - [ ] Plan name and code
  - [ ] Status badge (correct color)
  - [ ] Billing cycle
  - [ ] Current period dates
  - [ ] Trial end date (if TRIAL status)
  - [ ] Room quota snapshot

- [ ] Apartments section displays:
  - [ ] List of user's apartments
  - [ ] Room count per apartment
  - [ ] Total room count

### Action Buttons
- [ ] "Extend Trial" button visible only if status = TRIAL
- [ ] "Change Plan" button always visible
- [ ] "Cancel Subscription" button visible if status ≠ CANCELED

## Test 3: Extend Trial Modal

### Open Modal
- [ ] Click "Extend Trial" button (only on TRIAL subscriptions)
- [ ] Modal opens with form

### Form Validation
- [ ] Days input field present
- [ ] Enter negative number (e.g., -5) → validation error shown
- [ ] Enter zero (0) → validation error shown
- [ ] Enter decimal (e.g., 7.5) → validation error or rounds to integer
- [ ] Enter valid number (e.g., 14) → no error

### Submit Action
- [ ] Enter 14 days → click Submit
- [ ] Loading state shown
- [ ] Network request: POST /api/admin/subscriptions/[id]/extend-trial
- [ ] Request body: { "days": 14 }
- [ ] Success: modal closes, page refreshes, trial end date updated
- [ ] Verify new trial end date = old date + 14 days

### Error Handling
- [ ] Test with non-TRIAL subscription → should show error message
- [ ] Test with network error → error message displayed
- [ ] Modal can be closed without submitting

## Test 4: Change Plan Modal

### Open Modal
- [ ] Click "Change Plan" button
- [ ] Modal opens with plan selector

### Plan Selection
- [ ] Dropdown/radio buttons show all plans (TRIAL, STARTER, STANDARD, PRO)
- [ ] Current plan is pre-selected or indicated
- [ ] Select different plan (e.g., STANDARD → PRO)

### Submit Action
- [ ] Click Submit
- [ ] Loading state shown
- [ ] Network request: POST /api/admin/subscriptions/[id]/change-plan
- [ ] Request body: { "planCode": "PRO" }
- [ ] Success: modal closes, page refreshes, plan updated
- [ ] Verify plan code and name changed

### Error Handling
- [ ] Test with invalid plan code → error message
- [ ] Modal can be closed without submitting

## Test 5: Cancel Subscription Modal

### Open Modal
- [ ] Click "Cancel Subscription" button
- [ ] Confirmation modal opens
- [ ] Warning message displayed (user keeps access until period end)

### Submit Action
- [ ] Click "Confirm Cancel"
- [ ] Loading state shown
- [ ] Network request: POST /api/admin/subscriptions/[id]/cancel
- [ ] Success: modal closes, page refreshes, status → CANCELED
- [ ] Verify currentPeriodEnd unchanged (user still has access)

### Already Canceled
- [ ] Try to cancel CANCELED subscription → button should be disabled/hidden
- [ ] Or error message if attempted

### Error Handling
- [ ] Modal can be closed without confirming

## Test 6: Authorization

### Non-Admin User
- [ ] Log in as OWNER (non-admin) user
- [ ] Navigate to /admin/subscriptions → should redirect or show 403
- [ ] Direct URL access to /admin/subscriptions/[id] → should redirect or show 403

### Admin User
- [ ] Log in as PLATFORM_ADMIN user
- [ ] Full access to all pages and actions

## Test 7: Audit Logs (Verification)

After performing each action, verify audit log created:

- [ ] Extend trial → check AuditLog table for action="extend_trial"
- [ ] Change plan → check AuditLog table for action="change_plan"  
- [ ] Cancel subscription → check AuditLog table for action="cancel_subscription"

Query to check:
```sql
SELECT * FROM AuditLog 
WHERE category = 'ADMIN' 
  AND targetType = 'SUBSCRIPTION'
ORDER BY createdAt DESC 
LIMIT 10;
```

## Test 8: Edge Cases

- [ ] Subscription with 0 rooms → MRR = 0
- [ ] Subscription expiring today → daysLeft = 0 or 1
- [ ] Subscription expired (past period end) → daysLeft negative
- [ ] User with multiple apartments → total room count correct
- [ ] Very long user names/emails → no UI overflow
- [ ] Trial with null trialEndsAt → handled gracefully

## Test 9: Responsive Design

- [ ] Desktop view (1920×1080)
- [ ] Tablet view (768×1024)
- [ ] Mobile view (375×667) - if supported

## Test 10: Performance

- [ ] List page with 100+ subscriptions loads quickly
- [ ] Filters respond without lag
- [ ] Pagination smooth
- [ ] Detail page loads quickly

---

## Bugs Found Template

**Bug ID**: BUG-001  
**Severity**: High/Medium/Low  
**Page**: /admin/subscriptions  
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected**: 
**Actual**: 
**Screenshot**: (attach if available)

---

## Sign-off

- [ ] All critical tests passed
- [ ] All bugs documented
- [ ] Ready for production deployment

**Tested by**: _____________  
**Date**: _____________  
**Sign-off**: _____________
