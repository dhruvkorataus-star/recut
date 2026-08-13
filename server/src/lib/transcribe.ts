import { createReadStream } from 'node:fs';
import Groq from 'groq-sdk';
import { readAudioSamples } from './audio.js';

const PROVIDER = process.env.TRANSCRIBE_PROVIDER ?? 'local';
const LOCAL_MODEL = process.env.WHISPER_MODEL ?? 'Xenova/whisper-base.en';
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL ?? 'whisper-large-v3-turbo';

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptResult {
  text: string
  segments: TranscriptSegment[]
}

export function transcribeAudio(wavPath: string): Promise<TranscriptResult> {
  return PROVIDER === 'groq' ? transcribeGroq(wavPath) : transcribeLocal(wavPath)
}

let groqClient: Groq | null = null
function groq(): Groq {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in the environment')
  if (!groqClient) groqClient = new Groq({ apiKey })
  return groqClient
}

async function transcribeGroq(wavPath: string): Promise<TranscriptResult> {
  const res = (await groq().audio.transcriptions.create({
    file: createReadStream(wavPath),
    model: GROQ_WHISPER_MODEL,
    response_format: 'verbose_json',
  })) as { text?: string; segments?: Array<{ start: number; end: number; text: string }> }

  const segments = (res.segments ?? []).map((segment) => ({
    start: segment.start,
    end: segment.end,
    text: segment.text.trim(),
  }))

  return { text: (res.text ?? '').trim(), segments }
}

type WhisperOutput = { text?: string; chunks?: Array<{ timestamp: [number, number | null]; text: string }> }
type WhisperCall = (audio: Float32Array, options: Record<string, unknown>) => Promise<WhisperOutput>

let transcriberPromise: Promise<WhisperCall> | null = null
async function getTranscriber(): Promise<WhisperCall> {
  if (!transcriberPromise) {
    transcriberPromise = import('@huggingface/transformers').then(
      ({ pipeline }) => pipeline('automatic-speech-recognition', LOCAL_MODEL) as unknown as Promise<WhisperCall>,
    )
  }
  return transcriberPromise
}

async function transcribeLocal(wavPath: string): Promise<TranscriptResult> {
  const transcriber = await getTranscriber()
  const audio = await readAudioSamples(wavPath)

  const output = await transcriber(audio, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  })

  const segments: TranscriptSegment[] = (output.chunks ?? []).map((chunk) => ({
    start: chunk.timestamp[0] ?? 0,
    end: chunk.timestamp[1] ?? chunk.timestamp[0] ?? 0,
    text: chunk.text.trim(),
  }))

  return { text: (output.text ?? '').trim(), segments }
}
