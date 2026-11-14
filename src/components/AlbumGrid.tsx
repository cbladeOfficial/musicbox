import React from 'react';
import { Play, Disc3 } from 'lucide-react';
import { TrackRecord } from '../types/music';

export interface AlbumItem {
  name: string;
  artist: string;
  year?: number;
  trackCount: number;
  coverPath?: string;
  tracks: TrackRecord[];
}

interface AlbumGridProps {
  albums: AlbumItem[];
  onSelectAlbum: (album: AlbumItem) => void;
  onPlayAlbum: (album: AlbumItem) => void;
}

export const AlbumGrid: React.FC<AlbumGridProps> = ({
  albums,
  onSelectAlbum,
  onPlayAlbum,
}) => {
  if (albums.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-muted)] italic">
        No albums found in library.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 select-none">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {albums.map((album) => (
          <div
            key={`${album.artist}_${album.name}`}
            onClick={() => onSelectAlbum(album)}
            className="group flex flex-col p-3 rounded-lg bg-[var(--surface-color)]/60 hover:bg-[var(--surface-color)] border border-[var(--border-color)]/60 hover:border-[var(--border-color)] transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md"
          >
            {/* Album Cover Container */}
            <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[var(--surface-active)] border border-[var(--border-color)]/40 mb-2.5">
              {album.coverPath ? (
                <img
                  src={`file://${album.coverPath}`}
                  alt={album.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                  <Disc3 className="w-10 h-10 opacity-30 stroke-1" />
                </div>
              )}

              {/* Floating Play Button on Hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayAlbum(album);
                }}
                title="Play Album"
                className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 shadow-lg shadow-black/40 hover:scale-105"
              >
                <Play className="w-5 h-5 fill-current translate-x-0.5" />
              </button>
            </div>

            {/* Album Metadata */}
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-[var(--text-main)] truncate group-hover:underline">
                {album.name}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] truncate">
                {album.artist}
              </span>
              <div className="flex items-center space-x-1.5 text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                {album.year ? <span>{album.year}</span> : null}
                {album.year ? <span>•</span> : null}
                <span>{album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
