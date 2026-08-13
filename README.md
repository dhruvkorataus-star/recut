# Recut

**One recording, every format.** Paste a YouTube link or upload a video or
podcast, and Recut transcribes it and turns it into a Twitter/X thread, a
LinkedIn post, a blog draft, and five short-form clip suggestions with
timestamps — from a single input.

## The problem I was trying to solve

A creator records one good hour — a podcast, a talk, a long video. Getting it
*made* is the hard part; getting it *seen* means cutting it up into all the
shapes each platform wants: a thread, a LinkedIn post, a blog write-up, a handful
of short clips. That repackaging is repetitive, takes longer than it should, and
is the first thing people skip when they're busy.

Recut does the repackaging. One input goes in, several publish-ready drafts come
out, and the clip suggestions come with real timestamps so you know exactly where
to cut. It is deliberately a *drafting* tool — it gets you to 80% so you can edit,
not a button that publishes for you.

## What it does

- **One input, four outputs** — a YouTube link *or* a file upload becomes an X
  thread, a LinkedIn post, a blog draft, and five clip ideas.
- **Runs the transcription locally** — Whisper runs on your machine through
  `@huggingface/transformers`, so there's no per-minute transcription bill.
- **Real timestamps** — the transcript is stored as timestamped segments, and the
  clip suggestions point back at them, so each clip has a start and end you can
  actually use.
- **Live progress** — the job runs in the background and its status
  (`fetching → transcribing → writing`) is pushed to the browser over a socket as
  it happens, rather than leaving you staring at a spinner.
- **Copy-ready** — every output has a copy button; the thread is broken into
  individual tweets and the blog renders as formatted Markdown.

## How it works

```
YouTube link / file upload
        |
        v
  [1] Get the audio        yt-dlp for links, the uploaded file otherwise,
        |                  then ffmpeg normalizes it to 16 kHz mono WAV
        v
  [2] Transcribe           local Whisper -> full text + timestamped segments
        |
        v
  [3] Generate             one LLM call per format, in parallel:
        |                  thread, LinkedIn, blog, and clip picks
        v
  [4] Store + stream       results saved to Postgres, status pushed over socket.io
```

A `POST /api/jobs` returns immediately with a job id. The three stages then run in
a background queue (one job at a time, so local transcription doesn't thrash the
CPU), and the browser follows along live.

## Tech stack, and why

| Choice | Reason |
| --- | --- |
| **React + TypeScript (Vite)** | Fast dev server, lean build, and types that catch mistakes before runtime |
| **CSS Modules** | Real, scoped CSS. Chose it over a utility framework so the styling stays hand-written and readable |
| **Node + Express + TypeScript** | Small and explicit; the whole pipeline is easy to follow top to bottom |
| **PostgreSQL (Neon)** | A job owns its segments and its results — relational data. Neon's free tier needs no local install |
| **Prisma** | Type-safe queries and migrations tracked in git |
| **Whisper via `@huggingface/transformers`** | Transcription that runs locally with no Python and no API cost. The model downloads once and is cached |
| **Groq** | The text generation. It's OpenAI-compatible, fast, and has a free tier; the model is swappable through one env var |
| **yt-dlp + ffmpeg** | Pulling audio from YouTube and normalizing any input to the exact format Whisper expects. Both ship as binaries, no system install needed |
| **Socket.io** | Live status. The job's state is the source of truth in the database — the socket only pushes updates, so if the connection drops, the status is still correct on refresh |

## Data model

```
Job  1 ---- * Segment      (timestamped chunks of the transcript)
  |
  1
  |
  *
Result                     (one row per output: THREAD, LINKEDIN, BLOG, CLIPS)
```

- A **Job** is one upload or link, tracked through a status enum
  (`QUEUED → FETCHING → TRANSCRIBING → GENERATING → DONE`, or `FAILED`).
- A **Segment** is a timestamped slice of the transcript. These are what the clip
  suggestions are drawn from.
- A **Result** holds one generated output. A unique constraint on
  `(jobId, kind)` means re-running a job overwrites its outputs instead of
  duplicating them. Segments and results are removed with their job
  (`onDelete: Cascade`).

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/jobs` | Start a job from a YouTube `url` (JSON) or a `file` upload (multipart). Returns the job id |
| `GET` | `/api/jobs/:id` | The job's status, and its assembled results once it is `DONE` |
| `GET` | `/api/health` | Health check |

Live updates run over Socket.io: the client emits `job:subscribe` with a job id,
and the server emits `job:update` for that job as it moves through the pipeline.

## Running it locally

You'll need Node 20+, a PostgreSQL database (Neon's free tier works), and a free
[Groq API key](https://console.groq.com/keys).

```bash
git clone https://github.com/dhruvkorataus-star/recut.git
cd recut
```

**API**

```bash
cd server
# yt-dlp's installer has a false-positive Python check; the binary it
# downloads is standalone, so skip it:
YOUTUBE_DL_SKIP_PYTHON_CHECK=1 npm install
cp .env.example .env       # then fill in DATABASE_URL and GROQ_API_KEY
npx prisma migrate dev     # creates the tables
npm run dev                # http://localhost:4000
```

**Client**, in a second terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev                # http://localhost:5173
```

The first job downloads the Whisper model (about 150 MB, once). Set
`WHISPER_MODEL` in the server `.env` to trade speed for accuracy —
`Xenova/whisper-tiny.en` is faster, `Xenova/whisper-small.en` is more accurate —
and `GROQ_MODEL` to change the text model.

## What is not built

The honest edges, because they're the interesting part:

- **The job queue lives in memory.** It runs one job at a time and forgets
  anything queued if the server restarts. A real deployment would move this to a
  durable queue.
- **Local transcription is slow on long audio.** Whisper on a CPU is fine for a
  short clip and slow for a two-hour podcast; the free-and-local trade-off is
  time. Swapping in a hosted Whisper endpoint would fix it at a cost.
- **The generated drafts need an editor.** They're good starting points, not
  finished posts — the tool is honest about being a first draft.
- **No accounts or history.** A job isn't tied to a user, and there's no page to
  come back to past results yet.
- **Free-tier rate limits.** Long transcripts can bump into Groq's free
  per-minute token limits; the smaller model is the workaround.
