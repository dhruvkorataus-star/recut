import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegStatic from 'ffmpeg-static';

const run = promisify(execFile);
const ffmpegPath = ffmpegStatic as unknown as string | null;

export async function toWav16kMono(inputPath: string, outputPath: string): Promise<number> {
  if (!ffmpegPath) throw new Error('ffmpeg binary not found');

  const { stderr } = await run(
    ffmpegPath,
    ['-y', '-i', inputPath, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', outputPath],
    { maxBuffer: 1024 * 1024 * 64 },
  );

  return parseDurationSec(stderr);
}

export async function readAudioSamples(inputPath: string): Promise<Float32Array> {
  if (!ffmpegPath) throw new Error('ffmpeg binary not found');

  const { stdout } = await run(
    ffmpegPath,
    ['-i', inputPath, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'],
    { encoding: 'buffer', maxBuffer: 1024 * 1024 * 1024 },
  );

  const buf = stdout as unknown as Buffer;
  const usable = buf.length - (buf.length % 4);
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + usable));
}

function parseDurationSec(stderr: string): number {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const [, hours, minutes, seconds] = match;
  return Math.round(Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds));
}
