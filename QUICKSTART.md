# Quick Start Guide

Get the Manim API running in 4 simple steps:

## Prerequisites

- Node.js 20+
- Docker installed and running
- Supabase account

## 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

## 2. Pull Docker Image

```bash
# Download Manim Docker image (one-time setup, ~2GB)
docker pull manimcommunity/manim:latest
```

This may take a few minutes on first run.

## 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

Optional (with defaults):
- `PORT`: Server port (default: 3001)
- `API_URL`: Public API URL (default: http://localhost:3001)
- `DOCKER_IMAGE`: Docker image (default: manimcommunity/manim:latest)
- `RENDER_QUALITY`: Quality level - ql/qm/qh/qk (default: ql)

## 4. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

## Test the API

```bash
# Health check
curl http://localhost:3001/health

# Compile a test video (waits for completion - may take 30-60 seconds)
curl -X POST http://localhost:3001/api/compile \
  -H "Content-Type: application/json" \
  -d '{
    "code": "from manim import *\n\nclass TestScene(Scene):\n    def construct(self):\n        circle = Circle()\n        self.play(Create(circle))"
  }'
```

## Use with Manim-Agents

In your Manim-Agents project:

```bash
# Set the API URL in .env
echo "MANIM_API_URL=http://localhost:3001" >> .env

# The tools.ts file will automatically use the API
```

## Docker Deployment (API Container)

```bash
# Build image for the API (not for rendering - that uses manimcommunity/manim)
docker build -t manim-api .

# Run container with Docker socket access (needed for rendering)
docker run -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  manim-api
```

**Note:** The API container needs access to Docker socket to spawn Manim rendering containers.

## How It Works

Unlike polling-based APIs, this API is **synchronous**:

1. Client sends POST /api/compile with code
2. Server writes code to temp file
3. Server runs Docker container with Manim to render video (waits for completion)
4. Server uploads video to Supabase
5. Server returns the result immediately (success or failure)

**No polling needed!** Just one request that waits for the result.

## Troubleshooting

**Server won't start:**
- Check that all required environment variables are set
- Ensure port 3001 is not already in use (`lsof -i :3001`)

**Docker not found:**
- Install Docker Desktop: https://www.docker.com/products/docker-desktop
- Verify: `docker --version`
- Ensure Docker Desktop is running

**Video compilation fails:**
- Check Docker is running (`docker ps` should work)
- Verify Manim code has valid Scene class
- Check Supabase credentials and bucket exists
- Review server logs for detailed error messages
- Ensure Docker has enough memory (4GB+ recommended)

**First compilation very slow:**
- Docker is pulling the Manim image (~2GB)
- Manually pull first: `docker pull manimcommunity/manim:latest`
- Subsequent runs will be much faster

**Request timeout:**
- Complex videos may take longer to compile
- Increase your HTTP client timeout if needed
- Default render quality is 'ql' (low) for faster rendering
