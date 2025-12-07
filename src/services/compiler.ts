import { config } from '../config/env';
import { downloadVideo, uploadVideoToSupabase } from './storage';
import { CompilationResult, VMRenderResponse } from '../types';

/**
 * Compiles a Manim video by sending code to the VM and uploading the result
 * @param jobId - Unique identifier for the compilation job
 * @param code - Manim Python code to compile
 * @returns Compilation result with URL, logs, and potential errors
 */
export async function compileVideo(
  jobId: string,
  code: string
): Promise<CompilationResult> {
  try {
    console.log(`[${jobId}] Sending render request to VM`);

    // Send render request to DO VM
    const response = await fetch(config.vmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, jobId }),
    });

    console.log(`[${jobId}] VM response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.error(`[${jobId}] VM error: ${response.status} - ${text}`);

      // Try to parse the error response to extract detailed compilation error info
      let compilationError = text;
      let errorDetails: CompilationResult['errorDetails'] = {
        statusCode: response.status,
        message: text,
      };

      try {
        const errorData = JSON.parse(text);
        console.log(`[${jobId}] Parsed error data:`, errorData);
        
        // Extract all available error information
        errorDetails.stderr = errorData.stderr || errorData.error_output || '';
        errorDetails.stdout = errorData.stdout || errorData.output || '';
        errorDetails.message = errorData.error || errorData.detail || errorData.message || text;
        
        // Use the most relevant error message as the main error
        compilationError = errorDetails.stderr || errorDetails.message || text;
        
        console.log(`[${jobId}] Extracted detailed error information:`, {
          stderr: errorDetails.stderr?.substring(0, 200),
          stdout: errorDetails.stdout?.substring(0, 200),
          message: errorDetails.message?.substring(0, 200)
        });
      } catch {
        console.log(`[${jobId}] Could not parse error as JSON, using raw text`);
        errorDetails.message = text;
      }

      return {
        url: '',
        logs: `Error: VM render request failed (HTTP ${response.status})`,
        error: compilationError,
        errorDetails,
      };
    }

    const data = await response.json() as VMRenderResponse;
    console.log(`[${jobId}] VM response data:`, data);

    // Download video from DO VM URL
    console.log(`[${jobId}] Downloading video from DO VM:`, data.url);
    const videoBuffer = await downloadVideo(data.url);
    console.log(`[${jobId}] Video downloaded, size:`, videoBuffer.length, 'bytes');

    // Upload to Supabase bucket
    const fileName = `${jobId}.mp4`;
    console.log(`[${jobId}] Uploading to Supabase bucket as:`, fileName);
    const supabaseUrl = await uploadVideoToSupabase(videoBuffer, fileName);
    console.log(`[${jobId}] Video uploaded to Supabase:`, supabaseUrl);

    return {
      url: supabaseUrl,
      logs: `Render job completed successfully. Job ID: ${data.jobId || jobId}. Video uploaded to Supabase: ${supabaseUrl}`,
    };
  } catch (error) {
    console.error(`[${jobId}] Error in compileVideo:`, error);
    return {
      url: '',
      logs: `Error submitting render job: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
