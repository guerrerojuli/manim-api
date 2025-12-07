import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import compileRoutes from './routes/compile';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', compileRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Manim API server running on port ${config.port}`);
  console.log(`📝 API URL: ${config.apiUrl}`);
  console.log(`🎬 VM URL: ${config.vmUrl}`);
  console.log(`📦 Supabase Bucket: ${config.supabase.bucketName}`);
  console.log('\nAvailable endpoints:');
  console.log(`  POST   ${config.apiUrl}/api/compile (synchronous)`);
  console.log(`  GET    ${config.apiUrl}/api/video/:videoId`);
  console.log(`  GET    ${config.apiUrl}/health`);
});
