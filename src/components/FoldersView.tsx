import React, { useMemo, useState } from 'react';
import { Folder, Play, ArrowLeft, ChevronRight, Music } from 'lucide-react';
import { TrackRecord } from '../types/music';

interface FoldersViewProps {
  tracks: TrackRecord[];
  onPlayTrack: (track: TrackRecord) => void;
  onPlayTracks: (tracks: TrackRecord[]) => void;
}

export const FoldersView: React.FC<FoldersViewProps> = ({
  tracks,
  onPlayTrack,
  onPlayTracks,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Group tracks by parent folder path
  const folders = useMemo(() => {
    const map = new Map<string, TrackRecord[]>();

    tracks.forEach((t) => {
      // Extract directory path
      const lastSlash = Math.max(t.path.lastIndexOf('/'), t.path.lastIndexOf('\\'));
      const dirPath = lastSlash !== -1 ? t.path.substring(0, lastSlash) : 'Unknown Folder';
      if (!map.has(dirPath)) {
        map.set(dirPath, []);
      }
      map.get(dirPath)!.push(t);
    });

    return Array.from(map.entries())
      .map(([path, folderTracks]) => {
        const parts = path.split(/[/\\]/);
        const folderName = parts[parts.length - 1] || path;
        return {
          path,
          name: folderName,
          tracks: folderTracks,
          count: folderTracks.length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  const activeFolder = useMemo(() => {
    if (!selectedFolder) return null;
    return folders.find((f) => f.path === selectedFolder) || null;
  }, [folders, selectedFolder]);

  if (activeFolder) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-color)] p-6 space-y-6 select-none animate-fadeIn">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedFolder(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Folders</span>
            </button>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center space-x-2">
              <Folder className="w-4 h-4 text-[var(--accent-color)]" />
              <h1 className="text-xl font-bold text-white truncate max-w-xl" title={activeFolder.path}>
                {activeFolder.name}
              </h1>
              <span className="text-xs text-zinc-400 font-mono">({activeFolder.count} tracks)</span>
            </div>
          </div>

          <button
            onClick={() => onPlayTracks(activeFolder.tracks)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[var(--accent-color)] text-white hover:brightness-110 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Folder</span>
          </button>
        </div>

        <div className="text-xs font-mono text-zinc-400 bg-white/5 p-2 rounded-md truncate">
          {activeFolder.path}
        </div>

        <div className="space-y-1">
          {activeFolder.tracks.map((t, idx) => (
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
        <Folder className="w-5 h-5 text-[var(--accent-color)]" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Music Folders</h1>
        <span className="text-xs text-zinc-400 font-mono pl-2">({folders.length} directories)</span>
      </div>

      <div className="space-y-2">
        {folders.map((f) => (
          <div
            key={f.path}
            onClick={() => setSelectedFolder(f.path)}
            className="flex items-center justify-between p-3.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 cursor-pointer transition-colors group"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <Folder className="w-5 h-5 text-[var(--accent-color)] flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate group-hover:text-[var(--accent-color)] transition-colors">
                  {f.name}
                </div>
                <div className="text-xs font-mono text-zinc-400 truncate">
                  {f.path}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs text-zinc-400 flex-shrink-0">
              <span className="font-mono bg-white/5 px-2.5 py-1 rounded">
                {f.count} track{f.count === 1 ? '' : 's'}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
