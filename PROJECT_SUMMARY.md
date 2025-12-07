# Manim API - Project Summary

## What Was Built

A production-ready TypeScript REST API service that handles concurrent Manim video compilation requests.

## Key Features

### 1. Concurrent Request Handling
- Multiple compilation requests processed simultaneously
- Non-blocking async job queue
- Immediate response with job ID
- Status polling for completion

### 2. Job Queue System
- In-memory job queue manager
- Job states: pending → processing → completed/failed
- Automatic cleanup of old jobs (24 hours)
- Full status tracking with timestamps

### 3. Video Storage
- Automatic upload to Supabase storage
- Download from VM and re-upload to cloud
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
│   │   ├── compiler.ts             # VM compilation logic
│   │   ├── storage.ts              # Supabase upload/download
│   │   └── jobQueue.ts             # Concurrent job management
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
| POST | `/api/compile` | Submit compilation job |
| GET | `/api/status/:jobId` | Check job status |
| GET | `/api/video/:videoId` | Get compiled video |
| GET | `/api/jobs` | List all jobs (debug) |
| GET | `/health` | Health check |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `API_URL` | No | http://localhost:3001 | Public API URL |
| `VM_URL` | No | http://143.110.132.124:8000/render | Render VM URL |
| `SUPABASE_URL` | Yes | - | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | - | Service role key |
| `SUPABASE_ANON_KEY` | No | - | Fallback anon key |
| `SUPABASE_BUCKET_NAME` | No | videos | Storage bucket name |

*Either `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` required

## How It Works

### Request Flow

```
1. Client → POST /api/compile with code
   ↓
2. Server validates request
   ↓
3. Job created in queue (status: pending)
   ↓
4. Server responds with jobId (HTTP 202)
   ↓
5. Background processing starts (status: processing)
   ↓
6. Code sent to VM for compilation
   ↓
7. Video downloaded from VM
   ↓
8. Video uploaded to Supabase
   ↓
9. Job updated (status: completed/failed)
   ↓
10. Client polls GET /api/status/:jobId
```

### Concurrent Handling

- Each request is immediately queued and processed asynchronously
- No request blocks others
- Jobs run in parallel (limited only by VM capacity)
- Memory-efficient with automatic cleanup

## Usage Example

```typescript
// Submit job
const res = await fetch('http://localhost:3001/api/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: manimCode })
});
const { jobId } = await res.json();

// Poll for completion
while (true) {
  const status = await fetch(`http://localhost:3001/api/status/${jobId}`);
  const job = await status.json();
  
  if (job.status === 'completed') {
    console.log('Video ready:', job.url);
    break;
  } else if (job.status === 'failed') {
    console.error('Compilation failed:', job.error);
    break;
  }
  
  await new Promise(r => setTimeout(r, 2000));
}
```

## Dependencies

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
docker build -t manim-api .
docker run -p 3001:3001 --env-file .env manim-api
```

### Cloud Platforms
- Deploy to Vercel, Railway, Render, etc.
- Set environment variables in platform dashboard
- Ensure Supabase credentials are secure

## Next Steps / Improvements

1. **Persistent Queue**: Replace in-memory queue with Redis/Bull
2. **Authentication**: Add API key or JWT authentication
3. **Rate Limiting**: Prevent abuse with request throttling
4. **Webhooks**: Notify clients when jobs complete
5. **Database**: Store job history in PostgreSQL
6. **Metrics**: Add Prometheus/monitoring
7. **Load Balancing**: Scale horizontally with multiple instances
8. **Error Retry**: Automatic retry on VM failures

## Integration with Manim-Agents

To integrate with your existing Manim-Agents project:

1. Update `tools.ts` to call this API instead of direct VM calls
2. Replace `compileVideo` function with API client:

```typescript
async function compileVideo(jobId: string, code: string) {
  // Submit to API
  const res = await fetch('http://localhost:3001/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, jobId })
  });
  
  const { jobId: returnedJobId } = await res.json();
  
  // Poll for completion
  while (true) {
    const statusRes = await fetch(`http://localhost:3001/api/status/${returnedJobId}`);
    const job = await statusRes.json();
    
    if (job.status === 'completed') {
      return { url: job.url, logs: job.logs };
    } else if (job.status === 'failed') {
      return { url: '', logs: job.logs, error: job.error };
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
}
```

## License

ISC
