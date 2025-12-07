export interface CompileRequest {
  code: string;
  jobId?: string;
}

export interface CompileResponse {
  jobId: string;
  status: JobStatus;
  message: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  url?: string;
  logs?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Job {
  jobId: string;
  code: string;
  status: JobStatus;
  url?: string;
  logs?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface VMRenderResponse {
  url: string;
  jobId: string;
  sceneUsed?: string;
}

export interface CompilationResult {
  url: string;
  logs: string;
  error?: string;
  errorDetails?: {
    stderr?: string;
    stdout?: string;
    message?: string;
    statusCode?: number;
  };
}
