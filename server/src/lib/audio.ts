import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';

const run = promisify(execFile);

// Convert any audio/video file to 16 kHz mono 16-bit WAV — the exact shape
// Whisper wants — and return the source's duration in seconds.
export async function toWav16kMono(inputPath: string, outputPath: string): Promise<number> {
  if (!ffmpegPath) throw new Error('ffmpeg binary not found');

  const { stderr } = await run(
    ffmpegPath,
    ['-y', '-i', inputPath, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', outputPath],
    { maxBuffer: 1024 * 1024 * 64 },
  );

  return parseDurationSec(stderr);
}

// ffmpeg prints "Duration: 00:03:21.45" to stderr; pull the seconds out of it.
function parseDurationSec(stderr: string): number {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const [, hours, minutes, seconds] = match;
  return Math.round(Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds));
}
