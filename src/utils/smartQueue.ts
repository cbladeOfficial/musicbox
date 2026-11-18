import { TrackRecord } from '../types/music';

/**
 * Intelligent Spotify-like smart auto-queue algorithm.
 * Dynamically scores and ranks library tracks based on the currently playing track:
 * - Primary & collaborative artist affinity
 * - Genre similarity (exact & token overlap)
 * - Album proximity
 * - Era / Release year proximity
 * - Play count & user favorite weighting
 * - Penalty for recently played tracks to avoid loops
 * - Dynamic jitter & diversity guard to prevent artist repetition
 */
export function generateSmartQueue(
  currentTrack: TrackRecord | null,
  allTracks: TrackRecord[],
  manualQueue: TrackRecord[] = [],
  recentTrackIds: number[] = [],
  limit = 20
): TrackRecord[] {
  if (!currentTrack || allTracks.length === 0) return [];

  // Exclude current track and any track already in manual queue
  const manualQueueIds = new Set(manualQueue.map((t) => t.id));
  const recentIds = new Set(recentTrackIds.slice(-20)); // avoid recent tracks

  // Extract reference properties
  const currentArtists = currentTrack.artist
    .toLowerCase()
    .split(/[,&/]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const currentGenres = (currentTrack.genre || '')
    .toLowerCase()
    .split(/[,/;&]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const currentYear = currentTrack.year;
  const currentAlbum = currentTrack.album?.trim().toLowerCase();

  // Candidates: all tracks except current track and manual queue
  const candidates = allTracks.filter(
    (t) => t.id !== currentTrack.id && !manualQueueIds.has(t.id)
  );

  if (candidates.length === 0) return [];

  // Score each candidate track
  const scored = candidates.map((track) => {
    let score = 0;

    // 1. Artist Matching
    const trackArtists = track.artist
      .toLowerCase()
      .split(/[,&/]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const hasExactArtist =
      track.artist.trim().toLowerCase() === currentTrack.artist.trim().toLowerCase();
    const hasSharedArtist = trackArtists.some((a) => currentArtists.includes(a));

    if (hasExactArtist) {
      score += 35;
    } else if (hasSharedArtist) {
      score += 25;
    }

    // 2. Genre Matching
    if (currentGenres.length > 0 && track.genre) {
      const trackGenres = track.genre
        .toLowerCase()
        .split(/[,/;&]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const matchingGenres = trackGenres.filter((g) => currentGenres.includes(g));
      if (matchingGenres.length > 0) {
        score += 30 + matchingGenres.length * 5;
      }
    }

    // 3. Album proximity
    if (currentAlbum && track.album && track.album.trim().toLowerCase() === currentAlbum) {
      score += 20;
    }

    // 4. Era / Release Year Proximity
    if (currentYear && track.year) {
      const yearDiff = Math.abs(currentYear - track.year);
      if (yearDiff <= 2) {
        score += 15;
      } else if (yearDiff <= 5) {
        score += 10;
      } else if (yearDiff <= 10) {
        score += 5;
      }
    }

    // 5. User affinity (favorites & play count)
    if (track.is_favorite) {
      score += 12;
    }
    if (track.play_count > 0) {
      score += Math.min(10, track.play_count * 2);
    }

    // 6. Penalty for recently played to prevent looping the same songs
    if (recentIds.has(track.id)) {
      score -= 40;
    }

    // 7. Controlled random jitter (Smart Shuffle flavor)
    score += Math.random() * 16;

    return { track, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Diversity filter: don't have more than 2 consecutive songs by the same primary artist
  const result: TrackRecord[] = [];
  const selectedIds = new Set<number>();
  let lastArtist = '';
  let consecutiveArtistCount = 0;

  for (const item of scored) {
    if (result.length >= limit) break;
    if (selectedIds.has(item.track.id)) continue;

    const artist = item.track.artist.toLowerCase();
    if (artist === lastArtist) {
      if (consecutiveArtistCount >= 2 && scored.length > limit * 2) {
        // Skip for now to maintain variety
        continue;
      }
      consecutiveArtistCount += 1;
    } else {
      lastArtist = artist;
      consecutiveArtistCount = 1;
    }

    result.push(item.track);
    selectedIds.add(item.track.id);
  }

  // If diversity filter left us short, fill up from remaining scored tracks
  if (result.length < limit) {
    for (const item of scored) {
      if (result.length >= limit) break;
      if (!selectedIds.has(item.track.id)) {
        result.push(item.track);
        selectedIds.add(item.track.id);
      }
    }
  }

  return result;
}
