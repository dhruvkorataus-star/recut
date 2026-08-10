import Groq from 'groq-sdk';

const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

let client: Groq | null = null;
function groq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in the environment');
  if (!client) client = new Groq({ apiKey });
  return client;
}

async function complete(system: string, user: string, json = false): Promise<string> {
  const res = await groq().chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}

export interface Clip {
  start: number;
  end: number;
  title: string;
  reason: string;
}

export function generateThread(transcript: string, title: string): Promise<string> {
  return complete(
    'You are a social writer who turns talks into sharp X/Twitter threads. Write in a natural, human voice with no hashtags and no emoji spam. Each tweet is its own paragraph, under 280 characters. Open with a hook and close with a takeaway.',
    `Title: ${title}\n\nTranscript:\n${transcript}\n\nWrite a thread of 6-9 tweets. Number each tweet like "1/". Return only the thread.`,
  );
}

export function generateLinkedIn(transcript: string, title: string): Promise<string> {
  return complete(
    'You write thoughtful LinkedIn posts that sound like a real person reflecting, not a marketer. Short paragraphs, one idea each, a clear point of view. No hashtags stuffing, at most two at the end.',
    `Title: ${title}\n\nTranscript:\n${transcript}\n\nWrite a single LinkedIn post (150-250 words) drawn from the most useful idea. Return only the post.`,
  );
}

export function generateBlog(transcript: string, title: string): Promise<string> {
  return complete(
    'You are an editor who turns talks into readable blog drafts in Markdown. Use a clear headline, short sections with subheadings, and keep the speaker\'s actual points. Do not invent facts.',
    `Title: ${title}\n\nTranscript:\n${transcript}\n\nWrite a blog draft (500-800 words) in Markdown. Return only the Markdown.`,
  );
}

export async function generateClips(
  transcript: string,
  segments: Array<{ startSec: number; endSec: number; text: string }>,
): Promise<Clip[]> {
  const timeline = segments
    .map((s) => `[${s.startSec.toFixed(1)}-${s.endSec.toFixed(1)}] ${s.text}`)
    .join('\n');

  const raw = await complete(
    'You find the most clip-worthy moments in a talk for short-form video. Pick self-contained, punchy spans that would hook a viewer. Use only the timestamps provided.',
    `Transcript segments with timestamps:\n${timeline}\n\nReturn JSON: {"clips":[{"start":number,"end":number,"title":string,"reason":string}]} with exactly 5 clips, each 15-60 seconds, start/end in seconds taken from the segment timestamps.`,
    true,
  );

  const parsed = JSON.parse(raw) as { clips?: Clip[] };
  return (parsed.clips ?? []).slice(0, 5);
}
