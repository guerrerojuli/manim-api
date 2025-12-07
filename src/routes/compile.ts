import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { compileVideo } from '../services/compiler';
import { getVideoFromSupabase } from '../services/storage';

const router: Router = Router();

// Validation schema for compile request
const compileSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty'),
  jobId: z.string().optional(),
});

/**
 * POST /api/compile
 * Synchronously compile a video and return the result
 * This endpoint waits for the compilation to complete before responding
 */
router.post('/compile', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parsed = compileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const { code, jobId: customJobId } = parsed.data;

    // Generate job ID if not provided
    const jobId = customJobId || `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

    console.log(`[${jobId}] Starting synchronous compilation`);

    // Compile the video synchronously (wait for completion)
    const result = await compileVideo(jobId, code);

    // Return success or failure response
    if (result.error || !result.url) {
      return res.status(500).json({
        success: false,
        logs: result.logs,
        error: result.error || 'Compilation failed',
        errorDetails: result.errorDetails,
        jobId,
      });
    }

    return res.status(200).json({
      success: true,
      url: result.url,
      logs: result.logs,
      jobId,
    });
  } catch (error) {
    console.error('Error in /api/compile:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      logs: error instanceof Error ? error.message : String(error),
    });
  }
});



/**
 * GET /api/video/:videoId
 * Serve a video file from Supabase storage
 */
router.get('/video/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const fileName = `${videoId}.mp4`;

    const videoBuffer = await getVideoFromSupabase(fileName);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', videoBuffer.length);
    return res.send(videoBuffer);
  } catch (error) {
    console.error('Error in /api/video:', error);
    return res.status(404).json({
      error: 'Video not found',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});



export default router;
