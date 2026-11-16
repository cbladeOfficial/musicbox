/**
 * MediaSession Service for Windows System Media Transport Controls (SMTC) & Media Keys
 * Provides rich metadata (Title, Artist, Album, Artwork), playback status, and Action Center controls.
 */

export interface MediaSessionMetadataParams {
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string | null;
}

export interface MediaSessionActionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onStop: () => void;
  onSeek?: (position: number) => void;
}

export function updateMediaSessionMetadata(params: MediaSessionMetadataParams) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

  const artwork: MediaImage[] = [];
  if (params.artworkUrl) {
    artwork.push(
      { src: params.artworkUrl, sizes: '512x512', type: 'image/jpeg' },
      { src: params.artworkUrl, sizes: '256x256', type: 'image/jpeg' },
      { src: params.artworkUrl, sizes: '128x128', type: 'image/jpeg' },
      { src: params.artworkUrl, sizes: '96x96', type: 'image/jpeg' }
    );
  } else {
    artwork.push(
      { src: 'http://127.0.0.1:45321/icon', sizes: '512x512', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/app-icon.png', sizes: '128x128', type: 'image/png' }
    );
  }

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: params.title || 'MusicBox',
      artist: params.artist || 'MusicBox Player',
      album: params.album || '',
      artwork,
    });
  } catch (err) {
    console.warn('[MediaSession] Failed to set metadata:', err);
  }
}

export function updateMediaSessionPlaybackState(isPlaying: boolean) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  } catch (err) {
    console.warn('[MediaSession] Failed to update playback state:', err);
  }
}

export function updateMediaSessionPosition(currentTime: number, duration: number) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  if (!('setPositionState' in navigator.mediaSession)) return;
  if (!duration || isNaN(duration) || !isFinite(duration) || duration <= 0) return;

  try {
    const safeCurrent = Math.min(Math.max(0, currentTime), duration);
    navigator.mediaSession.setPositionState({
      duration: Math.max(0, duration),
      playbackRate: 1,
      position: safeCurrent,
    });
  } catch {
    // Ignore out-of-range state updates
  }
}

export function setupMediaSessionActions(callbacks: MediaSessionActionCallbacks): () => void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return () => {};
  }

  const actions: [MediaSessionAction, MediaSessionActionHandler | null][] = [
    ['play', () => callbacks.onPlay()],
    ['pause', () => callbacks.onPause()],
    ['previoustrack', () => callbacks.onPrevious()],
    ['nexttrack', () => callbacks.onNext()],
    ['stop', () => callbacks.onStop()],
    [
      'seekto',
      (details) => {
        if (callbacks.onSeek && details.seekTime !== undefined && details.seekTime !== null) {
          callbacks.onSeek(details.seekTime);
        }
      },
    ],
    [
      'seekbackward',
      (details) => {
        const offset = details.seekOffset || 10;
        if (callbacks.onSeek) {
          const current = (navigator.mediaSession as unknown as { positionState?: { position?: number } })?.positionState?.position || 0;
          callbacks.onSeek(Math.max(0, current - offset));
        }
      },
    ],
    [
      'seekforward',
      (details) => {
        const offset = details.seekOffset || 10;
        if (callbacks.onSeek) {
          const current = (navigator.mediaSession as unknown as { positionState?: { position?: number } })?.positionState?.position || 0;
          callbacks.onSeek(current + offset);
        }
      },
    ],
  ];

  for (const [action, handler] of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Some browsers / OS versions might not support specific actions
    }
  }

  return () => {
    for (const [action] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // cleanup ignore
      }
    }
  };
}
