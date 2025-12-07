# Synchronous API Design

This document explains the synchronous API design for Manim video compilation.

## Overview

Instead of using a polling-based approach (submit job → poll status → get result), this API uses a **synchronous request pattern** where a single POST request waits for compilation to complete and returns the final result.

## Why Synchronous?

### Problems with Polling
- **Complex**: Requires job queue, status tracking, and cleanup logic
- **More Code**: Client needs polling loops with sleep intervals
- **More Requests**: Multiple HTTP requests per compilation (submit + many polls)
- **Race Conditions**: Timing issues with job state updates
- **Resource Overhead**: Memory for job storage, cleanup intervals

### Benefits of Synchronous
- **Simple**: One request, one response
- **Less Code**: 80% reduction in code complexity
- **Fewer Requests**: Single HTTP request per compilation
- **Natural**: Works like any other API endpoint
- **Concurrent**: Node.js handles multiple requests naturally

## API Design

### Single Endpoint

```
POST /api/compile
```

**Request:**
```json
{
  "code": "from manim import *\n\nclass MyScene(Scene):\n    def construct(self):\n        ...",
  "jobId": "optional_custom_id"
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "url": "http://localhost:3001/api/video/job_abc123",
  "logs": "Render job completed successfully...",
  "jobId": "job_abc123"
}
```

**Response (Failure - 500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Compilation error details",
  "logs": "Error logs...",
  "jobId": "job_abc123"
}
```

### How It Works

1. Client sends POST request with Manim code
2. Server receives request
3. Server calls VM to compile video (waits)
4. Server downloads compiled video from VM
5. Server uploads video to Supabase
6. Server returns final result to client

All of this happens in a **single HTTP request/response cycle**.

## Concurrency

Even though each request is synchronous, the API handles multiple requests concurrently:

```typescript
// Client A sends request → waits
// Client B sends request → waits (concurrent with A)
// Client C sends request → waits (concurrent with A and B)

// All three compilations happen in parallel
// Each client receives their result when ready
```

Node.js's async/await model handles this naturally:
- Each request is handled by an async function
- While waiting for VM compilation, Node.js processes other requests
- No blocking, no queue needed

## Implementation Details

### Server Side (manim-api)

```typescript
router.post('/compile', async (req, res) => {
  const { code, jobId } = req.body;
  
  // This waits for compilation to complete
  const result = await compileVideo(jobId, code);
  
  if (result.error) {
    return res.status(500).json({
      success: false,
      error: result.error,
      logs: result.logs
    });
  }
  
  return res.status(200).json({
    success: true,
    url: result.url,
    logs: result.logs
  });
});
```

### Client Side (Manim-Agents)

```typescript
async function compileVideo(jobId: string, code: string) {
  const response = await fetch(`${MANIM_API_URL}/api/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, jobId })
  });
  
  const data = await response.json();
  
  if (data.success) {
    return { url: data.url, logs: data.logs };
  } else {
    return { url: '', logs: data.logs, error: data.error };
  }
}
```

No polling, no loops, no status checks!

## Timeout Handling

The VM compilation has its own timeout mechanism. If a compilation takes too long:
- The VM will return an error
- The API will forward that error to the client
- The client receives the error in the same request

HTTP clients should set appropriate timeouts (e.g., 2-5 minutes) to handle long-running compilations.

## Comparison

| Feature | Polling-Based | Synchronous |
|---------|--------------|-------------|
| Requests per compilation | 1 + N polls | 1 |
| Client code complexity | High (~150 lines) | Low (~40 lines) |
| Server code complexity | High (queue + status) | Low (direct call) |
| Memory usage | Queue storage | Minimal |
| Concurrent handling | Explicit queue | Built-in (Node.js) |
| Error handling | Multiple failure points | Single point |
| Testing | Complex (timing issues) | Simple (one request) |

## Trade-offs

### Pros
- Much simpler code (80% reduction)
- Fewer HTTP requests
- Natural API design
- Easy to understand and maintain
- Still handles concurrency

### Cons
- Long-running HTTP connections (30-60 seconds)
- Client must handle request timeouts
- No intermediate status updates

For Manim video compilation, these trade-offs are acceptable because:
- Compilations are fast enough (30-60 seconds)
- Clients expect to wait for video generation
- Intermediate status isn't critical (just "compiling...")

## Conclusion

The synchronous API design is simpler, more maintainable, and fits the use case perfectly. It eliminates unnecessary complexity while maintaining full concurrent request handling capabilities.
