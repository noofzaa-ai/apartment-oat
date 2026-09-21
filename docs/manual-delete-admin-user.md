# Manual Task: Delete wanwit.phbn@gmail.com from Production DB

**Priority:** 🔴 URGENT

## Problem
User `wanwit.phbn@gmail.com` has both:
- PLATFORM_ADMIN role (correct)
- Active subscription + apartments (wrong - conflicts with admin-only access)

Result: Redirects to `/app/locations` instead of allowing `/admin` access

## Solution
Delete this user completely from production database, then re-login to create fresh admin-only user.

## Manual Steps (DevOps)

### 1. Connect to production database
```bash
# Get pod name
POD=$(kubectl get pods -n apartment-oat -l app=apartment-oat -o jsonpath='{.items[0].metadata.name}')

# Shell into pod
kubectl exec -it -n apartment-oat $POD -- /bin/sh
```

### 2. Inside pod, run Node.js script
```javascript
node <<'SCRIPT'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUser() {
  const email = 'wanwit.phbn@gmail.com';
  
  const user = await prisma.user.findFirst({
    where: { email },
    select: { 
      id: true, 
      email: true, 
      role: true,
      Subscription: { select: { status: true } },
      Apartment: { select: { id: true } }
    }
  });
  
  if (!user) {
    console.log('User not found');
    process.exit(0);
  }
  
  console.log('Found user:');
  console.log('- ID:', user.id);
  console.log('- Email:', user.email);
  console.log('- Role:', user.role);
  console.log('- Subscription:', user.Subscription?.status || 'none');
  console.log('- Apartments:', user.Apartment.length);
  console.log('');
  console.log('Deleting...');
  
  await prisma.user.delete({
    where: { id: user.id }
  });
  
  console.log('✓ User deleted successfully');
  process.exit(0);
}

deleteUser().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
SCRIPT
```

### 3. Verify deletion
```javascript
node <<'SCRIPT'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.user.findFirst({ 
  where: { email: 'wanwit.phbn@gmail.com' } 
}).then(user => {
  if (user) {
    console.log('ERROR: User still exists!');
  } else {
    console.log('✓ User deleted successfully');
  }
  process.exit(0);
});
SCRIPT
```

### 4. Exit pod
```bash
exit
```

## Verification
After deletion, test:
1. Login at https://apartments.daiyooo.com with wanwit.phbn@gmail.com
2. Should create fresh user with PLATFORM_ADMIN role only
3. Should redirect to `/get-started` (no subscription)
4. Navigate to `/admin` → should work

## Report Back
- [ ] User found and deleted
- [ ] Verification passed (user not found after deletion)
- [ ] Login tested and `/admin` accessible
