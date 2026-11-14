import { LyricsData, LyricsLine, TrackRecord } from '../types/music';

// Parse LRC formatted string into timestamped lines
export function parseLrc(lrcText: string): LyricsLine[] {
  const lines = lrcText.split('\n');
  const result: LyricsLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    timeRegex.lastIndex = 0;
    const match = timeRegex.exec(trimmed);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const totalSeconds = minutes * 60 + seconds + ms / 1000;
      const text = trimmed.replace(timeRegex, '').trim();

      if (text) {
        result.push({ time: totalSeconds, text });
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
