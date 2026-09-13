# UI Mockup Docker Deployment

The UI mockup static HTML files are now set up to run in Docker for easy preview.

## Access the Mockups

The mockups are **currently running** at:

**http://localhost:8089**

## What's Inside

The landing page provides links to browse these 4 mockup pages:
1. **หอพัก (Locations)** - Building/location management interface
2. **ห้อง (Rooms)** - Room management interface
3. **อ่านมิเตอร์ (Meter Reading)** - Meter reading interface
4. **บิลรายเดือน (Monthly Bills)** - Billing and invoicing interface

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| `Dockerfile.mockup` | `design/` | Docker image definition (nginx:alpine) |
| `index.html` | `design/mockups/` | Landing page with navigation |
| `.dockerignore` | Project root | Excludes node_modules, .next, dev.db, etc from Docker build |
| `DOCKER.md` | `design/mockups/` | Detailed Docker usage guide |

## Quick Commands

### Build Docker Image
```bash
cd /home/wyz/claude-projects/apartment-oat
docker build -f design/Dockerfile.mockup -t apartment-mockup:latest .
```

### Run Container (starts in background)
```bash
docker run -d -p 8089:80 --name apartment-mockup apartment-mockup:latest
```

### Stop Container
```bash
docker stop apartment-mockup
```

### Start Container Again
```bash
docker start apartment-mockup
```

### Remove Container
```bash
docker stop apartment-mockup && docker rm apartment-mockup
```

### View Logs
```bash
docker logs apartment-mockup
```

### Verify Server is Responding
```bash
curl http://localhost:8089
```

## Key Design Decisions

1. **Dockerfile Location**: Placed in `design/Dockerfile.mockup` (not root) to avoid conflict with future production Dockerfile for Next.js app
2. **Image Size**: Uses `nginx:alpine` (~92.5MB) - extremely lightweight for static file serving
3. **Port**: Uses 8089 (8080 and 8081 were already in use on this system)
4. **Docker Ignore**: Excludes node_modules, .next, dev.db, .env files to keep build context small
5. **Detached Mode**: Container runs in the background (`-d` flag) so it stays available for browsing

## Image Specifications

- **Image Name**: `apartment-mockup:latest`
- **Base Image**: `nginx:alpine` (lightweight static file server)
- **Container Port**: 80 (internal)
- **Host Port**: 8089 (external - can be changed)
- **Uncompressed Size**: ~92.5MB
- **Layer Size**: ~26MB

## When to Use

This setup is perfect for:
- Designer/PO to review UI mockups before development
- Stakeholder presentations
- UX validation before building actual features
- Easy sharing of mockup design (just access the URL)

## Next Steps

When you're ready to build the actual Next.js application:
1. Create a separate `Dockerfile` (without the `.mockup` suffix) in the project root for the app
2. This mockup container will continue to run independently
3. The two can coexist and serve different purposes

## Notes

- This is **static HTML only** - buttons and interactions are mocked but not functional
- All mockups use `shared.css` for consistent styling (design system)
- Mockups are responsive and work on mobile/tablet/desktop
- No database or backend needed - just static files

---

For more detailed Docker commands and troubleshooting, see `/home/wyz/claude-projects/apartment-oat/design/mockups/DOCKER.md`
