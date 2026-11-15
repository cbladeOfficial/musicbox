import { LyricsData, LyricsLine, TrackRecord } from '../types/music';

// Parse LRC formatted string into timestamped lines (supports multi-timestamp lines & flexible formats)
export function parseLrc(lrcText: string): LyricsLine[] {
  const lines = lrcText.split(/\r?\n/);
  const result: LyricsLine[] = [];
  const singleTagRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Find all timestamp tags in this line
    const matches = [...trimmed.matchAll(singleTagRegex)];
    if (matches.length > 0) {
      // The lyric text is whatever remains after removing all [mm:ss.xx] tags
      const lyricText = trimmed.replace(singleTagRegex, '').trim();

      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        let ms = 0;
        if (match[3]) {
          const rawMs = match[3];
          if (rawMs.length === 1) ms = parseInt(rawMs, 10) * 100;
          else if (rawMs.length === 2) ms = parseInt(rawMs, 10) * 10;
          else ms = parseInt(rawMs.slice(0, 3), 10);
        }
        const totalSeconds = minutes * 60 + seconds + ms / 1000;
        result.push({
          time: totalSeconds,
          text: lyricText || '•••',
        });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export const LyricsService = {
  async fetchLyrics(track: TrackRecord): Promise<LyricsData | null> {
    const cacheKey = `mb_lyrics_${track.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    try {
      // 1. Try exact match from LRCLIB
      const params = new URLSearchParams({
        track_name: track.title,
        artist_name: track.artist,
        album_name: track.album,
        duration: Math.round(track.duration).toString(),
      });

      let res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.syncedLyrics || data.plainLyrics) {
          const parsed: LyricsData = {
            synced: !!data.syncedLyrics,
            lines: data.syncedLyrics ? parseLrc(data.syncedLyrics) : [],
            plain: data.plainLyrics || undefined,
          };
          localStorage.setItem(cacheKey, JSON.stringify(parsed));
          return parsed;
        }
      }

      // 2. Try search query if exact match not found
      const searchQuery = `${track.artist} ${track.title}`.trim();
      res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const match = items[0];
          const parsed: LyricsData = {
            synced: !!match.syncedLyrics,
            lines: match.syncedLyrics ? parseLrc(match.syncedLyrics) : [],
            plain: match.plainLyrics || undefined,
          };
          localStorage.setItem(cacheKey, JSON.stringify(parsed));
          return parsed;
        }
      }
    } catch (e) {
      console.warn('LRCLIB lyrics fetch failed:', e);
    }

    return null;
  },
};
