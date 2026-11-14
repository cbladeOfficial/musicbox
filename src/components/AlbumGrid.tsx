import React from 'react';
import { Play, Disc3 } from 'lucide-react';
import { TrackRecord } from '../types/music';
import { getCoverUrl } from '../utils/cover';

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
  streamPort: number;
  onSelectAlbum: (album: AlbumItem) => void;
  onPlayAlbum: (album: AlbumItem) => void;
}

export const AlbumGrid: React.FC<AlbumGridProps> = ({
  albums,
  streamPort,
  onSelectAlbum,
  onPlayAlbum,
}) => {
  if (albums.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] space-y-3">
        <Disc3 className="w-10 h-10 opacity-30 stroke-1" />
        <p>No albums found in library. Scan a music folder to populate albums.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 select-none bg-[var(--bg-color)]">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {albums.map((album) => {
          const coverSrc = getCoverUrl(album.coverPath, streamPort);
          return (
            <div
              key={`${album.artist}_${album.name}`}
              onClick={() => onSelectAlbum(album)}
              className="group flex flex-col p-2.5 rounded bg-[var(--surface-color)]/60 hover:bg-[var(--surface-color)] border border-[var(--border-color)]/50 hover:border-[var(--border-color)] transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md"
            >
              {/* Cover Art Container */}
              <div className="relative aspect-square w-full rounded bg-[var(--surface-active)] border border-[var(--border-color)]/40 mb-2 overflow-hidden">
                {coverSrc ? (
                  <img
                    src={coverSrc}
                    alt={album.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                    <Disc3 className="w-10 h-10 opacity-25 stroke-1" />
                  </div>
                )}

                {/* Floating Play Button on Hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayAlbum(album);
                  }}
                  title="Play Album"
                  className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 shadow-md shadow-black/40 hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                </button>
              </div>

              {/* Album Metadata */}
              <div className="flex flex-col truncate px-0.5">
                <span className="text-xs font-semibold text-[var(--text-main)] truncate group-hover:underline tracking-tight">
                  {album.name}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] truncate hover:text-[var(--text-main)]">
                  {album.artist}
                </span>
                <div className="flex items-center space-x-1.5 text-[10px] text-[var(--text-muted)] mt-1 font-mono tabular-nums opacity-80">
                  {album.year ? <span>{album.year}</span> : null}
                  {album.year ? <span>•</span> : null}
                  <span>{album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
