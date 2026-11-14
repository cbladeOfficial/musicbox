import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Play,
  Heart,
  MoreVertical,
  Volume2,
  Clock,
  ArrowUpDown,
  ListPlus,
  Disc3,
  Mic2,
  Check,
  Plus,
  Music2,
} from 'lucide-react';
import { TrackRecord, PlaylistRecord, TableDensity } from '../types/music';
import { getCoverUrl } from '../utils/cover';

interface TrackTableProps {
  tracks: TrackRecord[];
  currentTrackId?: number;
  isPlaying: boolean;
  density: TableDensity;
  streamPort: number;
  onPlayTrack: (track: TrackRecord) => void;
  onToggleFavorite: (id: number) => void;
  onAddToQueue: (track: TrackRecord) => void;
  playlists: PlaylistRecord[];
  onAddToPlaylist: (playlistId: number, trackId: number) => void;
  onViewAlbum?: (albumName: string, artistName: string) => void;
  onViewArtist?: (artistName: string) => void;
}

type SortField = 'title' | 'artist' | 'album' | 'duration' | 'track_number';

function formatDuration(sec: number): string {
  if (!sec || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  density,
  streamPort,
  onPlayTrack,
  onToggleFavorite,
  onAddToQueue,
  playlists,
  onAddToPlaylist,
  onViewAlbum,
  onViewArtist,
}) => {
  const [sortField, setSortField] = useState<SortField>('artist');
  const [sortAsc, setSortAsc] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    track: TrackRecord;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedTracks = useMemo(() => {
    const list = [...tracks];
    list.sort((a, b) => {
      let vA = (a[sortField] ?? '') as string | number;
      let vB = (b[sortField] ?? '') as string | number;

      if (typeof vA === 'string') {
        vA = vA.toLowerCase();
        vB = (vB as string).toLowerCase();
      }

      if (vA < vB) return sortAsc ? -1 : 1;
      if (vA > vB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [tracks, sortField, sortAsc]);

  const rowPadding = density === 'compact' ? 'py-1' : 'py-2';
  const thumbnailSize = density === 'compact' ? 'w-6 h-6' : 'w-8 h-8';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-[var(--bg-color)]">
      {/* Table Header */}
      <div className="h-9 border-b border-[var(--border-color)] bg-[var(--surface-color)]/70 px-4 flex items-center text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
        <div className="w-10 text-center">#</div>
        <div
          onClick={() => handleSort('title')}
          className="flex-1 flex items-center space-x-1 cursor-pointer hover:text-[var(--text-main)]"
        >
          <span>Title</span>
          {sortField === 'title' && <ArrowUpDown className="w-3 h-3 text-[var(--accent-color)]" />}
        </div>
        <div
          onClick={() => handleSort('artist')}
          className="w-48 hidden md:flex items-center space-x-1 cursor-pointer hover:text-[var(--text-main)]"
        >
          <span>Artist</span>
          {sortField === 'artist' && <ArrowUpDown className="w-3 h-3 text-[var(--accent-color)]" />}
        </div>
        <div
          onClick={() => handleSort('album')}
          className="w-48 hidden lg:flex items-center space-x-1 cursor-pointer hover:text-[var(--text-main)]"
        >
          <span>Album</span>
          {sortField === 'album' && <ArrowUpDown className="w-3 h-3 text-[var(--accent-color)]" />}
        </div>
        <div
          onClick={() => handleSort('duration')}
          className="w-16 flex items-center justify-end space-x-1 cursor-pointer hover:text-[var(--text-main)] pr-4"
        >
          <Clock className="w-3 h-3" />
        </div>
        <div className="w-12 text-center">Actions</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]/30">
        {sortedTracks.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] space-y-3">
            <Music2 className="w-8 h-8 opacity-30 stroke-1" />
            <p>No tracks in this view. Scan a music folder to index your library.</p>
          </div>
        ) : (
          sortedTracks.map((track, idx) => {
            const isCurrent = currentTrackId === track.id;
            const coverSrc = getCoverUrl(track.cover_path, streamPort);

            return (
              <div
                key={track.id}
                onDoubleClick={() => onPlayTrack(track)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: Math.min(e.clientX, window.innerWidth - 220),
                    y: Math.min(e.clientY, window.innerHeight - 260),
                    track,
                  });
                }}
                className={`group flex items-center px-4 ${rowPadding} text-xs transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-[var(--surface-active)] text-[var(--accent-color)] font-medium'
                    : 'hover:bg-[var(--surface-hover)] text-[var(--text-main)]'
                }`}
              >
                {/* Track number / Animated play indicator */}
                <div className="w-10 text-center text-[var(--text-muted)] flex-shrink-0 flex items-center justify-center">
                  {isCurrent ? (
                    <Volume2 className={`w-3.5 h-3.5 text-[var(--accent-color)] ${isPlaying ? 'animate-pulse' : ''}`} />
                  ) : (
                    <>
                      <span className="group-hover:hidden font-mono text-[11px] tabular-nums">
                        {track.track_number || idx + 1}
                      </span>
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="hidden group-hover:block text-[var(--text-main)] hover:text-[var(--accent-color)]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </>
                  )}
                </div>

                {/* Title + Thumbnail + Format badge */}
                <div className="flex-1 flex items-center space-x-2.5 truncate pr-3">
                  <div className={`${thumbnailSize} rounded overflow-hidden bg-[var(--surface-active)] border border-[var(--border-color)] flex-shrink-0 flex items-center justify-center`}>
                    {coverSrc ? (
                      <img
                        src={coverSrc}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Disc3 className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-50" />
                    )}
                  </div>

                  <div className="flex flex-col truncate min-w-0">
                    <span className="truncate font-medium">{track.title}</span>
                    <span className="text-[10px] text-[var(--text-muted)] md:hidden truncate">
                      {track.artist}
                    </span>
                  </div>

                  <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--surface-color)] text-[var(--text-muted)] font-mono border border-[var(--border-color)] flex-shrink-0 tracking-wider">
                    {track.format}
                  </span>
                </div>

                {/* Artist */}
                <div
                  onClick={(e) => {
                    if (onViewArtist) {
                      e.stopPropagation();
                      onViewArtist(track.artist);
                    }
                  }}
                  className="w-48 hidden md:block text-[var(--text-muted)] truncate pr-2 hover:underline hover:text-[var(--text-main)]"
                >
                  {track.artist}
                </div>

                {/* Album */}
                <div
                  onClick={(e) => {
                    if (onViewAlbum) {
                      e.stopPropagation();
                      onViewAlbum(track.album, track.artist);
                    }
                  }}
                  className="w-48 hidden lg:block text-[var(--text-muted)] truncate pr-2 hover:underline hover:text-[var(--text-main)]"
                >
                  {track.album}
                </div>

                {/* Duration */}
                <div className="w-16 text-right text-[var(--text-muted)] font-mono text-[11px] tabular-nums pr-4">
                  {formatDuration(track.duration)}
                </div>

                {/* Favorite & More button */}
                <div className="w-12 flex items-center justify-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    className={`p-1 rounded hover:bg-[var(--surface-hover)] ${
                      track.is_favorite
                        ? 'text-rose-500'
                        : 'text-transparent group-hover:text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${track.is_favorite ? 'fill-rose-500' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setContextMenu({
                        x: Math.min(rect.left - 180, window.innerWidth - 220),
                        y: Math.min(rect.bottom + 5, window.innerHeight - 260),
                        track,
                      });
                    }}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Feishin Desktop Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed w-52 bg-[var(--surface-color)]/95 backdrop-blur-md border border-[var(--border-color)] rounded-lg shadow-2xl py-1 z-50 text-xs select-none"
        >
          <button
            onClick={() => {
              onPlayTrack(contextMenu.track);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 hover:bg-[var(--surface-hover)] text-left"
          >
            <Play className="w-3.5 h-3.5 text-[var(--accent-color)]" />
            <span>Play Now</span>
          </button>

          <button
            onClick={() => {
              onAddToQueue(contextMenu.track);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 hover:bg-[var(--surface-hover)] text-left"
          >
            <ListPlus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Add to Queue</span>
          </button>

          <button
            onClick={() => {
              onToggleFavorite(contextMenu.track.id);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 hover:bg-[var(--surface-hover)] text-left"
          >
            <Heart className={`w-3.5 h-3.5 ${contextMenu.track.is_favorite ? 'text-rose-500 fill-rose-500' : 'text-[var(--text-muted)]'}`} />
            <span>{contextMenu.track.is_favorite ? 'Remove Favorite' : 'Favorite'}</span>
          </button>

          {onViewAlbum && (
            <button
              onClick={() => {
                onViewAlbum(contextMenu.track.album, contextMenu.track.artist);
                setContextMenu(null);
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-1.5 hover:bg-[var(--surface-hover)] text-left"
            >
              <Disc3 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Go to Album</span>
            </button>
          )}

          {onViewArtist && (
            <button
              onClick={() => {
                onViewArtist(contextMenu.track.artist);
                setContextMenu(null);
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-1.5 hover:bg-[var(--surface-hover)] text-left"
            >
              <Mic2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Go to Artist</span>
            </button>
          )}

          {/* Submenu: Add to Playlist */}
          {playlists.length > 0 && (
            <div className="border-t border-[var(--border-color)] my-1 pt-1">
              <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] px-3 py-1">
                Add to Playlist
              </div>
              <div className="max-h-28 overflow-y-auto">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      onAddToPlaylist(pl.id, contextMenu.track.id);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-1 hover:bg-[var(--surface-hover)] text-left text-[11px] truncate"
                  >
                    <Plus className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="truncate">{pl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
