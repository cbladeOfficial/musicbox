/**
 * Helper to safely resolve cover image URLs without running into WebView2 file:// blocks.
 * Local embedded covers are always prioritized over online search results.
 */
export function getCoverUrl(
  coverPath?: string,
  streamPort = 45321,
  onlineCoverUrl?: string
): string | undefined {
  // 1. If local embedded cover exists, always prioritize it!
  if (coverPath && coverPath.trim()) {
    if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
      return coverPath;
    }
    // Local files must be served through our tiny localhost server to avoid WebView2 file:// protocol restrictions
    return `http://127.0.0.1:${streamPort}/stream?path=${encodeURIComponent(coverPath)}`;
  }

  // 2. Only fall back to online cover art if no local cover is embedded
  if (onlineCoverUrl && onlineCoverUrl.trim()) {
    return onlineCoverUrl;
  }

  return undefined;
}

/**
 * Format bitrate properly from Lofty / audio properties.
 * Handles both kbps (e.g. 320, 256, 128) and bps (> 10000).
 */
export function formatBitrate(bitrate?: number): string {
  if (!bitrate || bitrate <= 0) return '';
  const kbps = bitrate >= 10000 ? Math.round(bitrate / 1000) : Math.round(bitrate);
  return `${kbps} kbps`;
}
