import { Job, JobStatus } from '../types';
import { compileVideo } from './compiler';

/**
 * In-memory job queue manager for handling concurrent video compilations
 * In production, this should be replaced with a persistent queue (Redis, Bull, etc.)
 */
class JobQueueManager {
  private jobs: Map<string, Job> = new Map();

  /**
   * Creates a new job and starts processing it
   * @param jobId - Unique job identifier
   * @param code - Manim Python code to compile
   * @returns The created job
   */
  async createJob(jobId: string, code: string): Promise<Job> {
    const job: Job = {
      jobId,
      code,
      status: JobStatus.PENDING,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    console.log(`[${jobId}] Job created`);

    // Process job asynchronously (non-blocking)
    this.processJob(jobId).catch((error) => {
      console.error(`[${jobId}] Unexpected error in job processing:`, error);
    });

    return job;
  }

  /**
   * Gets the current status of a job
   * @param jobId - Job identifier
   * @returns The job if found, undefined otherwise
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Gets all jobs (for debugging/monitoring)
   * @returns Array of all jobs
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Processes a job asynchronously
   * @param jobId - Job identifier
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`[${jobId}] Job not found`);
      return;
    }

    try {
      // Update status to processing
      job.status = JobStatus.PROCESSING;
      console.log(`[${jobId}] Job processing started`);

      // Compile the video
      const result = await compileVideo(jobId, job.code);

      // Update job with result
      if (result.error) {
        job.status = JobStatus.FAILED;
        job.error = result.error;
        job.logs = result.logs;
        console.log(`[${jobId}] Job failed:`, result.error);
      } else {
        job.status = JobStatus.COMPLETED;
        job.url = result.url;
        job.logs = result.logs;
        console.log(`[${jobId}] Job completed successfully`);
      }

      job.completedAt = new Date();
    } catch (error) {
      job.status = JobStatus.FAILED;
      job.error = error instanceof Error ? error.message : String(error);
      job.logs = `Unexpected error during compilation: ${job.error}`;
      job.completedAt = new Date();
      console.error(`[${jobId}] Job failed with exception:`, error);
    }
  }

  /**
   * Clears old jobs from memory (call periodically to prevent memory leaks)
   * @param olderThanHours - Remove jobs older than this many hours
   */
  clearOldJobs(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleared = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < cutoffTime) {
        this.jobs.delete(jobId);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`Cleared ${cleared} old jobs from memory`);
    }

    return cleared;
  }
}

// Export singleton instance
export const jobQueue = new JobQueueManager();
