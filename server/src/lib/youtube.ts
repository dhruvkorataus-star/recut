import youtubeDlExec from 'youtube-dl-exec';

const youtubeDl = youtubeDlExec as unknown as (
  url: string,
  options?: Record<string, unknown>,
) => Promise<unknown>;

const JS_RUNTIME = 'node';

// Datacenter IPs (Render, etc.) get YouTube's "confirm you're not a bot" wall on
// the default web client. These clients sometimes slip past it without cookies.
const EXTRACTOR_ARGS = 'youtube:player_client=default,tv,ios,web_safari';

export async function fetchYoutubeInfo(url: string): Promise<{ title: string; durationSec: number }> {
  const info = (await youtubeDl(url, {
    dumpSingleJson: true,
    noPlaylist: true,
    noWarnings: true,
    jsRuntimes: JS_RUNTIME,
    extractorArgs: EXTRACTOR_ARGS,
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
    extractorArgs: EXTRACTOR_ARGS,
  });
}
