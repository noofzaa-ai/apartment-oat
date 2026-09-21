# DevOps & CI/CD Guide - Apartment-Oat

**โปรเจค:** ระบบจัดการหอพัก (Apartment Management System)  
**Stack:** Next.js 16 + React 19 + Prisma + SQLite  
**อัปเดตล่าสุด:** 2026-09-21

---

## 📋 สารบัญ

- [Overview](#overview)
- [Infrastructure](#infrastructure)
- [Deployment Workflow](#deployment-workflow)
- [Database & Storage](#database--storage)
- [Monitoring & Troubleshooting](#monitoring--troubleshooting)
- [Rollback & Recovery](#rollback--recovery)

---

## Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Development Machine (192.168.1.58)                         │
│  - Build & Push Images                                      │
│  - NFS Mount: /data/k3s/volumes (shared database)           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Docker Registry
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  K3s Cluster (192.168.1.74)                                 │
│  - Registry: :30500                                         │
│  - Traefik Ingress + Let's Encrypt                          │
│  - HostPath Volumes: /data/k3s/volumes/apartment-oat/       │
│    ├── data/app.db (SQLite database)                        │
│    └── uploads/ (payment slips)                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  https://apartments.daiyooo.com
```

### Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19
- **Backend:** Next.js API Routes + Prisma ORM
- **Database:** SQLite (hostPath volume)
- **Auth:** OIDC (Daiyooo Account via Better Auth)
- **PDF:** pdfkit + Thai fonts (Sarabun)
- **Container:** Docker (Node.js 22 bookworm-slim)
- **Orchestration:** K3s (Kubernetes)
- **Ingress:** Traefik + cert-manager
- **Registry:** Private Docker Registry (:30500)

---

## Infrastructure

### Development Machine (192.168.1.58)

**Purpose:** Build, test, และ push images

**Services:**
- Docker Compose (local development)
- NFS Client (mount K3s volumes)

**NFS Mount:**
```bash
# Already mounted
192.168.1.74:/data/k3s/volumes → /data/k3s/volumes

# Check mount
df -h | grep k3s
ls -lh /data/k3s/volumes/apartment-oat/data/
```

**Docker Compose:**
- Port: 3004 (host) → 3000 (container)
- Volumes: NFS-mounted database และ uploads

### K3s Cluster (192.168.1.74)

**Services:**
- K3s (Kubernetes lightweight)
- Docker Registry (NodePort :30500)
- Traefik Ingress Controller
- cert-manager (Let's Encrypt)

**Namespaces:**
- `apartment-oat` - Application namespace

**Storage:**
- hostPath volumes (single-node cluster)
- `/data/k3s/volumes/apartment-oat/data/` - SQLite database
- `/data/k3s/volumes/apartment-oat/uploads/` - Payment slips

---

## Deployment Workflow

### Quick Start

```bash
# Clone repo
cd /home/wyz/claude-projects/apartment-oat

# Full deployment (recommended)
./main.sh all
```

### Deployment Steps

#### 1. Build และ Push Image

```bash
./main.sh build
```

**ขั้นตอน:**
1. Generate version tag: `{git-hash}-{timestamp}`
   - ตัวอย่าง: `a6f12cb-20260921-043500`
2. Build image: `docker compose build apartment-app`
3. Tag images:
   - `192.168.1.74:30500/apartment-oat:{version}`
   - `192.168.1.74:30500/apartment-oat:latest`
4. Push ทั้ง 2 tags ไปที่ registry
5. Cleanup local tagged images
6. บันทึก tag ลง `deployment/.latest-tag`

**Output:**
```
✅ Done! Images pushed:
   192.168.1.74:30500/apartment-oat:a6f12cb-20260921-043500
   192.168.1.74:30500/apartment-oat:latest
```

#### 2. Deploy ไป K3s

```bash
./main.sh deploy
```

**ขั้นตอน:**
1. อ่าน image tag จาก `deployment/.latest-tag`
2. Replace `IMAGE_TAG_PLACEHOLDER` ใน `04-deployment.yaml`
3. Apply manifests ตามลำดับ:
   - `01-namespace.yaml` - สร้าง namespace
   - `02-configmap.yaml` - Environment variables
   - `03-secret.yaml` - SESSION_PASSWORD
   - `04-deployment.yaml` - Deployment + Service (with image tag)
   - `05-ingress.yaml` - Ingress + TLS
4. รอ rollout complete (timeout 300s)
5. แสดงสถานะ pods

**Output:**
```
📦 Applying Kubernetes manifests...
   ✓ Applying 01-namespace.yaml
   ✓ Applying 02-configmap.yaml
   ✓ Applying 03-secret.yaml
   ✓ Applying 04-deployment.yaml (with image: a6f12cb-20260921-043500)
   ✓ Applying 05-ingress.yaml

⏳ Waiting for rollout to complete...
deployment "apartment-oat-app" successfully rolled out

✅ Deployment complete!
```

#### 3. Cleanup Old Images (Optional)

```bash
./main.sh cleanup
```

**ขั้นตอน:**
1. List tags จาก registry API
2. Sort tags ตาม timestamp
3. เก็บ 5 versions ล่าสุด
4. ลบ tags เก่าผ่าน registry API

---

## Files Structure

```
apartment-oat/
├── main.sh                      ← Main entry point
├── docker-compose.yml           ← Development (NFS mount)
├── Dockerfile                   ← Multi-stage build (Node.js 22)
├── docker-entrypoint.sh         ← Migration + seed + start
│
├── deployment/
│   ├── build-and-push.sh        ← Build & push image
│   ├── deploy.sh                ← Deploy to K3s
│   ├── cleanup-old-images.sh    ← Cleanup old tags
│   │
│   ├── 01-namespace.yaml        ← Namespace: apartment-oat
│   ├── 02-configmap.yaml        ← Env vars (OIDC, database, etc.)
│   ├── 03-secret.yaml           ← SESSION_PASSWORD (gitignored)
│   ├── 04-deployment.yaml       ← Deployment + Service (hostPath volumes)
│   ├── 05-ingress.yaml          ← Traefik ingress + TLS
│   └── README.md
│
├── app/                         ← Next.js app (App Router)
├── prisma/                      ← Database schema + migrations
├── lib/                         ← Server utilities
└── docs/
    └── devops-cicd.md          ← This file
```

---

## Database & Storage

### SQLite Database

**Location:**
- K3s node: `/data/k3s/volumes/apartment-oat/data/app.db`
- Container: `/app/data/app.db`
- Development: NFS mount `/data/k3s/volumes/apartment-oat/data/app.db`

**Schema Management:**
- Migrations: `prisma/migrations/`
- Auto-run: `docker-entrypoint.sh` รัน `prisma db push` ทุกครั้งที่ container start

**Current Migrations:**
```
20260917131904_oidc_rework_user_membership_subscription
20260920025844_add_room_preset
20260920052436_add_pricing_plans
20260920061920_fix_room_preset_updated_at
```

**Backup:**
```bash
# On K3s node
sudo cp /data/k3s/volumes/apartment-oat/data/app.db \
        /data/k3s/volumes/apartment-oat/data/app.db.backup.$(date +%Y%m%d-%H%M%S)

# Or from dev machine (via NFS)
cp /data/k3s/volumes/apartment-oat/data/app.db \
   /path/to/backup/app.db.$(date +%Y%m%d-%H%M%S)
```

### Uploads Storage

**Location:**
- K3s node: `/data/k3s/volumes/apartment-oat/uploads/`
- Container: `/app/uploads/`
- Development: NFS mount

**Structure:**
```
uploads/
├── 1/           # User ID 1 uploads
│   └── slip-*.png
└── 6/           # User ID 6 uploads
    └── slip-*.jpg
```

---

## Environment Variables

### Required (from Secret)

```yaml
SESSION_PASSWORD: "e3b211...1e73"  # >= 32 chars random (iron-session)
```

### Application Config (from ConfigMap)

```yaml
DATABASE_URL: "file:/app/data/app.db"
DAIYOOO_OIDC_ISSUER: "https://account.daiyooo.com/api/auth"
DAIYOOO_OIDC_DISCOVERY_URL: "https://account.daiyooo.com/.well-known/openid-configuration"
DAIYOOO_OIDC_CLIENT_ID: "apartments"
DAIYOOO_OIDC_REDIRECT_URI: "https://apartments.daiyooo.com/auth/callback"
DAIYOOO_OIDC_SCOPES: "openid profile email"
PRODUCT_BASE_URL: "https://apartments.daiyooo.com"
THAI_FONT_PATH: "/app/assets/fonts/Sarabun-Regular.ttf"
```

### Update Secrets

```bash
# Regenerate from .env
cd /home/wyz/claude-projects/apartment-oat
SESSION_PASSWORD=$(grep SESSION_PASSWORD .env | cut -d'=' -f2 | tr -d '"')

# Update deployment/03-secret.yaml
cat > deployment/03-secret.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: apartment-oat-secrets
  namespace: apartment-oat
type: Opaque
stringData:
  SESSION_PASSWORD: "${SESSION_PASSWORD}"
EOF

# Apply
kubectl apply -f deployment/03-secret.yaml

# Restart to pick up new secret
kubectl rollout restart deployment/apartment-oat-app -n apartment-oat
```

---

## Monitoring & Troubleshooting

### Check Status

```bash
# All resources
kubectl get all -n apartment-oat

# Pods
kubectl get pods -n apartment-oat -o wide

# Logs (real-time)
kubectl logs -n apartment-oat -l app=apartment-oat -f

# Logs (last 100 lines)
kubectl logs -n apartment-oat -l app=apartment-oat --tail=100

# Describe pod (events, status)
kubectl describe pod -n apartment-oat -l app=apartment-oat

# Ingress
kubectl get ingress -n apartment-oat
```

### Health Check

```bash
# From K3s node
curl -s http://localhost:3000/api/health | jq .

# From outside
curl -s https://apartments.daiyooo.com/api/health | jq .
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-21T04:30:00.000Z"
}
```

### Check Database

```bash
# Exec into pod
kubectl exec -it -n apartment-oat deployment/apartment-oat-app -- /bin/bash

# Inside container
ls -lh /app/data/
sqlite3 /app/data/app.db ".tables"
sqlite3 /app/data/app.db "SELECT COUNT(*) FROM User;"

# From K3s node (direct)
sudo sqlite3 /data/k3s/volumes/apartment-oat/data/app.db ".schema User"
```

### Check Registry

```bash
# List tags
curl -s http://192.168.1.74:30500/v2/apartment-oat/tags/list | jq .

# Expected output
{
  "name": "apartment-oat",
  "tags": [
    "latest",
    "a6f12cb-20260921-043500",
    "a6f12cb-20260921-035141"
  ]
}
```

### Common Issues

#### Pod CrashLoopBackOff

```bash
# Check logs
kubectl logs -n apartment-oat -l app=apartment-oat --tail=50

# Common causes:
# 1. SESSION_PASSWORD missing or invalid
# 2. Database migration failed
# 3. OIDC config invalid
```

#### Image Pull Error

```bash
# Check if registry accessible
kubectl run test-curl --image=curlimages/curl -it --rm -- \
  curl -v http://192.168.1.74:30500/v2/

# Check image exists
curl -s http://192.168.1.74:30500/v2/apartment-oat/tags/list | jq .
```

#### Database Lock

```bash
# SQLite ไม่รองรับ concurrent writes
# ตรวจสอบว่ามี replica = 1 เท่านั้น
kubectl get deployment -n apartment-oat apartment-oat-app -o yaml | grep replicas
```

---

## Rollback & Recovery

### Rollback to Previous Version

```bash
# 1. ดู tags ที่มี
curl -s http://192.168.1.74:30500/v2/apartment-oat/tags/list | jq .

# 2. Deploy version เก่า
cd /home/wyz/claude-projects/apartment-oat
./deployment/deploy.sh a6f12cb-20260920-153022

# 3. Check status
kubectl rollout status deployment/apartment-oat-app -n apartment-oat
```

### Kubernetes Rollback

```bash
# View rollout history
kubectl rollout history deployment/apartment-oat-app -n apartment-oat

# Rollback to previous
kubectl rollout undo deployment/apartment-oat-app -n apartment-oat

# Rollback to specific revision
kubectl rollout undo deployment/apartment-oat-app -n apartment-oat --to-revision=2
```

### Database Recovery

```bash
# 1. Stop deployment
kubectl scale deployment/apartment-oat-app -n apartment-oat --replicas=0

# 2. Restore backup (on K3s node)
sudo cp /data/k3s/volumes/apartment-oat/data/app.db.backup.20260921-040000 \
        /data/k3s/volumes/apartment-oat/data/app.db

# 3. Start deployment
kubectl scale deployment/apartment-oat-app -n apartment-oat --replicas=1

# 4. Verify
kubectl logs -n apartment-oat -l app=apartment-oat -f
```

---

## CI/CD Roadmap (Future)

### Phase 1: Manual Deployment (Current)

✅ `./main.sh all` - Manual build + deploy

### Phase 2: GitHub Actions (Planned)

```yaml
# .github/workflows/deploy.yml
name: Deploy to K3s

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: self-hosted  # On 192.168.1.58
    steps:
      - uses: actions/checkout@v4
      - name: Build and Push
        run: ./deployment/build-and-push.sh
      - name: Deploy to K3s
        run: |
          TAG=$(cat deployment/.latest-tag)
          ./deployment/deploy.sh $TAG
```

### Phase 3: Multi-Environment (Future)

- **Staging:** `staging.apartments.daiyooo.com`
- **Production:** `apartments.daiyooo.com`
- Auto-deploy staging on push
- Manual approval for production

---

## Security

### Secrets Management

- ✅ `03-secret.yaml` gitignored
- ✅ SESSION_PASSWORD >= 32 chars (cryptographically random)
- ✅ OIDC public client (no client secret)
- ✅ TLS via cert-manager (Let's Encrypt)

### Network

- ✅ ClusterIP service (internal only)
- ✅ Ingress with TLS termination
- ✅ Private registry (no auth yet - consider adding)

### Container

- ✅ Non-root user (Node.js default)
- ✅ Resource limits (512Mi memory, 500m CPU)
- ✅ Health checks (liveness + readiness)
- ✅ imagePullPolicy: Always (security updates)

---

## Performance

### Resource Usage

**Current Settings:**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Scaling:**
- ⚠️ SQLite = single replica only
- Future: PostgreSQL/MySQL for horizontal scaling

### Database Optimization

```sql
-- Already indexed
CREATE INDEX idx_subscription_user ON Subscription(userId);
CREATE INDEX idx_membership_user ON Membership(userId);
CREATE INDEX idx_apartment_owner ON Apartment(ownerUserId);
```

---

## Contact & Support

**Repository:** `/home/wyz/claude-projects/apartment-oat`  
**K3s Node:** `192.168.1.74`  
**Dev Machine:** `192.168.1.58`  
**Registry:** `http://192.168.1.74:30500`  
**Production URL:** `https://apartments.daiyooo.com`

**Monitoring:**
- Logs: `kubectl logs -n apartment-oat -l app=apartment-oat -f`
- Metrics: (Future: Prometheus + Grafana)

**Alerts:** (Future: Alertmanager)

---

## Appendix: Quick Commands Reference

```bash
# === BUILD & DEPLOY ===
./main.sh all              # Full workflow
./main.sh build            # Build only
./main.sh deploy           # Deploy only
./main.sh cleanup          # Cleanup old images

# === KUBERNETES ===
kubectl get all -n apartment-oat
kubectl logs -n apartment-oat -l app=apartment-oat -f
kubectl describe pod -n apartment-oat -l app=apartment-oat
kubectl exec -it -n apartment-oat deployment/apartment-oat-app -- /bin/bash
kubectl rollout restart deployment/apartment-oat-app -n apartment-oat
kubectl rollout status deployment/apartment-oat-app -n apartment-oat
kubectl scale deployment/apartment-oat-app -n apartment-oat --replicas=0

# === REGISTRY ===
curl -s http://192.168.1.74:30500/v2/apartment-oat/tags/list | jq .

# === DATABASE ===
# On K3s node
sudo sqlite3 /data/k3s/volumes/apartment-oat/data/app.db ".tables"
sudo ls -lh /data/k3s/volumes/apartment-oat/data/

# Via NFS (dev machine)
ls -lh /data/k3s/volumes/apartment-oat/data/
sqlite3 /data/k3s/volumes/apartment-oat/data/app.db ".schema"

# === HEALTH CHECK ===
curl -s https://apartments.daiyooo.com/api/health | jq .
```

---

**สร้างเอกสารโดย:** Hermes Agent (Kiro)  
**วันที่:** 2026-09-21  
**Version:** 1.0
