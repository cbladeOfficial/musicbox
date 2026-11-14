/**
 * Helper to safely resolve cover image URLs without running into WebView2 file:// blocks.
 */
export function getCoverUrl(
  coverPath?: string,
  streamPort = 45321,
  onlineCoverUrl?: string
): string | undefined {
  if (onlineCoverUrl && onlineCoverUrl.trim()) {
    return onlineCoverUrl;
  }
  if (!coverPath || !coverPath.trim()) {
    return undefined;
  }
  if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
    return coverPath;
  }
  // Local files must be served through our tiny localhost server to avoid WebView2 file:// protocol restrictions
  return `http://127.0.0.1:${streamPort}/stream?path=${encodeURIComponent(coverPath)}`;
}
