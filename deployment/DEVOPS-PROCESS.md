# DevOps Process - Apartment-Oat

## ⚠️ CRITICAL: Deployment Process

**ALWAYS use this command for deployment:**

```bash
./main.sh all
```

## Why?

1. **Image versioning**: Ensures image tag matches what's pushed to registry
2. **Atomic deployment**: Build → Push → Deploy in one flow
3. **No tag mismatch**: Eliminates "image not found" errors
4. **Consistent process**: Same workflow every time

## Never Do This:

```bash
# ❌ DON'T run scripts separately
./deployment/build-and-push.sh
./deployment/deploy.sh <wrong-tag>

# ❌ DON'T deploy without building first
kubectl apply -f deployment/
```

## Deployment Workflow:

```bash
# 1. Full deployment (recommended)
./main.sh all

# 2. Individual steps (only if you know what you're doing)
./main.sh build    # Builds and saves tag to .latest-tag
./main.sh deploy   # Deploys using saved tag
./main.sh cleanup  # Optional: cleanup old images
```

## Verification:

```bash
# Check pods
kubectl get pods -n apartment-oat

# Check logs
kubectl logs -n apartment-oat -l app=apartment-oat -f

# Health check
curl -s https://apartments.daiyooo.com/api/health | jq .
```

## If Deployment Fails:

1. Check logs: `kubectl logs -n apartment-oat -l app=apartment-oat --tail=100`
2. Check events: `kubectl describe pod -n apartment-oat -l app=apartment-oat`
3. Verify image exists: `curl -s http://192.168.1.74:30500/v2/apartment-oat/tags/list | jq .`
4. Rollback: `./deployment/deploy.sh <previous-working-tag>`

## Reference:

Full documentation: `docs/devops-cicd.md`
