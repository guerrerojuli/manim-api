# Manim API

A TypeScript-based REST API service for compiling Manim videos with synchronous request handling.

## Features

- **Synchronous Compilation**: Single request waits and returns the final result
- **Concurrent Request Handling**: Process multiple video compilations simultaneously
- **Supabase Integration**: Automatic video upload to cloud storage
- **TypeScript**: Full type safety and better developer experience
- **Simple API**: Just one POST request - no polling needed

## Architecture

```
Client → POST /api/compile → VM Compilation → Supabase Storage → Response
         (waits for completion and returns result directly)
```

## API Endpoints

### 1. Compile Video (Synchronous)
```bash
POST /api/compile
Content-Type: application/json

{
  "code": "from manim import *\n\nclass MyScene(Scene):\n    def construct(self):\n        circle = Circle()\n        self.play(Create(circle))",
  "jobId": "optional-custom-job-id"
}

Response (200 OK on success):
{
  "success": true,
  "url": "http://localhost:3001/api/video/job_abc123",
  "logs": "Render job completed successfully...",
  "jobId": "job_abc123"
}

Response (500 on failure):
{
  "success": false,
  "logs": "Error: VM render request failed...",
  "error": "Compilation error details",
  "jobId": "job_abc123"
}
```

**Note**: This endpoint is synchronous - it waits for the compilation to complete before responding. This may take 30-60 seconds depending on video complexity.

### 2. Get Video
```bash
GET /api/video/:videoId

Response: video/mp4 file
```

### 3. Health Check
```bash
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Installation

```bash
# Install dependencies
npm install

# or with pnpm
pnpm install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update the `.env` file with your configuration:
```env
# Server Configuration
PORT=3001
API_URL=http://localhost:3001

# VM Configuration
VM_URL=http://143.110.132.124:8000/render

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET_NAME=videos
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Usage Example

### Using curl
```bash
# Compile a video (waits for completion)
curl -X POST http://localhost:3001/api/compile \
  -H "Content-Type: application/json" \
  -d '{
    "code": "from manim import *\n\nclass MyScene(Scene):\n    def construct(self):\n        text = Text(\"Hello Manim!\")\n        self.play(Write(text))"
  }'

# Download video
curl http://localhost:3001/api/video/job_abc123 --output video.mp4
```

### Using JavaScript/TypeScript
```typescript
// Compile video (single request, waits for completion)
const response = await fetch('http://localhost:3001/api/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: `from manim import *

class MyScene(Scene):
    def construct(self):
        circle = Circle()
        self.play(Create(circle))`
  })
});

const result = await response.json();

if (result.success) {
  console.log('Video URL:', result.url);
  console.log('Logs:', result.logs);
} else {
  console.error('Compilation failed:', result.error);
}
```

## Project Structure

```
manim-api/
├── src/
│   ├── index.ts              # Express server entry point
│   ├── routes/
│   │   └── compile.ts        # API route handlers
│   ├── services/
│   │   ├── compiler.ts       # Video compilation logic
│   │   └── storage.ts        # Supabase storage service
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── config/
│       └── env.ts            # Environment configuration
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Concurrent Request Handling

The API handles multiple compilation requests concurrently:

- Each request is processed independently
- Multiple videos can compile at the same time
- No request blocks others from being processed
- Node.js async/await handles concurrency naturally

## Error Handling

All errors are properly caught and returned with appropriate HTTP status codes:

- `400 Bad Request`: Invalid input (missing code, validation errors)
- `500 Internal Server Error`: Compilation errors, VM errors, storage errors

Error responses include:
- `success: false`
- `error`: Detailed error message
- `logs`: Compilation logs or error details

## Integration with Manim-Agents

The Manim-Agents project is already configured to use this API. Just ensure the `MANIM_API_URL` environment variable is set:

```bash
# In Manim-Agents/.env
MANIM_API_URL=http://localhost:3001
```

The `compileVideo` function in `agents/manim/tools.ts` will automatically use the manim-api service.

## License

ISC
