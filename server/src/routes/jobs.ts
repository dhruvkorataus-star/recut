import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma.js';
import { toWav16kMono } from '../lib/audio.js';
import { audioPathFor, UPLOADS_DIR } from '../lib/storage.js';
import { transcribeAudio } from '../lib/transcribe.js';
import { downloadAudio, fetchYoutubeInfo } from '../lib/youtube.js';

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 500 * 1024 * 1024 },
});

const router = Router();

router.post('/', upload.single('file'), async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  const file = req.file;

  if (!url && !file) {
    return res.status(400).json({ error: 'Provide a YouTube url or a file upload.' });
  }

  const job = await prisma.job.create({
    data: {
      source: url ? 'YOUTUBE' : 'UPLOAD',
      sourceUrl: url || null,
      fileName: file?.originalname ?? null,
      status: 'FETCHING',
    },
  });

  try {
    let sourcePath: string;
    let title = file?.originalname ?? null;
    let durationHint = 0;

    if (url) {
      const info = await fetchYoutubeInfo(url);
      title = info.title;
      durationHint = info.durationSec;
      await downloadAudio(url, path.join(UPLOADS_DIR, `${job.id}-src.%(ext)s`));
      sourcePath = await findDownloaded(job.id);
    } else {
      sourcePath = file!.path;
    }

    const parsedDuration = await toWav16kMono(sourcePath, audioPathFor(job.id));
    await unlink(sourcePath).catch(() => {});

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'QUEUED',
        title,
        durationSec: parsedDuration || durationHint || null,
      },
    });

    res.status(201).json({
      id: updated.id,
      status: updated.status,
      source: updated.source,
      title: updated.title,
      durationSec: updated.durationSec,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'FAILED', error: message },
    });
    res.status(500).json({ error: 'Failed to process the input.', jobId: job.id });
  }
});

router.post('/:id/transcribe', async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id } });
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  await prisma.job.update({ where: { id: job.id }, data: { status: 'TRANSCRIBING' } });

  try {
    const { text, segments } = await transcribeAudio(audioPathFor(job.id));

    await prisma.$transaction([
      prisma.segment.deleteMany({ where: { jobId: job.id } }),
      prisma.segment.createMany({
        data: segments.map((segment, idx) => ({
          jobId: job.id,
          idx,
          startSec: segment.start,
          endSec: segment.end,
          text: segment.text,
        })),
      }),
      prisma.job.update({
        where: { id: job.id },
        data: { transcript: text, status: 'QUEUED' },
      }),
    ]);

    res.json({
      id: job.id,
      status: 'QUEUED',
      segments: segments.length,
      transcript: text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'FAILED', error: message },
    });
    res.status(500).json({ error: 'Transcription failed.', jobId: job.id });
  }
});

async function findDownloaded(jobId: string): Promise<string> {
  const files = await readdir(UPLOADS_DIR);
  const match = files.find((name) => name.startsWith(`${jobId}-src.`));
  if (!match) throw new Error('Downloaded audio file not found');
  return path.join(UPLOADS_DIR, match);
}

export default router;
