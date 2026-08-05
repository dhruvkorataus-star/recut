# Recut

**One recording, every format.** Paste a YouTube link or upload a video/podcast, and Recut turns it into a Twitter/X thread, a LinkedIn post, a blog draft, and short-form clip suggestions with timestamps — from a single input.

## Stack

- **Client** — Vite + React 19 + TypeScript, CSS Modules
- **Server** — Node + Express 5 + TypeScript (ESM)
- **Database** — PostgreSQL via Prisma
- **Transcription** — Whisper, running locally
- **Text generation** — LLM (Groq)

## Running locally

```bash
# server
cd server
# yt-dlp's installer has a false-positive Python check; the binary it
# downloads is standalone, so skip it:
YOUTUBE_DL_SKIP_PYTHON_CHECK=1 npm install
npm run dev        # http://localhost:4000

# client (separate terminal)
cd client
npm install
npm run dev        # http://localhost:5173
```

Copy `.env.example` to `.env` in each folder and fill in the values as you reach each step.

## Status

Early development — built step by step.
