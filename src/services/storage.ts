import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

// Initialize Supabase client for storage operations
const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Uploads a video file to Supabase storage bucket
 * @param buffer - The video file buffer
 * @param fileName - The name to save the file as
 * @returns The public URL of the uploaded video
 */
export async function uploadVideoToSupabase(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(config.supabase.bucketName)
    .upload(fileName, buffer, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload video to Supabase: ${error.message}`);
  }

  // Return the direct Supabase public URL
  const { data: { publicUrl } } = supabase.storage
    .from(config.supabase.bucketName)
    .getPublicUrl(fileName);
  
  console.log(`Video uploaded to Supabase with public URL: ${publicUrl}`);
  return publicUrl;
}

/**
 * Get a video from Supabase storage
 * @param fileName - The name of the file to retrieve
 * @returns The video file buffer
 */
export async function getVideoFromSupabase(fileName: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(config.supabase.bucketName)
    .download(fileName);

  if (error) {
    throw new Error(`Failed to download video from Supabase: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
