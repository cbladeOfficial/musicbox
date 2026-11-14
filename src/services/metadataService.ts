import { ArtSource, ArtistInfo, AlbumInfo } from '../types/music';

// Clean HTML tags from Last.fm / online bios
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export const MetadataService = {
  // 1. iTunes Search
  async fetchFromItunes(artist: string, album: string, title?: string): Promise<{ coverUrl?: string; year?: number; genre?: string } | null> {
    try {
      const query = `${artist} ${album || title || ''}`.trim();
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          let coverUrl = item.artworkUrl100;
          if (coverUrl) {
            // Replace 100x100 with ultra-crisp 1000x1000 resolution
            coverUrl = coverUrl.replace(/100x100bb\.jpg$/, '1000x1000bb.jpg');
          }
          const year = item.releaseDate ? parseInt(item.releaseDate.slice(0, 4), 10) : undefined;
          return {
            coverUrl,
            year: Number.isFinite(year) ? year : undefined,
            genre: item.primaryGenreName,
          };
        }
      }
    } catch (e) {
      console.warn('iTunes metadata search failed:', e);
    }
    return null;
  },

  // 2. JioSaavn Search
  async fetchFromJioSaavn(artist: string, album: string, title?: string): Promise<{ coverUrl?: string; year?: number } | null> {
    try {
      const query = `${artist} ${album || title || ''}`.trim();
      // Try reliable public Saavn endpoints
      const endpoints = [
        `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`,
        `https://saavn.me/search/songs?query=${encodeURIComponent(query)}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            const results = data.data?.results || data.results;
            if (Array.isArray(results) && results.length > 0) {
              const item = results[0];
              let coverUrl = '';
              if (Array.isArray(item.image)) {
                // Get highest resolution image
                const best = item.image[item.image.length - 1];
                coverUrl = typeof best === 'string' ? best : best.url || best.link;
              } else if (typeof item.image === 'string') {
                coverUrl = item.image;
              }
              const year = item.year ? parseInt(item.year, 10) : undefined;
              return { coverUrl, year: Number.isFinite(year) ? year : undefined };
            }
          }
        } catch {
          continue;
        }
      }
    } catch (e) {
      console.warn('JioSaavn metadata search failed:', e);
    }
    return null;
  },

  // 3. Last.fm API
  async fetchFromLastfm(
    apiKey: string,
    artist: string,
    album?: string,
    title?: string
  ): Promise<{ coverUrl?: string; year?: number; bio?: string; albumSummary?: string; tags?: string[]; similar?: string[] } | null> {
    // If user has not provided an API key, use public Last.fm read key
    const key = apiKey.trim() || 'b25b959554ed76058ac220b7b2e0a026';
    const result: { coverUrl?: string; year?: number; bio?: string; albumSummary?: string; tags?: string[]; similar?: string[] } = {};

    try {
      // Fetch Artist Info
      if (artist && artist !== 'Unknown Artist') {
        const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist)}&api_key=${key}&format=json`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.artist) {
            if (data.artist.bio?.summary) {
              result.bio = stripHtml(data.artist.bio.summary);
            }
            if (Array.isArray(data.artist.tags?.tag)) {
              result.tags = data.artist.tags.tag.map((t: { name: string }) => t.name).slice(0, 5);
            }
            if (Array.isArray(data.artist.similar?.artist)) {
              result.similar = data.artist.similar.artist.map((a: { name: string }) => a.name).slice(0, 5);
            }
          }
        }
      }

      // Fetch Album Info
      if (artist && album && album !== 'Unknown Album') {
        const url = `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}&api_key=${key}&format=json`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.album) {
            if (data.album.wiki?.summary) {
              result.albumSummary = stripHtml(data.album.wiki.summary);
            }
            if (Array.isArray(data.album.image)) {
              const img = data.album.image.find((i: { size: string }) => i.size === 'extralarge' || i.size === 'mega') || data.album.image[data.album.image.length - 1];
              if (img && img['#text']) {
                result.coverUrl = img['#text'];
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Last.fm fetch error:', e);
    }

    return Object.keys(result).length > 0 ? result : null;
  },

  // Multi-source Cover Art Resolver based on user priority
  async resolveCoverArt(
    artist: string,
    album: string,
    title: string,
    priority: ArtSource[],
    lastfmKey: string
  ): Promise<string | null> {
    const cacheKey = `mb_art_${artist}_${album}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    for (const source of priority) {
      try {
        if (source === 'itunes') {
          const res = await this.fetchFromItunes(artist, album, title);
          if (res?.coverUrl) {
            localStorage.setItem(cacheKey, res.coverUrl);
            return res.coverUrl;
          }
        } else if (source === 'jiosaavn') {
          const res = await this.fetchFromJioSaavn(artist, album, title);
          if (res?.coverUrl) {
            localStorage.setItem(cacheKey, res.coverUrl);
            return res.coverUrl;
          }
        } else if (source === 'lastfm') {
          const res = await this.fetchFromLastfm(lastfmKey, artist, album, title);
          if (res?.coverUrl) {
            localStorage.setItem(cacheKey, res.coverUrl);
            return res.coverUrl;
          }
        }
      } catch (e) {
        console.warn(`Error resolving cover from ${source}:`, e);
      }
    }

    return null;
  },

  // Fetch Artist Biography & Info
  async getArtistDetails(artist: string, apiKey: string): Promise<ArtistInfo | null> {
    const cacheKey = `mb_artist_bio_${artist}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* ignore */ }
    }

    const data = await this.fetchFromLastfm(apiKey, artist);
    if (data?.bio) {
      const info: ArtistInfo = {
        name: artist,
        bio: data.bio,
        tags: data.tags || [],
        similar: data.similar || [],
      };
      localStorage.setItem(cacheKey, JSON.stringify(info));
      return info;
    }

    return null;
  },

  // Fetch Album Description & Info
  async getAlbumDetails(artist: string, album: string, apiKey: string): Promise<AlbumInfo | null> {
    const cacheKey = `mb_album_info_${artist}_${album}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* ignore */ }
    }

    const data = await this.fetchFromLastfm(apiKey, artist, album);
    const itunes = await this.fetchFromItunes(artist, album);

    if (data?.albumSummary || itunes?.year) {
      const info: AlbumInfo = {
        name: album,
        artist,
        summary: data?.albumSummary || 'No summary available.',
        releaseDate: itunes?.year ? itunes.year.toString() : undefined,
        coverUrl: data?.coverUrl || itunes?.coverUrl,
      };
      localStorage.setItem(cacheKey, JSON.stringify(info));
      return info;
    }

    return null;
  },
};
