import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Everything the pipeline writes to disk lives under server/storage (gitignored).
export const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
export const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');
export const AUDIO_DIR = path.join(STORAGE_DIR, 'audio');

// Create the folders up front so multer and ffmpeg have somewhere to write.
mkdirSync(UPLOADS_DIR, { recursive: true });
mkdirSync(AUDIO_DIR, { recursive: true });

// The normalized 16 kHz WAV a job gets transcribed from, named by job id.
export function audioPathFor(jobId: string) {
  return path.join(AUDIO_DIR, `${jobId}.wav`);
}
