import React, { useMemo } from 'react';
import { Users, Disc3, Play } from 'lucide-react';
import { TrackRecord } from '../types/music';

interface AlbumArtistsViewProps {
  tracks: TrackRecord[];
  onSelectArtist: (artistName: string) => void;
  onPlayTracks: (tracks: TrackRecord[]) => void;
  streamPort?: number;
}

export const AlbumArtistsView: React.FC<AlbumArtistsViewProps> = ({
  tracks,
  onSelectArtist,
  onPlayTracks,
  streamPort,
}) => {
  // Group by album_artist, fallback to artist
  const albumArtists = useMemo(() => {
    const map = new Map<string, { name: string; tracks: TrackRecord[]; albumSet: Set<string>; sampleTrack: TrackRecord }>();

    tracks.forEach((t) => {
      const art = (t.album_artist || t.artist || 'Unknown Artist').trim();
      if (!map.has(art)) {
        map.set(art, {
          name: art,
          tracks: [],
          albumSet: new Set<string>(),
          sampleTrack: t,
        });
      }
      const entry = map.get(art)!;
      entry.tracks.push(t);
      if (t.album) entry.albumSet.add(t.album);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  const getCoverUrl = (track: TrackRecord) => {
    if (track.cover_path && streamPort) {
      return `http://127.0.0.1:${streamPort}/cover/${track.id}`;
    }
    return null;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-color)] p-6 space-y-6 select-none animate-fadeIn">
      <div className="flex items-center space-x-2">
        <Users className="w-5 h-5 text-[var(--accent-color)]" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Album Artists</h1>
        <span className="text-xs text-zinc-400 font-mono pl-2">({albumArtists.length} artists)</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {albumArtists.map((aa) => {
          const cover = getCoverUrl(aa.sampleTrack);
          return (
            <div
              key={aa.name}
              onClick={() => onSelectArtist(aa.name)}
              className="group bg-white/[0.02] hover:bg-white/[0.06] p-3 rounded-lg border border-white/5 cursor-pointer transition-colors flex flex-col justify-between"
            >
              <div className="aspect-square w-full rounded-md bg-zinc-800 relative overflow-hidden shadow-md mb-2.5 flex items-center justify-center">
                {cover ? (
                  <img src={cover} alt={aa.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-10 h-10 text-zinc-500" />
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTracks(aa.tracks);
                  }}
                  className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[var(--accent-color)] text-white opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
                  title="Play Artist"
                >
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </button>
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate" title={aa.name}>
                  {aa.name}
                </div>
                <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {aa.albumSet.size} album{aa.albumSet.size === 1 ? '' : 's'} • {aa.tracks.length} track{aa.tracks.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
