import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
export const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');
export const AUDIO_DIR = path.join(STORAGE_DIR, 'audio');

mkdirSync(UPLOADS_DIR, { recursive: true });
mkdirSync(AUDIO_DIR, { recursive: true });

export function audioPathFor(jobId: string) {
  return path.join(AUDIO_DIR, `${jobId}.wav`);
}
