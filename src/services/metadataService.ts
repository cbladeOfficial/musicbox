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
              result.bio = stripHtml(data.artist.bio.summary).replace(/Read more on Last\.fm.*$/i, '').trim();
            } else if (data.artist.bio?.content) {
              result.bio = stripHtml(data.artist.bio.content).replace(/Read more on Last\.fm.*$/i, '').trim();
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
              result.albumSummary = stripHtml(data.album.wiki.summary).replace(/Read more on Last\.fm.*$/i, '').trim();
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

  // 4. Deezer Artist Search (HD Artist Portraits)
  async fetchArtistFromDeezer(artist: string): Promise<{ imageUrl?: string } | null> {
    try {
      if (!artist || artist === 'Unknown Artist') return null;
      const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artist)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          const first = data.data[0];
          const img = first.picture_xl || first.picture_big || first.picture_medium || first.picture;
          if (img) return { imageUrl: img };
        }
      }
    } catch (e) {
      console.warn('Deezer artist search failed:', e);
    }
    return null;
  },

  // 5. Wikipedia Artist Summary & Thumbnail (Fallback)
  async fetchArtistFromWikipedia(artist: string): Promise<{ bio?: string; imageUrl?: string } | null> {
    try {
      if (!artist || artist === 'Unknown Artist') return null;
      const cleanName = artist.trim().replace(/\s+/g, '_');
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`);
      if (res.ok) {
        const data = await res.json();
        return {
          bio: data.extract ? data.extract : undefined,
          imageUrl: data.thumbnail?.source ? data.thumbnail.source : undefined,
        };
      }
    } catch (e) {
      console.warn('Wikipedia artist summary fetch failed:', e);
    }
    return null;
  },

  // Fast resolver for artist portraits (cached in localStorage)
  async fetchArtistImage(artist: string): Promise<string | null> {
    if (!artist || artist === 'Unknown Artist') return null;
    const cacheKey = `mb_artist_img_${artist.toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    // 1. Try Deezer (highest quality musician portraits)
    const deezer = await this.fetchArtistFromDeezer(artist);
    if (deezer?.imageUrl) {
      localStorage.setItem(cacheKey, deezer.imageUrl);
      return deezer.imageUrl;
    }

    // 2. Fallback to Wikipedia REST
    const wiki = await this.fetchArtistFromWikipedia(artist);
    if (wiki?.imageUrl) {
      localStorage.setItem(cacheKey, wiki.imageUrl);
      return wiki.imageUrl;
    }

    return null;
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

  // Fetch Full Artist Details: Picture, Bio, Tags, and Similar Artists
  async getArtistDetails(artist: string, apiKey: string): Promise<ArtistInfo | null> {
    if (!artist || artist === 'Unknown Artist') return null;
    const cacheKey = `mb_artist_details_${artist.toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.bio || parsed.image) return parsed;
      } catch { /* ignore */ }
    }

    // Parallel fetch from Last.fm, Deezer, and Wikipedia
    const [lastfm, image, wiki] = await Promise.all([
      this.fetchFromLastfm(apiKey, artist),
      this.fetchArtistImage(artist),
      this.fetchArtistFromWikipedia(artist),
    ]);

    const bio = lastfm?.bio || wiki?.bio || '';
    const resolvedImage = image || wiki?.imageUrl || undefined;
    const tags = lastfm?.tags || [];
    const similar = lastfm?.similar || [];

    if (bio || resolvedImage || tags.length > 0) {
      const info: ArtistInfo = {
        name: artist,
        bio,
        image: resolvedImage,
        tags,
        similar,
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
