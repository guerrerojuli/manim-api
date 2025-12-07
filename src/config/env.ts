import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  vmUrl: process.env.VM_URL || 'http://143.110.132.124:8000/render',
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!,
    bucketName: process.env.SUPABASE_BUCKET_NAME || 'videos'
  },
  apiUrl: process.env.API_URL || 'http://localhost:3001'
};

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
