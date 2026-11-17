import React, { useState } from 'react';
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

const AlbumCard: React.FC<{
  album: AlbumItem;
  streamPort: number;
  onSelect: () => void;
  onPlay: () => void;
}> = ({ album, streamPort, onSelect, onPlay }) => {
  const [hasError, setHasError] = useState(false);
  const coverSrc = getCoverUrl(album.coverPath, streamPort);

  return (
    <div
      onClick={onSelect}
      className="group flex flex-col p-3.5 rounded-xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)] hover:border-white/20 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-xl"
    >
      {/* Cover Art Container */}
      <div className="relative aspect-square w-full rounded-lg bg-zinc-900 border border-white/10 mb-3 overflow-hidden shadow-md flex items-center justify-center">
        {coverSrc && !hasError ? (
          <img
            src={coverSrc}
            alt={album.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">
            <Disc3 className="w-12 h-12 stroke-1" />
          </div>
        )}

        {/* Floating Play Button on Hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          title="Play Album"
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-xl shadow-black/60 hover:scale-105 active:scale-95"
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </button>
      </div>

      {/* Album Metadata with clear, un-cramped line spacing */}
      <div className="flex flex-col truncate px-0.5">
        <span
          className="text-[14px] font-semibold text-white truncate group-hover:text-[var(--accent-color)] transition-colors leading-snug"
          title={album.name}
        >
          {album.name}
        </span>
        <span
          className="text-[12px] text-zinc-400 truncate mt-1 leading-snug"
          title={album.artist}
        >
          {album.artist}
        </span>
        <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400 mt-1 font-mono tabular-nums">
          {album.year ? <span>{album.year}</span> : null}
          {album.year ? <span>•</span> : null}
          <span>{album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}</span>
        </div>
      </div>
    </div>
  );
};

export const AlbumGrid: React.FC<AlbumGridProps> = ({
  albums,
  streamPort,
  onSelectAlbum,
  onPlayAlbum,
}) => {
  if (albums.length === 0) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center text-xs text-zinc-400 space-y-3">
        <Disc3 className="w-12 h-12 opacity-30 stroke-1 text-zinc-500" />
        <p className="text-sm font-medium text-zinc-300">No albums found in library</p>
        <p className="text-xs text-zinc-400 max-w-sm">Scan a music folder in the sidebar to populate your albums.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 select-none bg-[var(--bg-color)] animate-fadeIn">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {albums.map((album) => (
          <AlbumCard
            key={`${album.artist}_${album.name}`}
            album={album}
            streamPort={streamPort}
            onSelect={() => onSelectAlbum(album)}
            onPlay={() => onPlayAlbum(album)}
          />
        ))}
      </div>
    </div>
  );
};
