# Apartment-Oat Deployment Guide

## Quick Start

### 1. Build and Push Image
```bash
./build-and-push.sh
```

Output example:
```
✅ Done! Images pushed:
   192.168.1.74:30500/apartment-oat:a6f12cb-20260921-034805
   192.168.1.74:30500/apartment-oat:latest

🚀 To deploy to K3s:
   ./deploy.sh a6f12cb-20260921-034805
```

### 2. Deploy to K3s
```bash
./deploy.sh a6f12cb-20260921-034805
```

This will:
- Replace IMAGE_TAG_PLACEHOLDER with your image tag
- Apply all manifests in deployment/ directory
- Wait for rollout to complete
- Show pod status

## Files Structure

```
deployment/
├── 01-volumes.yaml      # Namespace, PV, PVC (hostPath to /data/k3s/volumes/apartment-oat/)
├── 02-configmap.yaml    # Environment variables (non-secret)
├── 03-secret.yaml       # Secrets (SESSION_PASSWORD, SMTP credentials)
├── 04-deployment.yaml   # Deployment + Service (IMAGE_TAG_PLACEHOLDER will be replaced)
└── 05-ingress.yaml      # Ingress (Traefik + Let's Encrypt)
```

## Maintenance

### Cleanup Old Images
```bash
# Keep only last 5 versions in registry
./cleanup-old-images.sh
```

### Check Deployment Status
```bash
kubectl get all -n apartment-oat
kubectl logs -n apartment-oat -l app=apartment-oat --tail=50 -f
```

### Rollback
```bash
# List previous tags from registry
curl -s http://192.168.1.74:30500/v2/apartment-oat/tags/list | jq .

# Deploy older version
./deploy.sh a6f12cb-20260920-153022
```

### Update Secrets
```bash
# Edit secret
kubectl edit secret apartment-oat-secrets -n apartment-oat

# Or regenerate from .env
SESSION_PASSWORD=$(grep SESSION_PASSWORD .env | cut -d'=' -f2 | tr -d '"')
kubectl create secret generic apartment-oat-secrets \
  --from-literal=SESSION_PASSWORD="${SESSION_PASSWORD}" \
  -n apartment-oat --dry-run=client -o yaml | kubectl apply -f -

# Restart to pick up new secrets
kubectl rollout restart deployment/apartment-oat-app -n apartment-oat
```

## Troubleshooting

### Pod not starting
```bash
kubectl describe pod -n apartment-oat -l app=apartment-oat
kubectl logs -n apartment-oat -l app=apartment-oat --tail=100
```

### Database issues
```bash
# Check if volumes are mounted correctly
kubectl exec -it -n apartment-oat deployment/apartment-oat-app -- ls -lh /app/data /app/uploads

# Check database on K3s node
ssh 192.168.1.74
ls -lh /data/k3s/volumes/apartment-oat/data/app.db
```

### Image pull issues
```bash
# Check if registry is accessible from K3s
kubectl run test-curl --image=curlimages/curl -it --rm -- \
  curl -v http://192.168.1.74:30500/v2/apartment-oat/tags/list
```

## Notes

- **Database**: SQLite via hostPath PV → `/data/k3s/volumes/apartment-oat/data/app.db`
- **Uploads**: hostPath PV → `/data/k3s/volumes/apartment-oat/uploads/`
- **Replicas**: 1 (SQLite doesn't support multi-writer)
- **Image Pull Policy**: Always (ensures latest version is pulled)
- **Resource Limits**: 256Mi-512Mi memory, 250m-500m CPU
