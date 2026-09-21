# Apartment Management - Docker Deployment Guide

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build the Docker image and start the service
docker compose up -d

# Check logs
docker compose logs -f

# Stop the service
docker compose down
```

The app will be available at `http://localhost:3000` (or the port specified in docker-compose.yml)

### 2. Manual Docker Run

```bash
# Build image
docker build -t apartment-oat:latest .

# Run container
docker run -d \
  --name apartment-app \
  -p 3000:3000 \
  -e SESSION_PASSWORD="your-random-32-char-password" \
  -v app_data:/app/data \
  -v app_uploads:/app/uploads \
  apartment-oat:latest

# Check health
curl http://localhost:3000/api/health
```

### 3. Database Initialization

On first run, initialize the database:

```bash
# Option A: Run seed from host (locally) before Docker
npm run seed

# Option B: Use the volume to persist the database
# The database will be stored in the Docker volume and persist across restarts
```

### 4. Environment Configuration

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Key variables:
- `SESSION_PASSWORD` - MUST be at least 32 random characters (generate: `openssl rand -hex 32`)
- `DATABASE_URL` - Default: `file:/app/data/app.db` (SQLite in volume)
- `SMTP_*` - Optional email settings (system logs to console if not set)

### 5. Docker Compose File Structure

- **Service**: `apartment-app`
- **Image**: Built from `./Dockerfile`
- **Ports**: `3000:3000` (customize in docker-compose.yml)
- **Volumes**:
  - `app_data`: SQLite database directory
  - `app_uploads`: Payment slip uploads
- **Environment**: Loaded from `.env` file

### 6. Health Check

The container includes a health check that runs every 30 seconds:

```bash
# Manual health check
curl http://localhost:3000/api/health

# Expected response
{"status":"ok","timestamp":"2026-07-24T06:40:21.428Z"}
```

### 7. Logs

View container logs:

```bash
# Stream logs
docker compose logs -f apartment-app

# View last 50 lines
docker compose logs --tail 50 apartment-app
```

### 8. Accessing the App

- **Admin Login**: `http://localhost:3000/admin/login`
- **Tenant Login**: `http://localhost:3000/tenant/login`
- **Health Check**: `http://localhost:3000/api/health`
- **API**: Requires authentication (returns 401 if not authenticated)

### 9. Troubleshooting

#### Port Already in Use

If port 3000 is busy, change in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Change to 3001
```

#### Database Not Persisting

Ensure volumes are mounted correctly:

```bash
# Check volumes
docker volume ls | grep apartment

# Inspect volume
docker volume inspect apartment-oat_app_data
```

#### Thai Font Not Working in PDFs

Thai fonts are bundled in `assets/fonts/`. They are copied into the image and referenced by the app at `/app/assets/fonts/Sarabun-Regular.ttf`.

If PDF generation fails, check:
1. Fonts are present in container: `docker exec apartment-oat-app ls -la /app/assets/fonts/`
2. Container has read permissions on the font files

#### better-sqlite3 Native Module Error

better-sqlite3 is a native module that requires compilation. The image builds on Node.js 22-alpine and includes prebuilt binaries for Linux x64.

If rebuild needed inside container:
```bash
docker exec apartment-oat-app npm rebuild better-sqlite3
```

### 10. Production Deployment

For production:

1. **Security**: Set strong `SESSION_PASSWORD` (use `openssl rand -hex 32`)
2. **Database**: Use external SQLite or PostgreSQL (update `DATABASE_URL`)
3. **SMTP**: Configure email settings for PIN distribution
4. **SSL/TLS**: Place behind a reverse proxy (nginx, Traefik) with SSL termination
5. **Environment**: Use secrets management (Docker secrets, Kubernetes secrets)

Example production compose:

```yaml
services:
  apartment-app:
    image: apartment-oat:latest  # Use specific version tag
    environment:
      SESSION_PASSWORD: ${SESSION_PASSWORD}  # From secrets
      SMTP_HOST: ${SMTP_HOST}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    restart: unless-stopped
```

### 11. Build Details

- **Base Image**: node:22-alpine
- **Build Method**: Multi-stage with Next.js standalone output
- **Size**: Optimized production image (includes only necessary dependencies)
- **Build Time**: ~5-10 minutes (first time), ~2-3 minutes (cached)
- **Runtime Size**: ~400MB

### 12. Stopping and Cleanup

```bash
# Stop containers (preserves volumes)
docker compose down

# Stop and remove volumes (WARNING: deletes database!)
docker compose down -v

# Remove old images
docker rmi apartment-oat:latest
```
