import { AlbumArtMode } from '../types/music';

/**
 * Helper to safely resolve cover image URLs without running into WebView2 file:// blocks.
 * Local embedded covers are always prioritized:
 * - Shows local embedded album art only when embedded in the track.
 * - Otherwise (no embedded local art), falls back to online search if albumArtMode is 'local_and_online'.
 * - Otherwise disables album art entirely (no online search).
 */
export function getCoverUrl(
  coverPath?: string,
  streamPort = 45321,
  onlineCoverUrl?: string,
  albumArtMode: AlbumArtMode = 'local_and_online'
): string | undefined {
  if (albumArtMode === 'disabled') {
    return undefined;
  }

  // 1. If local embedded cover exists, always show local album art only!
  if (coverPath && coverPath.trim()) {
    if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
      return coverPath;
    }
    // Local files must be served through our tiny localhost server to avoid WebView2 file:// protocol restrictions
    return `http://127.0.0.1:${streamPort}/stream?path=${encodeURIComponent(coverPath)}`;
  }

  // 2. Otherwise (when no local art is embedded), fallback to online search only if enabled in settings
  if (albumArtMode === 'local_and_online' && onlineCoverUrl && onlineCoverUrl.trim()) {
    return onlineCoverUrl;
  }

  // Otherwise disable album art entirely for this track
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
