import { Router } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma.js';
import { enqueueJob } from '../lib/pipeline.js';
import { UPLOADS_DIR } from '../lib/storage.js';

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
      status: 'QUEUED',
    },
  });

  enqueueJob({ jobId: job.id, uploadPath: file?.path });

  res.status(201).json({ id: job.id, status: job.status });
});

router.get('/:id', async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: { results: true },
  });
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  const byKind = Object.fromEntries(job.results.map((result) => [result.kind, result.content]));

  res.json({
    id: job.id,
    status: job.status,
    source: job.source,
    title: job.title,
    durationSec: job.durationSec,
    error: job.error,
    createdAt: job.createdAt,
    results:
      job.status === 'DONE'
        ? {
            thread: byKind.THREAD ?? null,
            linkedin: byKind.LINKEDIN ?? null,
            blog: byKind.BLOG ?? null,
            clips: byKind.CLIPS ? JSON.parse(byKind.CLIPS) : null,
          }
        : null,
  });
});

export default router;
