# Quick Start Guide

Get the Manim API running in 3 simple steps:

## 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

## 2. Configure Environment

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
- `VM_URL`: Manim render VM URL (default: http://143.110.132.124:8000/render)

## 3. Start the Server

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

## Docker Deployment

```bash
# Build image
docker build -t manim-api .

# Run container
docker run -p 3001:3001 \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  manim-api
```

## How It Works

Unlike polling-based APIs, this API is **synchronous**:

1. Client sends POST /api/compile with code
2. Server compiles the video (waits for completion)
3. Server returns the result immediately (success or failure)

**No polling needed!** Just one request that waits for the result.

## Troubleshooting

**Server won't start:**
- Check that all required environment variables are set
- Ensure port 3001 is not already in use (`lsof -i :3001`)

**Video compilation fails:**
- Verify VM_URL is accessible
- Check Supabase credentials and bucket exists
- Review server logs for detailed error messages

**Request timeout:**
- Complex videos may take longer to compile
- Increase your HTTP client timeout if needed
- Default compilation timeout is handled by the VM
