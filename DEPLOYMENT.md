# Apartment-Oat Deployment

## Quick Start

### Single Command Deployment
```bash
./main.sh all
```

This will:
1. Build Docker image with versioned tag
2. Push to registry (192.168.1.74:30500)
3. Deploy to K3s cluster
4. (Optional) Cleanup old images

### Individual Steps
```bash
# Build and push only
./main.sh build

# Deploy latest built image
./main.sh deploy

# Cleanup old registry tags
./main.sh cleanup

# Show help
./main.sh help
```

## Project Structure

```
apartment-oat/
├── main.sh                      ← Main entry point
├── deployment/
│   ├── build-and-push.sh        ← Build & push image
│   ├── deploy.sh                ← Deploy to K3s
│   ├── cleanup-old-images.sh    ← Cleanup old tags
│   ├── 01-volumes.yaml          ← Namespace, PV, PVC
│   ├── 02-configmap.yaml        ← Environment variables
│   ├── 03-secret.yaml           ← Secrets (gitignored)
│   ├── 04-deployment.yaml       ← Deployment + Service
│   ├── 05-ingress.yaml          ← Ingress (Traefik + TLS)
│   └── README.md                ← Detailed guide
└── DEPLOYMENT.md                ← This file
```

## How It Works

### Build Process
1. Generate version tag: `{git-hash}-{timestamp}` (e.g., `a6f12cb-20260921-041552`)
2. Build Docker image with `docker compose build`
3. Tag with both version and `latest`
4. Push to private registry
5. Save tag to `.latest-tag` for deployment

### Deploy Process
1. Read latest tag from `.latest-tag`
2. Replace `IMAGE_TAG_PLACEHOLDER` in `04-deployment.yaml`
3. Apply all manifests in order (01 → 05)
4. Wait for rollout completion
5. Show pod status

### Cleanup Process
1. List all tags from registry
2. Sort by timestamp
3. Keep last 5 versions
4. Delete older tags

## Database & Storage

- **Database**: `/data/k3s/volumes/apartment-oat/data/app.db` (hostPath PV)
- **Uploads**: `/data/k3s/volumes/apartment-oat/uploads/` (hostPath PV)
- **NFS**: Development machine mounts via `/data/k3s/volumes`

## Monitoring

```bash
# Check deployment status
kubectl get all -n apartment-oat

# View logs
kubectl logs -n apartment-oat -l app=apartment-oat -f

# Check ingress
kubectl get ingress -n apartment-oat

# Describe pod (for troubleshooting)
kubectl describe pod -n apartment-oat -l app=apartment-oat
```

## Rollback

```bash
# List available tags
curl -s http://192.168.1.74:30500/v2/apartment-oat/tags/list | jq .

# Deploy specific version
cd deployment
./deploy.sh a6f12cb-20260920-153022
```

## URL

- **Production**: https://apartments.daiyooo.com
- **Registry**: http://192.168.1.74:30500
- **Health Check**: https://apartments.daiyooo.com/api/health

## Features

✅ Pricing Plans (TRIAL/STARTER/STANDARD/PRO)
✅ Room Preset + Bulk Create
✅ Onboarding Flow
✅ Neo-brutalist UI
✅ OIDC Authentication (Daiyooo Account)
✅ PDF Bill Generation (Thai fonts)
✅ Payment Slip Upload
✅ Invite Code System
