import React, { useMemo } from 'react';
import {
  Play,
  Flame,
  Clock,
  Mic2,
  Flag,
  Disc3,
  Sparkles,
  Heart,
} from 'lucide-react';
import { TrackRecord, AlbumArtMode } from '../types/music';
import { getCoverUrl } from '../utils/cover';
import { ArtistLinks } from './ArtistLinks';

interface HomeViewProps {
  tracks: TrackRecord[];
  onPlayTrack: (track: TrackRecord) => void;
  onSelectAlbum: (albumName: string) => void;
  onSelectArtist: (artistName: string) => void;
  onSelectGenre: (genreName: string) => void;
  streamPort?: number;
  albumArtMode?: AlbumArtMode;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  onPlayTrack,
  onSelectAlbum,
  onSelectArtist,
  onSelectGenre,
  streamPort,
  albumArtMode = 'local_and_online',
}) => {
  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Quick 6 cards: favorites or most played tracks
  const quickCards = useMemo(() => {
    const favs = tracks.filter((t) => t.is_favorite);
    if (favs.length >= 6) return favs.slice(0, 6);
    const sortedByPlay = [...tracks].sort((a, b) => b.play_count - a.play_count);
    return sortedByPlay.slice(0, 6);
  }, [tracks]);

  // Recently played tracks
  const recentlyPlayed = useMemo(() => {
    return [...tracks]
      .filter((t) => (t.last_played ?? 0) > 0)
      .sort((a, b) => (b.last_played ?? 0) - (a.last_played ?? 0))
      .slice(0, 8);
  }, [tracks]);

  // Most played / Heavy rotation
  const mostPlayed = useMemo(() => {
    return [...tracks]
      .filter((t) => t.play_count > 0)
      .sort((a, b) => b.play_count - a.play_count)
      .slice(0, 8);
  }, [tracks]);

  // Top artists aggregated by track count and play count
  const topArtists = useMemo(() => {
    const map = new Map<string, { name: string; count: number; plays: number; sampleTrack: TrackRecord }>();
    tracks.forEach((t) => {
      const art = t.artist.trim();
      if (!art || art === 'Unknown Artist') return;
      const existing = map.get(art) || { name: art, count: 0, plays: 0, sampleTrack: t };
      existing.count += 1;
      existing.plays += t.play_count;
      if (!existing.sampleTrack.cover_path && t.cover_path) {
        existing.sampleTrack = t;
      }
      map.set(art, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.plays * 2 + b.count - (a.plays * 2 + a.count))
      .slice(0, 7);
  }, [tracks]);

  // Top genres aggregated
  const topGenres = useMemo(() => {
    const map = new Map<string, number>();
    tracks.forEach((t) => {
      const g = t.genre?.trim();
      if (!g || g.toLowerCase() === 'unknown') return;
      map.set(g, (map.get(g) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tracks]);

  // Local albums grouped and recommended
  const recommendedAlbums = useMemo(() => {
    // Group all tracks by album
    const albumMap = new Map<string, { name: string; artist: string; year?: number; sampleTrack: TrackRecord; count: number }>();
    tracks.forEach((t) => {
      const alb = t.album.trim();
      if (!alb || alb === 'Unknown Album') return;
      if (!albumMap.has(alb)) {
        albumMap.set(alb, {
          name: alb,
          artist: t.artist,
          year: t.year,
          sampleTrack: t,
          count: 1,
        });
      } else {
        const entry = albumMap.get(alb)!;
        entry.count += 1;
        if (!entry.sampleTrack.cover_path && t.cover_path) {
          entry.sampleTrack = t;
        }
      }
    });

    const allAlbums = Array.from(albumMap.values());
    if (allAlbums.length === 0) return [];

    // Prioritize albums matching top genres or top artists
    const topArtistNames = new Set(topArtists.map((a) => a.name.toLowerCase()));
    const topGenreNames = new Set(topGenres.map((g) => g.name.toLowerCase()));

    const scored = allAlbums.map((alb) => {
      let score = 0;
      if (topArtistNames.has(alb.artist.toLowerCase())) score += 10;
      if (alb.sampleTrack.genre && topGenreNames.has(alb.sampleTrack.genre.toLowerCase())) score += 5;
      if (alb.sampleTrack.is_favorite) score += 8;
      score += Math.min(alb.sampleTrack.play_count, 10);
      return { ...alb, score };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [tracks, topArtists, topGenres]);

  // Helper for cover image URL
  const resolveCover = (track?: TrackRecord) => {
    if (!track?.cover_path) return undefined;
    return getCoverUrl(track.cover_path, streamPort, undefined, albumArtMode);
  };

  // Genre gradient colors
  const genreColors = [
    'from-indigo-600 to-purple-800',
    'from-rose-600 to-orange-700',
    'from-emerald-600 to-teal-800',
    'from-blue-600 to-cyan-800',
    'from-amber-600 to-rose-700',
    'from-fuchsia-600 to-pink-800',
    'from-violet-600 to-indigo-900',
    'from-cyan-600 to-blue-900',
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-color)] p-6 space-y-8 select-none text-[var(--text-main)] animate-fadeIn">
      {/* 1. Header Greeting & Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{greeting}</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Personalized highlights and recommendations from your music library
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-zinc-400 font-medium bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-color)]" />
          <span>{tracks.length} tracks cataloged</span>
        </div>
      </div>

      {/* 2. Quick Access Grid (Spotify 6-card style) */}
      {quickCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickCards.map((track) => {
            const cover = resolveCover(track);
            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group relative flex items-center bg-white/[0.04] hover:bg-white/[0.10] border border-white/5 rounded-md overflow-hidden cursor-pointer transition-colors duration-200 pr-3"
              >
                {/* Album Cover Thumbnail */}
                <div className="w-14 h-14 bg-zinc-800 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                  <Disc3 className="w-6 h-6 text-zinc-500" />
                  {cover && (
                    <img
                      src={cover}
                      alt=""
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Track Details */}
                <div className="flex-1 px-3 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{track.title}</div>
                  <div className="text-xs text-zinc-400 truncate">
                    <ArtistLinks artists={track.artist} onSelectArtist={onSelectArtist} />
                  </div>
                </div>

                {/* Hover Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTrack(track);
                  }}
                  className="opacity-0 group-hover:opacity-100 w-9 h-9 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 flex-shrink-0"
                  title="Play"
                >
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Recommended Albums Section */}
      {recommendedAlbums.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-color)]" />
              <h2 className="text-lg font-bold text-white tracking-tight">Recommended Albums</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {recommendedAlbums.map((album) => {
              const cover = resolveCover(album.sampleTrack);
              return (
                <div
                  key={album.name}
                  onClick={() => onSelectAlbum(album.name)}
                  className="group bg-white/[0.03] hover:bg-white/[0.08] p-3.5 rounded-xl border border-white/5 cursor-pointer transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div className="aspect-square w-full rounded-lg bg-zinc-800 relative overflow-hidden shadow-md mb-2.5 flex items-center justify-center">
                    <Disc3 className="w-10 h-10 text-zinc-500" />
                    {cover && (
                      <img
                        src={cover}
                        alt=""
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(album.sampleTrack);
                      }}
                      className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[var(--accent-color)] text-white opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
                      title="Play Album"
                    >
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-white truncate leading-snug" title={album.name}>
                      {album.name}
                    </div>
                    <div className="text-[12px] text-zinc-400 truncate mt-1 leading-snug" title={album.artist}>
                      {album.artist}
                    </div>
                    {album.year && (
                      <div className="text-[11px] text-zinc-400 font-mono mt-1">{album.year}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Heavy Rotation / Most Played */}
      {mostPlayed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <h2 className="text-lg font-bold text-white tracking-tight">Most Played Tracks</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {mostPlayed.map((track, idx) => {
              const cover = resolveCover(track);
              return (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className="group bg-white/[0.03] hover:bg-white/[0.08] p-3.5 rounded-xl border border-white/5 cursor-pointer transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div className="aspect-square w-full rounded-lg bg-zinc-800 relative overflow-hidden shadow-md mb-2.5 flex items-center justify-center">
                    <Disc3 className="w-10 h-10 text-zinc-500" />
                    {cover && (
                      <img
                        src={cover}
                        alt=""
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur rounded text-[10px] font-mono text-zinc-300">
                      #{idx + 1}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[var(--accent-color)] text-white opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
                      title="Play"
                    >
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-white truncate leading-snug" title={track.title}>
                      {track.title}
                    </div>
                    <div className="text-[12px] text-zinc-400 truncate mt-1 leading-snug" title={track.artist}>
                      <ArtistLinks artists={track.artist} onSelectArtist={onSelectArtist} />
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-1">
                      {track.play_count} play{track.play_count === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Recently Played */}
      {recentlyPlayed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Recently Played</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {recentlyPlayed.map((track) => {
              const cover = resolveCover(track);
              return (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className="group bg-white/[0.02] hover:bg-white/[0.06] p-3 rounded-lg border border-white/5 cursor-pointer transition-colors flex flex-col justify-between"
                >
                  <div className="aspect-square w-full rounded-md bg-zinc-800 relative overflow-hidden shadow-md mb-2.5 flex items-center justify-center">
                    <Disc3 className="w-10 h-10 text-zinc-500" />
                    {cover && (
                      <img
                        src={cover}
                        alt=""
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[var(--accent-color)] text-white opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
                      title="Play"
                    >
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate" title={track.title}>
                      {track.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5" title={track.artist}>
                      <ArtistLinks artists={track.artist} onSelectArtist={onSelectArtist} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Top Artists (Circular Avatars) */}
      {topArtists.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Mic2 className="w-4 h-4 text-[var(--accent-color)]" />
            <h2 className="text-lg font-bold text-white tracking-tight">Top Artists</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {topArtists.map((artist) => {
              const cover = resolveCover(artist.sampleTrack);
              return (
                <div
                  key={artist.name}
                  onClick={() => onSelectArtist(artist.name)}
                  className="group flex flex-col items-center p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 cursor-pointer transition-colors text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-zinc-800 relative overflow-hidden shadow-md mb-2 flex items-center justify-center">
                    <Mic2 className="w-8 h-8 text-zinc-500" />
                    {cover && (
                      <img
                        src={cover}
                        alt=""
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white truncate w-full" title={artist.name}>
                    {artist.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {artist.count} track{artist.count === 1 ? '' : 's'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Top Genres (Spotify Badge Cards) */}
      {topGenres.length > 0 && (
        <div className="space-y-3 pb-6">
          <div className="flex items-center space-x-2">
            <Flag className="w-4 h-4 text-purple-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Top Genres</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {topGenres.map((g, idx) => {
              const bgGradient = genreColors[idx % genreColors.length];
              return (
                <div
                  key={g.name}
                  onClick={() => onSelectGenre(g.name)}
                  className={`bg-gradient-to-br ${bgGradient} p-3.5 rounded-lg cursor-pointer shadow-md hover:scale-[1.02] transition-transform flex flex-col justify-between h-20`}
                >
                  <div className="text-xs font-bold text-white capitalize truncate">{g.name}</div>
                  <div className="text-[10px] text-white/80 font-mono">
                    {g.count} track{g.count === 1 ? '' : 's'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
