#!/bin/bash
# Reset admin user in production database

POD=$(kubectl get pods -n apartment-oat -l app=apartment-oat -o jsonpath='{.items[0].metadata.name}')

echo "Running on pod: $POD"
echo "Deleting user: wanwit.phbn@gmail.com"

kubectl exec -n apartment-oat $POD -- npx prisma db execute --stdin <<'EOF'
DELETE FROM User WHERE email = 'wanwit.phbn@gmail.com';
EOF

echo "✓ User deleted from production database"
echo ""
echo "Next steps:"
echo "1. Login at https://apartments.daiyooo.com with wanwit.phbn@gmail.com"
echo "2. User will be created fresh with PLATFORM_ADMIN role only (no subscription)"
echo "3. Can access /admin directly"
