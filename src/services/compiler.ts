import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { config } from '../config/env';
import { uploadVideoToSupabase } from './storage';
import { CompilationResult } from '../types';

/**
 * Compiles a Manim video locally using Docker
 * @param jobId - Unique identifier for the compilation job
 * @param code - Manim Python code to compile
 * @returns Compilation result with URL, logs, and potential errors
 */
export async function compileVideo(
  jobId: string,
  code: string
): Promise<CompilationResult> {
  const tempDir = path.join(process.cwd(), 'temp', jobId);
  const pythonFile = path.join(tempDir, 'scene.py');
  const outputDir = path.join(tempDir, 'media');

  try {
    console.log(`[${jobId}] Starting local Docker compilation`);

    // Create temp directory
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Write Python code to file
    writeFileSync(pythonFile, code);
    console.log(`[${jobId}] Python file created at: ${pythonFile}`);

    // Extract scene class name from code
    const sceneNameMatch = code.match(/class\s+(\w+)\s*\(\s*Scene\s*\)/);
    const sceneName = sceneNameMatch ? sceneNameMatch[1] : 'Scene';
    console.log(`[${jobId}] Detected scene name: ${sceneName}`);

    // Run Docker container with Manim
    const dockerImage = config.dockerImage || 'manimcommunity/manim:latest';
    const renderQuality = config.renderQuality || 'ql';
    
    const dockerArgs = [
      'run',
      '--rm',
      '-v', `${tempDir}:/manim`,
      dockerImage,
      'manim',
      'render',
      '/manim/scene.py',
      sceneName,
      `-${renderQuality}`,
      '--media_dir', '/manim/media',
      '--format', 'mp4'
    ];

    console.log(`[${jobId}] Running Docker command: docker ${dockerArgs.join(' ')}`);

    const { stdout, stderr, exitCode } = await runDockerCommand(dockerArgs);
    
    console.log(`[${jobId}] Docker process exited with code: ${exitCode}`);
    console.log(`[${jobId}] Docker stdout length: ${stdout.length} chars`);
    console.log(`[${jobId}] Docker stderr length: ${stderr.length} chars`);

    if (exitCode !== 0) {
      console.error(`[${jobId}] Docker execution failed with exit code ${exitCode}`);
      console.error(`[${jobId}] stderr:`, stderr);
      
      // Clean up before returning error
      cleanupTempFiles(tempDir);
      
      return {
        url: '',
        logs: `Docker execution failed (exit code ${exitCode})`,
        error: stderr || 'Unknown compilation error',
        errorDetails: {
          stderr,
          stdout,
          message: `Docker process exited with code ${exitCode}`,
          statusCode: exitCode,
        },
      };
    }

    // Find the rendered video file
    const videoPath = findRenderedVideo(outputDir, sceneName);
    
    if (!videoPath) {
      console.error(`[${jobId}] Video file not found in output directory`);
      
      // Clean up before returning error
      cleanupTempFiles(tempDir);
      
      return {
        url: '',
        logs: 'Compilation succeeded but video file not found',
        error: 'Video file not found in output directory',
        errorDetails: {
          stderr,
          stdout,
          message: 'Video file not found after rendering',
        },
      };
    }

    console.log(`[${jobId}] Video found at: ${videoPath}`);

    // Read video file
    const videoBuffer = readFileSync(videoPath);
    console.log(`[${jobId}] Video file size: ${videoBuffer.length} bytes`);

    // Upload to Supabase
    const fileName = `${jobId}.mp4`;
    console.log(`[${jobId}] Uploading to Supabase as: ${fileName}`);
    const supabaseUrl = await uploadVideoToSupabase(videoBuffer, fileName);
    console.log(`[${jobId}] Video uploaded to Supabase: ${supabaseUrl}`);

    // Clean up temp files
    cleanupTempFiles(tempDir);
    console.log(`[${jobId}] Temp files cleaned up`);

    return {
      url: supabaseUrl,
      logs: `Render job completed successfully. Job ID: ${jobId}. Video uploaded to Supabase: ${supabaseUrl}\n\nCompilation output:\n${stdout}`,
    };
  } catch (error) {
    console.error(`[${jobId}] Error in compileVideo:`, error);
    
    // Clean up on error
    try {
      cleanupTempFiles(tempDir);
    } catch (cleanupError) {
      console.error(`[${jobId}] Error during cleanup:`, cleanupError);
    }

    return {
      url: '',
      logs: `Error during compilation: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Runs a Docker command and returns stdout, stderr, and exit code
 */
function runDockerCommand(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const process = spawn('docker', args);
    
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });

    process.on('error', (error) => {
      resolve({
        stdout,
        stderr: error.message,
        exitCode: 1,
      });
    });
  });
}

/**
 * Finds the rendered video file in the output directory
 */
function findRenderedVideo(mediaDir: string, sceneName: string): string | null {
  try {
    // Manim output structure: media/videos/scene/480p15/SceneName.mp4 (for -ql)
    // Quality levels: 480p15 (ql), 720p30 (qm), 1080p60 (qh), 2160p60 (qk)
    const qualityDirs = ['480p15', '720p30', '1080p60', '2160p60'];
    
    for (const qualityDir of qualityDirs) {
      const videosDir = path.join(mediaDir, 'videos', 'scene', qualityDir);
      
      if (!existsSync(videosDir)) {
        continue;
      }

      const files = readdirSync(videosDir);
      console.log(`Files in ${qualityDir}:`, files);

      // Look for the scene video file
      const videoFile = files.find(f => f.endsWith('.mp4') && f.includes(sceneName));
      
      if (videoFile) {
        return path.join(videosDir, videoFile);
      }

      // Fallback: return any mp4 file
      const anyMp4 = files.find(f => f.endsWith('.mp4'));
      if (anyMp4) {
        return path.join(videosDir, anyMp4);
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding video file:', error);
    return null;
  }
}

/**
 * Cleans up temporary files and directories
 */
function cleanupTempFiles(tempDir: string): void {
  try {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
}
