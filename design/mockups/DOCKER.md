# UI Mockup Docker Setup

This directory contains static HTML mockups for the Apartment Management application. These can be served via Docker for easy preview in a browser.

## Quick Start

### Build the Docker Image

```bash
cd /home/wyz/claude-projects/apartment-oat
docker build -f design/Dockerfile.mockup -t apartment-mockup:latest .
```

### Run the Container

```bash
docker run -d -p 8089:80 --name apartment-mockup apartment-mockup:latest
```

**Container is now running in the background.**

### View in Browser

Open your browser and navigate to:

```
http://localhost:8089
```

This opens the landing page with links to all 4 mockup pages:
- **หอพัก (Locations)** - Building/location management
- **ห้อง (Rooms)** - Room management
- **อ่านมิเตอร์ (Meter Reading)** - Meter reading interface
- **บิลรายเดือน (Monthly Bills)** - Bills and invoicing

## Container Management

### Stop the Container

```bash
docker stop apartment-mockup
```

### Start the Container Again

```bash
docker start apartment-mockup
```

### Remove the Container

```bash
docker stop apartment-mockup
docker rm apartment-mockup
```

### View Container Logs

```bash
docker logs apartment-mockup
docker logs -f apartment-mockup  # Follow logs in real-time
```

## Verify Server is Running

Test that the server is responding:

```bash
curl http://localhost:8089
```

You should receive the HTML content of the landing page.

## Files Structure

- `index.html` - Landing page with links to all mockups
- `01-locations.html` - Locations/buildings mockup
- `02-rooms.html` - Rooms management mockup
- `03-meter-reading.html` - Meter reading mockup
- `04-monthly-bills.html` - Monthly bills mockup
- `shared.css` - Shared styles used across all mockups
- `Dockerfile.mockup` - Container definition (in `design/` folder)
- `.dockerignore` - Excludes unnecessary files from build

## Important Notes

- This is **static HTML only** - not a working application
- Dockerfile is named `Dockerfile.mockup` to avoid confusion with the eventual production Dockerfile for the Next.js app
- Port `8089` is used to avoid conflicts with other services (port 8080 was already in use)
- The nginx:alpine image (~10MB) is lightweight and perfect for static file serving
- To update mockups, rebuild the image and restart the container

## Troubleshooting

### Port Already in Use

If port 8089 is already in use, change it in the `docker run` command:

```bash
docker run -d -p 8090:80 --name apartment-mockup apartment-mockup:latest
```

Then access at `http://localhost:8090`

### Container Won't Start

Check the logs:

```bash
docker logs apartment-mockup
```

### Files Not Found

Ensure you're building from the project root:

```bash
cd /home/wyz/claude-projects/apartment-oat
docker build -f design/Dockerfile.mockup -t apartment-mockup:latest .
```
