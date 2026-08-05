import youtubeDl from 'youtube-dl-exec';

const JS_RUNTIME = 'node';

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

export async function downloadAudio(url: string, outputTemplate: string): Promise<void> {
  await youtubeDl(url, {
    format: 'bestaudio/best',
    output: outputTemplate,
    noPlaylist: true,
    noWarnings: true,
    jsRuntimes: JS_RUNTIME,
  });
}
