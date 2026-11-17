import { ArtSource, ArtistInfo, AlbumInfo } from '../types/music';

// Clean HTML tags from Last.fm / online bios
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Clean query strings by removing duplicate artist names, remaster tags, and subtitle noise
function cleanQueryTerm(term: string, artist?: string): string {
  if (!term) return '';
  let cleaned = term;
  if (artist && artist.trim()) {
    // Remove repeated artist name from the term
    const escapedArtist = artist.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(escapedArtist, 'gi'), '');
  }
  // Strip subtitle noise: ": A Symphony by...", "- Remastered", "(Deluxe Edition)", etc.
  cleaned = cleaned.replace(/[:\-–—]\s*(A Symphony|Remastered|Deluxe|Special|Bonus|Anniversary|Expanded|Live|Explicit).*/i, '');
  cleaned = cleaned.replace(/[\(\[][^\)\]]*(?:remaster|deluxe|edition|anniversary|bonus|explicit|version|live|mono|stereo)[\)\]]/gi, '');
  return cleaned.replace(/[^\w\s\u00C0-\u024F\u0600-\u06FF\u0900-\u097F]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Verify that candidate artist from iTunes/JioSaavn/Last.fm/Wikipedia matches the expected artist
function isArtistMatch(expectedArtist: string, candidateArtist?: string): boolean {
  if (!candidateArtist || !expectedArtist) return false;
  const normExpected = normalizeForCompare(expectedArtist);
  const normCandidate = normalizeForCompare(candidateArtist);
  if (!normExpected || !normCandidate) return false;

  // Direct containment check
  if (normCandidate.includes(normExpected) || normExpected.includes(normCandidate)) {
    return true;
  }

  // Multi-artist split check (e.g. "Electric Light Orchestra" matches "Electric Light Orchestra, Jeff Lynne")
  const expectedParts = expectedArtist.split(/[,&/]/).map((p) => normalizeForCompare(p)).filter(Boolean);
  const candidateParts = candidateArtist.split(/[,&/]/).map((p) => normalizeForCompare(p)).filter(Boolean);

  for (const ep of expectedParts) {
    for (const cp of candidateParts) {
      if (cp.includes(ep) || ep.includes(cp)) return true;
    }
  }

  return false;
}

// Verify that candidate album from online source matches expected album
function isAlbumMatch(expectedAlbum: string, candidateAlbum?: string): boolean {
  if (!expectedAlbum || !candidateAlbum) return false;
  const normExpected = normalizeForCompare(expectedAlbum);
  const normCandidate = normalizeForCompare(candidateAlbum);
  if (!normExpected || !normCandidate) return false;

  if (normCandidate.includes(normExpected) || normExpected.includes(normCandidate)) {
    return true;
  }

  // Multi-word containment: check if key words match
  const expWords = expectedAlbum.toLowerCase().split(/\s+/).map((w) => normalizeForCompare(w)).filter((w) => w.length > 2);
  const candWords = candidateAlbum.toLowerCase().split(/\s+/).map((w) => normalizeForCompare(w)).filter((w) => w.length > 2);
  if (expWords.length > 0 && candWords.length > 0) {
    const common = expWords.filter((w) => candWords.includes(w));
    if (common.length >= Math.min(expWords.length, 1)) {
      return true;
    }
  }

  return false;
}

// Verify that candidate song title matches expected title
function isTitleMatch(expectedTitle: string, candidateTitle?: string): boolean {
  if (!expectedTitle || !candidateTitle) return false;
  const normExpected = normalizeForCompare(expectedTitle);
  const normCandidate = normalizeForCompare(candidateTitle);
  if (!normExpected || !normCandidate) return false;

  if (normCandidate.includes(normExpected) || normExpected.includes(normCandidate)) {
    return true;
  }

  const expWords = expectedTitle.toLowerCase().split(/\s+/).map((w) => normalizeForCompare(w)).filter((w) => w.length > 2);
  const candWords = candidateTitle.toLowerCase().split(/\s+/).map((w) => normalizeForCompare(w)).filter((w) => w.length > 2);
  if (expWords.length > 0 && candWords.length > 0) {
    const common = expWords.filter((w) => candWords.includes(w));
    if (common.length >= Math.min(expWords.length, 1)) {
      return true;
    }
  }

  return false;
}

export const MetadataService = {
  // 1. iTunes Search with Strict Artist, Album & Title Validation
  async fetchFromItunes(artist: string, album: string, title?: string): Promise<{ coverUrl?: string; year?: number; genre?: string } | null> {
    try {
      const cleanArt = artist.split(',')[0].trim();
      const cleanAlb = cleanQueryTerm(album, cleanArt);
      const cleanTit = cleanQueryTerm(title || '', cleanArt);

      // Attempt A: Search for the Album directly (highest precision for album cover art)
      if (cleanAlb && cleanAlb.length > 1) {
        const albumQuery = `${cleanArt} ${cleanAlb}`.trim();
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(albumQuery)}&entity=album&limit=8`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results) && data.results.length > 0) {
            // Must match artist AND album
            const matched = data.results.find((item: any) =>
              isArtistMatch(artist, item.artistName) && isAlbumMatch(cleanAlb, item.collectionName)
            );
            if (matched && matched.artworkUrl100) {
              const coverUrl = matched.artworkUrl100.replace(/100x100bb\.jpg$/, '1000x1000bb.jpg');
              const year = matched.releaseDate ? parseInt(matched.releaseDate.slice(0, 4), 10) : undefined;
              return {
                coverUrl,
                year: Number.isFinite(year) ? year : undefined,
                genre: matched.primaryGenreName,
              };
            }
          }
        }
      }

      // Attempt B: Search for Song with Artist + Title (must match artist AND title/album)
      if (cleanTit && cleanTit.length > 1) {
        const songQuery = `${cleanArt} ${cleanTit}`.trim();
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(songQuery)}&entity=song&limit=8`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results) && data.results.length > 0) {
            // Candidate must match artist AND either track title or album name
            const matched = data.results.find((item: any) => {
              if (!isArtistMatch(artist, item.artistName)) return false;
              if (cleanTit && isTitleMatch(cleanTit, item.trackName)) return true;
              if (cleanAlb && isAlbumMatch(cleanAlb, item.collectionName)) return true;
              return false;
            });
            if (matched && matched.artworkUrl100) {
              const coverUrl = matched.artworkUrl100.replace(/100x100bb\.jpg$/, '1000x1000bb.jpg');
              const year = matched.releaseDate ? parseInt(matched.releaseDate.slice(0, 4), 10) : undefined;
              return {
                coverUrl,
                year: Number.isFinite(year) ? year : undefined,
                genre: matched.primaryGenreName,
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('iTunes metadata search failed:', e);
    }
    return null;
  },

  // 2. Wikipedia Album Cover Art Search (High Accuracy Canonical Covers)
  async fetchAlbumFromWikipedia(
    artist: string,
    album: string,
    title?: string
  ): Promise<{ coverUrl?: string; year?: number } | null> {
    try {
      const cleanArt = artist.split(',')[0].trim();
      const cleanAlb = cleanQueryTerm(album, cleanArt);
      const cleanTit = cleanQueryTerm(title || '', cleanArt);
      if (!cleanAlb && !cleanTit) return null;

      const headers = { 'User-Agent': 'MusicBox/1.0 (https://github.com/cbladeOfficial/MusicBox; musicbox@app.local)' };

      // Helper to evaluate a Wikipedia page summary
      const evaluatePage = async (pageTitle: string): Promise<{ coverUrl?: string; year?: number } | null> => {
        try {
          const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
          const res = await fetch(sumUrl, { headers });
          if (!res.ok) return null;
          const data = await res.json();
          if (data.type === 'disambiguation') return null;

          const desc = (data.description || '').toLowerCase();
          const extract = (data.extract || '').toLowerCase();
          const pTitle = (data.title || '').toLowerCase();
          const orig = data.originalimage?.source;
          const thumb = data.thumbnail?.source;
          const img = orig || thumb;
          if (!img) return null;

          // Check if this page is music-related
          const isMusic = /album|soundtrack|extended play|\bep\b|single|record|studio album|rock opera|song\b/i.test(desc + ' ' + extract);
          // Check if page description indicates it's an artist/band biography rather than an album
          const isBioOnly = /\b(singer|songwriter|musician|band|group|rapper|disc jockey|composer|orchestra)\b/i.test(desc) &&
            !/\b(album|soundtrack|ep|single|song|discography)\b/i.test(desc);
          if (isBioOnly) return null;

          // Check that artist name matches
          const artWords = cleanArt.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
          const matchesArtist = artWords.some((w) => extract.includes(w) || desc.includes(w) || pTitle.includes(w));
          if (!matchesArtist) return null;

          // Check that album or title matches
          if (cleanAlb && !isAlbumMatch(cleanAlb, data.title) && !extract.includes(cleanAlb.toLowerCase()) && !pTitle.includes(cleanAlb.toLowerCase())) {
            return null;
          }

          if (isMusic) {
            let year: number | undefined;
            const yearMatch = (desc + ' ' + extract.slice(0, 150)).match(/\b(19\d\d|20\d\d)\b/);
            if (yearMatch) {
              year = parseInt(yearMatch[1], 10);
            }
            return { coverUrl: img, year };
          }
        } catch {
          return null;
        }
        return null;
      };

      // 1. Direct page candidates (highest accuracy & zero search clutter)
      if (cleanAlb) {
        const directCandidates = [
          `${cleanAlb} (${cleanArt} album)`,
          `${cleanAlb} (album)`,
          cleanAlb,
        ];
        for (const cand of directCandidates) {
          const res = await evaluatePage(cand);
          if (res) return res;
        }
      }

      // 2. Wikipedia Search API
      const searchTerms = cleanAlb ? `${cleanAlb} ${cleanArt} album` : `${cleanTit} ${cleanArt} song`;
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerms)}&format=json&origin=*`;
      const sRes = await fetch(searchUrl, { headers });
      if (sRes.ok) {
        const sData = await sRes.json();
        const results = sData.query?.search;
        if (Array.isArray(results) && results.length > 0) {
          for (const item of results.slice(0, 4)) {
            const res = await evaluatePage(item.title);
            if (res) return res;
          }
        }
      }
    } catch (e) {
      console.warn('Wikipedia album search error:', e);
    }
    return null;
  },

  // 3. JioSaavn Search with Strict Artist, Album & Title Validation
  async fetchFromJioSaavn(artist: string, album: string, title?: string): Promise<{ coverUrl?: string; year?: number } | null> {
    try {
      const cleanArt = artist.split(',')[0].trim();
      const cleanAlb = cleanQueryTerm(album, cleanArt);
      const cleanTit = cleanQueryTerm(title || '', cleanArt);
      const query = `${cleanArt} ${cleanTit || cleanAlb}`.trim();

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
              // Find result where artist matches AND title or album matches
              const matched = results.find((item: any) => {
                const itemArtist = item.primaryArtists || item.singers || item.artist || '';
                if (!isArtistMatch(artist, itemArtist)) return false;
                const itemTitle = item.name || item.title || item.song || '';
                const itemAlbum = item.album?.name || item.album || '';
                if (cleanTit && isTitleMatch(cleanTit, itemTitle)) return true;
                if (cleanAlb && isAlbumMatch(cleanAlb, itemAlbum)) return true;
                return false;
              });

              if (matched) {
                let coverUrl = '';
                if (Array.isArray(matched.image)) {
                  const best = matched.image[matched.image.length - 1];
                  coverUrl = typeof best === 'string' ? best : best.url || best.link;
                } else if (typeof matched.image === 'string') {
                  coverUrl = matched.image;
                }
                const year = matched.year ? parseInt(matched.year, 10) : undefined;
                return { coverUrl, year: Number.isFinite(year) ? year : undefined };
              }
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

  // 3. Last.fm API with Cleaned Query & Track Fallback
  async fetchFromLastfm(
    apiKey: string,
    artist: string,
    album?: string,
    title?: string
  ): Promise<{ coverUrl?: string; year?: number; bio?: string; albumSummary?: string; tags?: string[]; similar?: string[] } | null> {
    const key = apiKey.trim() || 'b25b959554ed76058ac220b7b2e0a026';
    const result: { coverUrl?: string; year?: number; bio?: string; albumSummary?: string; tags?: string[]; similar?: string[] } = {};

    try {
      // A. Fetch Artist Info
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

      // B. Fetch Album Info with Cleaned Album Term
      const cleanAlb = album ? cleanQueryTerm(album, artist) : '';
      if (artist && cleanAlb && cleanAlb !== 'Unknown Album') {
        const url = `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(cleanAlb)}&api_key=${key}&format=json`;
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

      // C. Fallback: Fetch Track Info (if album cover was not found or album was unknown)
      if (!result.coverUrl && artist && title) {
        const cleanTit = cleanQueryTerm(title, artist);
        if (cleanTit) {
          const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(cleanTit)}&api_key=${key}&format=json`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.track?.album?.image && Array.isArray(data.track.album.image)) {
              const img = data.track.album.image.find((i: { size: string }) => i.size === 'extralarge' || i.size === 'mega') || data.track.album.image[data.track.album.image.length - 1];
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
          const matched = data.data.find((item: any) => isArtistMatch(artist, item.name)) || data.data[0];
          const img = matched.picture_xl || matched.picture_big || matched.picture_medium || matched.picture;
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

    // 1. Try Deezer
    const deezer = await this.fetchArtistFromDeezer(artist);
    if (deezer?.imageUrl) {
      localStorage.setItem(cacheKey, deezer.imageUrl);
      return deezer.imageUrl;
    }

    // 2. Try Wikipedia
    const wiki = await this.fetchArtistFromWikipedia(artist);
    if (wiki?.imageUrl) {
      localStorage.setItem(cacheKey, wiki.imageUrl);
      return wiki.imageUrl;
    }

    return null;
  },

  // Synchronous lookup for previously resolved & validated cover art
  getCachedCoverArt(artist?: string, album?: string, title?: string): string | null {
    if (!artist && !album && !title) return null;
    const isUnknownArtist = !artist || artist.trim() === '' || artist === 'Unknown Artist';
    const isUnknownAlbum = !album || album.trim() === '' || album === 'Unknown Album';
    const isUnknownTitle = !title || title.trim() === '';
    if (isUnknownArtist && (isUnknownAlbum || isUnknownTitle)) return null;

    const cleanArtist = isUnknownArtist ? '' : artist.trim();
    const cleanAlbum = isUnknownAlbum ? '' : album.trim();
    const cleanTitle = isUnknownTitle ? '' : title.trim();

    const cacheKey = `mb_art_v4_${cleanArtist.toLowerCase()}_${(cleanAlbum || cleanTitle).toLowerCase()}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch {}

    // Fallback: Check primary artist cache key if multiple artists
    if (cleanArtist.includes(',')) {
      const primaryArtist = cleanArtist.split(',')[0].trim();
      const primaryKey = `mb_art_v4_${primaryArtist.toLowerCase()}_${(cleanAlbum || cleanTitle).toLowerCase()}`;
      try {
        const cached = localStorage.getItem(primaryKey);
        if (cached) return cached;
      } catch {}
    }

    return null;
  },

  // Multi-source Cover Art Resolver based on user priority with strict artist verification
  async resolveCoverArt(
    artist: string,
    album: string,
    title: string,
    priority: ArtSource[],
    lastfmKey: string
  ): Promise<string | null> {
    const isUnknownArtist = !artist || artist.trim() === '' || artist === 'Unknown Artist';
    const isUnknownAlbum = !album || album.trim() === '' || album === 'Unknown Album';
    const isUnknownTitle = !title || title.trim() === '';

    if (isUnknownArtist && (isUnknownAlbum || isUnknownTitle)) {
      return null;
    }

    const cleanArtist = isUnknownArtist ? '' : artist.trim();
    const cleanAlbum = isUnknownAlbum ? '' : album.trim();
    const cleanTitle = isUnknownTitle ? '' : title.trim();

    // Use versioned cache key to immediately purge previous incorrect lookups
    const cacheKey = `mb_art_v4_${cleanArtist.toLowerCase()}_${(cleanAlbum || cleanTitle).toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    for (const source of priority) {
      try {
        if (source === 'itunes') {
          const res = await this.fetchFromItunes(cleanArtist, cleanAlbum, cleanTitle);
          if (res?.coverUrl) {
            localStorage.setItem(cacheKey, res.coverUrl);
            return res.coverUrl;
          }
        } else if (source === 'wikipedia') {
          const res = await this.fetchAlbumFromWikipedia(cleanArtist, cleanAlbum, cleanTitle);
          if (res?.coverUrl) {
            localStorage.setItem(cacheKey, res.coverUrl);
            return res.coverUrl;
          }
        } else if (source === 'jiosaavn') {
          const res = await this.fetchFromJioSaavn(cleanArtist, cleanAlbum, cleanTitle);
          if (res?.coverUrl) {
            localStorage.setItem(cacheKey, res.coverUrl);
            return res.coverUrl;
          }
        } else if (source === 'lastfm') {
          const res = await this.fetchFromLastfm(lastfmKey, cleanArtist, cleanAlbum, cleanTitle);
          if (res?.coverUrl) {
            localStorage.setItem(cacheKey, res.coverUrl);
            return res.coverUrl;
          }
        }
      } catch (e) {
        console.warn(`Error resolving cover from ${source}:`, e);
      }
    }

    // Fallback: If artist has multiple artists (e.g. "Artist A, Artist B"), try with primary artist
    if (cleanArtist.includes(',')) {
      const primaryArtist = cleanArtist.split(',')[0].trim();
      for (const source of priority) {
        try {
          if (source === 'itunes') {
            const res = await this.fetchFromItunes(primaryArtist, cleanAlbum, cleanTitle);
            if (res?.coverUrl) {
              localStorage.setItem(cacheKey, res.coverUrl);
              return res.coverUrl;
            }
          } else if (source === 'wikipedia') {
            const res = await this.fetchAlbumFromWikipedia(primaryArtist, cleanAlbum, cleanTitle);
            if (res?.coverUrl) {
              localStorage.setItem(cacheKey, res.coverUrl);
              return res.coverUrl;
            }
          } else if (source === 'jiosaavn') {
            const res = await this.fetchFromJioSaavn(primaryArtist, cleanAlbum, cleanTitle);
            if (res?.coverUrl) {
              localStorage.setItem(cacheKey, res.coverUrl);
              return res.coverUrl;
            }
          } else if (source === 'lastfm') {
            const res = await this.fetchFromLastfm(lastfmKey, primaryArtist, cleanAlbum, cleanTitle);
            if (res?.coverUrl) {
              localStorage.setItem(cacheKey, res.coverUrl);
              return res.coverUrl;
            }
          }
        } catch {
          // ignore
        }
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

    if (artist.includes(',')) {
      return this.getArtistDetails(artist.split(',')[0].trim(), apiKey);
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

    const cleanAlb = cleanQueryTerm(album, artist);
    const [data, itunes, wiki] = await Promise.all([
      this.fetchFromLastfm(apiKey, artist, cleanAlb || album),
      this.fetchFromItunes(artist, cleanAlb || album),
      this.fetchAlbumFromWikipedia(artist, cleanAlb || album),
    ]);

    if (data?.albumSummary || itunes?.year || wiki?.year || itunes?.coverUrl || wiki?.coverUrl || data?.coverUrl) {
      const info: AlbumInfo = {
        name: album,
        artist,
        summary: data?.albumSummary || 'No summary available.',
        releaseDate: itunes?.year ? itunes.year.toString() : (wiki?.year ? wiki.year.toString() : undefined),
        coverUrl: itunes?.coverUrl || wiki?.coverUrl || data?.coverUrl,
      };
      localStorage.setItem(cacheKey, JSON.stringify(info));
      return info;
    }

    return null;
  },
};
