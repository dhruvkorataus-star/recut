import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import prisma from './prisma.js';
import { toWav16kMono } from './audio.js';
import { generateBlog, generateClips, generateLinkedIn, generateThread } from './generate.js';
import { emitJobUpdate } from './realtime.js';
import { audioPathFor, UPLOADS_DIR } from './storage.js';
import { transcribeAudio } from './transcribe.js';
import { downloadAudio, fetchYoutubeInfo } from './youtube.js';

type Status = 'QUEUED' | 'FETCHING' | 'TRANSCRIBING' | 'GENERATING' | 'DONE' | 'FAILED';

interface QueueItem {
  jobId: string;
  uploadPath?: string;
}

const queue: QueueItem[] = [];
let running = false;

export function enqueueJob(item: QueueItem) {
  queue.push(item);
  void drain();
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      await processJob(queue.shift()!);
    }
  } finally {
    running = false;
  }
}

async function setStatus(jobId: string, status: Status, extra: Record<string, unknown> = {}) {
  const job = await prisma.job.update({ where: { id: jobId }, data: { status, ...extra } });
  emitJobUpdate(jobId, {
    id: job.id,
    status: job.status,
    title: job.title,
    durationSec: job.durationSec,
    error: job.error,
  });
}

async function processJob({ jobId, uploadPath }: QueueItem) {
  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return;

    await setStatus(jobId, 'FETCHING');
    let sourcePath: string;
    let title = job.title;
    let durationHint = 0;

    if (job.source === 'YOUTUBE' && job.sourceUrl) {
      const info = await fetchYoutubeInfo(job.sourceUrl);
      title = info.title;
      durationHint = info.durationSec;
      await downloadAudio(job.sourceUrl, path.join(UPLOADS_DIR, `${jobId}-src.%(ext)s`));
      sourcePath = await findDownloaded(jobId);
    } else if (uploadPath) {
      sourcePath = uploadPath;
    } else {
      throw new Error('No input available for job.');
    }

    const duration = await toWav16kMono(sourcePath, audioPathFor(jobId));
    await unlink(sourcePath).catch(() => {});
    await prisma.job.update({
      where: { id: jobId },
      data: { title, durationSec: duration || durationHint || null },
    });

    await setStatus(jobId, 'TRANSCRIBING');
    const { text, segments } = await transcribeAudio(audioPathFor(jobId));
    await prisma.$transaction(
      [
        prisma.segment.deleteMany({ where: { jobId } }),
        prisma.segment.createMany({
          data: segments.map((segment, idx) => ({
            jobId,
            idx,
            startSec: segment.start,
            endSec: segment.end,
            text: segment.text,
          })),
        }),
        prisma.job.update({ where: { id: jobId }, data: { transcript: text } }),
      ],
      { maxWait: 10000, timeout: 20000 },
    );

    await setStatus(jobId, 'GENERATING');
    const stored = await prisma.segment.findMany({ where: { jobId }, orderBy: { idx: 'asc' } });
    const label = title ?? 'Untitled';
    const [thread, linkedin, blog, clips] = await Promise.all([
      generateThread(text, label),
      generateLinkedIn(text, label),
      generateBlog(text, label),
      generateClips(text, stored),
    ]);

    const outputs = [
      { kind: 'THREAD', content: thread },
      { kind: 'LINKEDIN', content: linkedin },
      { kind: 'BLOG', content: blog },
      { kind: 'CLIPS', content: JSON.stringify(clips) },
    ] as const;

    await prisma.$transaction(
      outputs.map((output) =>
        prisma.result.upsert({
          where: { jobId_kind: { jobId, kind: output.kind } },
          create: { jobId, kind: output.kind, content: output.content },
          update: { content: output.content },
        }),
      ),
      { maxWait: 10000, timeout: 20000 },
    );

    await setStatus(jobId, 'DONE');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setStatus(jobId, 'FAILED', { error: message }).catch(() => {});
  }
}

async function findDownloaded(jobId: string): Promise<string> {
  const files = await readdir(UPLOADS_DIR);
  const match = files.find((name) => name.startsWith(`${jobId}-src.`));
  if (!match) throw new Error('Downloaded audio file not found');
  return path.join(UPLOADS_DIR, match);
}
