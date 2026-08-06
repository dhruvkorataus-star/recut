import { pipeline } from '@huggingface/transformers';
import { readAudioSamples } from './audio.js';

const MODEL = process.env.WHISPER_MODEL ?? 'Xenova/whisper-base.en';

type Transcriber = Awaited<ReturnType<typeof pipeline>>;
let transcriberPromise: Promise<Transcriber> | null = null;

function getTranscriber(): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline('automatic-speech-recognition', MODEL);
  }
  return transcriberPromise;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  text: string;
  segments: TranscriptSegment[];
}

export async function transcribeAudio(wavPath: string): Promise<TranscriptResult> {
  const transcriber = await getTranscriber();
  const audio = await readAudioSamples(wavPath);

  const output = (await transcriber(audio, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  })) as { text?: string; chunks?: Array<{ timestamp: [number, number | null]; text: string }> };

  const segments: TranscriptSegment[] = (output.chunks ?? []).map((chunk) => ({
    start: chunk.timestamp[0] ?? 0,
    end: chunk.timestamp[1] ?? chunk.timestamp[0] ?? 0,
    text: chunk.text.trim(),
  }));

  return { text: (output.text ?? '').trim(), segments };
}
