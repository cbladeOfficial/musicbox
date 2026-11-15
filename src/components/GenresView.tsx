import React, { useMemo } from 'react';
import { Flag, Play, Music2, ArrowLeft } from 'lucide-react';
import { TrackRecord } from '../types/music';

interface GenresViewProps {
  tracks: TrackRecord[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
  onPlayTrack: (track: TrackRecord) => void;
  onPlayTracks: (tracks: TrackRecord[]) => void;
  streamPort?: number;
}

export const GenresView: React.FC<GenresViewProps> = ({
  tracks,
  selectedGenre,
  onSelectGenre,
  onPlayTrack,
  onPlayTracks,
  streamPort,
}) => {
  // Aggregate tracks by genre
  const genreList = useMemo(() => {
    const map = new Map<string, TrackRecord[]>();
    tracks.forEach((t) => {
      const g = t.genre?.trim() || 'Unknown Genre';
      if (!map.has(g)) {
        map.set(g, []);
      }
      map.get(g)!.push(t);
    });

    return Array.from(map.entries())
      .map(([name, genreTracks]) => ({
        name,
        tracks: genreTracks,
        count: genreTracks.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [tracks]);

  // Tracks for the currently selected genre
  const activeGenreData = useMemo(() => {
    if (!selectedGenre) return null;
    return genreList.find((g) => g.name.toLowerCase() === selectedGenre.toLowerCase()) || null;
  }, [genreList, selectedGenre]);

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

  if (activeGenreData) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-color)] p-6 space-y-6 select-none animate-fadeIn">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onSelectGenre(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Genres</span>
            </button>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center space-x-2">
              <Flag className="w-4 h-4 text-purple-400" />
              <h1 className="text-xl font-bold text-white capitalize">{activeGenreData.name}</h1>
              <span className="text-xs text-zinc-400 font-mono">({activeGenreData.count} tracks)</span>
            </div>
          </div>

          <button
            onClick={() => onPlayTracks(activeGenreData.tracks)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[var(--accent-color)] text-white hover:brightness-110 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play All</span>
          </button>
        </div>

        <div className="space-y-1">
          {activeGenreData.tracks.map((t, idx) => (
            <div
              key={t.id}
              onClick={() => onPlayTrack(t)}
              className="group flex items-center justify-between px-3.5 py-2.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer text-sm"
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <span className="text-xs font-mono text-zinc-400 w-5 text-right">{idx + 1}</span>
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">{t.title}</div>
                  <div className="text-xs text-zinc-400 truncate">{t.artist} • {t.album}</div>
                </div>
              </div>
              <div className="text-xs font-mono text-zinc-400">
                {Math.floor(t.duration / 60)}:{(Math.floor(t.duration % 60)).toString().padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-color)] p-6 space-y-6 select-none animate-fadeIn">
      <div className="flex items-center space-x-2">
        <Flag className="w-5 h-5 text-purple-400" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Music Genres</h1>
        <span className="text-xs text-zinc-400 font-mono pl-2">({genreList.length} total)</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {genreList.map((g, idx) => {
          const bgGradient = genreColors[idx % genreColors.length];
          return (
            <div
              key={g.name}
              onClick={() => onSelectGenre(g.name)}
              className={`bg-gradient-to-br ${bgGradient} p-4 rounded-xl cursor-pointer shadow-lg hover:scale-[1.03] transition-all flex flex-col justify-between h-28 relative overflow-hidden group`}
            >
              <div className="text-sm font-bold text-white capitalize truncate">{g.name}</div>
              <div className="flex items-center justify-between text-xs text-white/80 font-mono">
                <span>{g.count} track{g.count === 1 ? '' : 's'}</span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white/20">
                  <Play className="w-3 h-3 fill-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
