import youtubeDl from 'youtube-dl-exec';

// Modern yt-dlp needs a JS runtime to solve YouTube's player challenges;
// point it at the Node we already have instead of requiring Deno.
const JS_RUNTIME = 'node';

// Read a video's metadata without downloading it, so we can label the job.
export async function fetchYoutubeInfo(url: string): Promise<{ title: string; durationSec: number }> {
  const info = (await youtubeDl(url, {
    dumpSingleJson: true,
    noPlaylist: true,
    noWarnings: true,
    jsRuntimes: JS_RUNTIME,
  })) as { title?: string; duration?: number };

  return {
    title: info.title ?? 'Untitled',
    durationSec: Math.round(info.duration ?? 0),
  };
}

// Download the best audio-only stream. yt-dlp fills in the real extension, so
// outputTemplate should contain "%(ext)s".
export async function downloadAudio(url: string, outputTemplate: string): Promise<void> {
  await youtubeDl(url, {
    format: 'bestaudio/best',
    output: outputTemplate,
    noPlaylist: true,
    noWarnings: true,
    jsRuntimes: JS_RUNTIME,
  });
}
