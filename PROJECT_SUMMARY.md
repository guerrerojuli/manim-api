# Manim API - Project Summary

## What Was Built

A production-ready TypeScript REST API service that handles concurrent Manim video compilation requests using Docker for isolated, reproducible rendering.

## Key Features

### 1. Docker-Based Rendering
- Uses official `manimcommunity/manim` Docker image
- Isolated, reproducible compilation environment
- No local Python/Manim installation required
- Automatic cleanup of temporary files

### 2. Synchronous Request Handling
- Single request waits for compilation to complete
- Returns final result immediately (no polling needed)
- Concurrent processing of multiple requests
- Natural async/await flow with Node.js

### 3. Video Storage
- Automatic upload to Supabase storage
- Read rendered video from Docker container output
- Video serving endpoint
- Configurable bucket name

### 4. Type Safety
- Full TypeScript implementation
- Zod schema validation for requests
- Comprehensive type definitions
- Strict compiler settings

## Project Structure

```
manim-api/
├── src/
│   ├── index.ts                    # Express server & startup
│   ├── config/
│   │   └── env.ts                  # Environment configuration
│   ├── types/
│   │   └── index.ts                # TypeScript types & interfaces
│   ├── services/
│   │   ├── compiler.ts             # Docker-based compilation logic
│   │   └── storage.ts              # Supabase upload
│   └── routes/
│       └── compile.ts              # API endpoints
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── Dockerfile                      # Container setup
├── .env.example                    # Environment template
├── .gitignore                      # Git ignore rules
├── .dockerignore                   # Docker ignore rules
├── README.md                       # Full documentation
├── QUICKSTART.md                   # Quick start guide
└── PROJECT_SUMMARY.md              # This file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/compile` | Compile video (synchronous, waits for completion) |
| GET | `/api/video/:videoId` | Get compiled video |
| GET | `/health` | Health check |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `API_URL` | No | http://localhost:3001 | Public API URL |
| `DOCKER_IMAGE` | No | manimcommunity/manim:latest | Docker image for rendering |
| `RENDER_QUALITY` | No | ql | Render quality (ql/qm/qh/qk) |
| `SUPABASE_URL` | Yes | - | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | - | Service role key |
| `SUPABASE_ANON_KEY` | No | - | Fallback anon key |
| `SUPABASE_BUCKET_NAME` | No | videos | Storage bucket name |

*Either `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` required

## How It Works

### Request Flow (Synchronous)

```
1. Client → POST /api/compile with code
   ↓
2. Server validates request
   ↓
3. Server writes code to temp file
   ↓
4. Docker container runs Manim rendering (waits for completion)
   ↓
5. Server reads rendered video from Docker output
   ↓
6. Video uploaded to Supabase
   ↓
7. Server responds with final result (success or failure)
   ↓
8. Cleanup: Remove temp files
```

### Concurrent Handling

- Each request is handled asynchronously by Node.js
- Multiple compilations can run in parallel
- No request blocks others (async/await)
- Docker containers run independently
- Automatic temp file cleanup after each compilation

## Usage Example

```typescript
// Synchronous compilation - single request, waits for result
const res = await fetch('http://localhost:3001/api/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: manimCode })
});

const result = await res.json();

if (result.success) {
  console.log('Video ready:', result.url);
  console.log('Logs:', result.logs);
} else {
  console.error('Compilation failed:', result.error);
  console.error('Error details:', result.errorDetails);
}
```

**No polling needed!** The request waits for compilation to complete and returns the final result.

## Dependencies

### System Requirements
- Docker Engine 20.10+ (for local Manim rendering)
- 4GB+ RAM recommended for rendering
- ~5GB disk space (Docker image + temp files)

### Production
- `express` - Web server
- `@supabase/supabase-js` - Cloud storage
- `cors` - Cross-origin requests
- `dotenv` - Environment config
- `zod` - Request validation

### Development
- `typescript` - Type checking
- `tsx` - Dev server
- `@types/*` - Type definitions
- `vitest` - Testing (optional)

## Deployment Options

### Local Development
```bash
npm run dev
```

### Production Server
```bash
npm run build
npm start
```

### Docker
```bash
# Build API container
docker build -t manim-api .

# Run with Docker socket access (needed for spawning Manim containers)
docker run -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --env-file .env \
  manim-api
```

### Cloud Platforms
- Deploy to Vercel, Railway, Render, etc.
- Set environment variables in platform dashboard
- Ensure Supabase credentials are secure

## Next Steps / Improvements

1. **Authentication**: Add API key or JWT authentication
2. **Rate Limiting**: Prevent abuse with request throttling
3. **Database**: Store compilation history in PostgreSQL
4. **Metrics**: Add Prometheus/monitoring for Docker container usage
5. **Load Balancing**: Scale horizontally with multiple instances
6. **Error Retry**: Automatic retry on Docker failures
7. **Resource Limits**: Add Docker memory/CPU limits per container
8. **Caching**: Cache rendered videos for identical code submissions

## Integration with Manim-Agents

To integrate with your existing Manim-Agents project:

1. Update `tools.ts` to call this API instead of direct Docker/VM calls
2. Replace `compileVideo` function with synchronous API client:

```typescript
async function compileVideo(jobId: string, code: string) {
  // Single request that waits for completion
  const res = await fetch('http://localhost:3001/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, jobId })
  });
  
  const result = await res.json();
  
  if (result.success) {
    return { url: result.url, logs: result.logs };
  } else {
    return { url: '', logs: result.logs, error: result.error };
  }
}
```

**Much simpler!** No polling loop needed - the request waits and returns the final result.

## License

ISC
