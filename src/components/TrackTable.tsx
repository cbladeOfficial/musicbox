import React, { useState, useMemo } from 'react';
import {
  Play,
  Heart,
  MoreVertical,
  Volume2,
  Clock,
  ArrowUpDown,
  ListPlus,
} from 'lucide-react';
import { TrackRecord, PlaylistRecord } from '../types/music';

interface TrackTableProps {
  tracks: TrackRecord[];
  currentTrackId?: number;
  isPlaying: boolean;
  onPlayTrack: (track: TrackRecord) => void;
  onToggleFavorite: (id: number) => void;
  onAddToQueue: (track: TrackRecord) => void;
  playlists: PlaylistRecord[];
  onAddToPlaylist: (playlistId: number, trackId: number) => void;
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
  onPlayTrack,
  onToggleFavorite,
  onAddToQueue,
  playlists,
  onAddToPlaylist,
}) => {
  const [sortField, setSortField] = useState<SortField>('artist');
  const [sortAsc, setSortAsc] = useState(true);
  const [menuTrackId, setMenuTrackId] = useState<number | null>(null);

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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* Table Header */}
      <div className="h-9 border-b border-[var(--border-color)] bg-[var(--surface-color)]/70 px-4 flex items-center text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
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
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]/40">
        {sortedTracks.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] italic">
            No tracks found. Click "Scan Music Folder" in the sidebar to add your local music library.
          </div>
        ) : (
          sortedTracks.map((track, idx) => {
            const isCurrent = currentTrackId === track.id;
            const isMenuOpen = menuTrackId === track.id;

            return (
              <div
                key={track.id}
                onDoubleClick={() => onPlayTrack(track)}
                className={`group flex items-center px-4 py-2 text-xs transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-[var(--surface-active)] text-[var(--accent-color)] font-medium'
                    : 'hover:bg-[var(--surface-hover)] text-[var(--text-main)]'
                }`}
              >
                {/* Track number / Play icon */}
                <div className="w-10 text-center text-[var(--text-muted)] flex-shrink-0 flex items-center justify-center">
                  {isCurrent ? (
                    <Volume2 className="w-3.5 h-3.5 text-[var(--accent-color)] animate-pulse" />
                  ) : (
                    <>
                      <span className="group-hover:hidden">{track.track_number || idx + 1}</span>
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="hidden group-hover:block text-[var(--text-main)] hover:text-[var(--accent-color)]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </>
                  )}
                </div>

                {/* Title + format */}
                <div className="flex-1 flex items-center space-x-2.5 truncate pr-3">
                  <div className="flex flex-col truncate">
                    <span className="truncate font-medium">{track.title}</span>
                    <span className="text-[10px] text-[var(--text-muted)] md:hidden truncate">
                      {track.artist}
                    </span>
                  </div>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--surface-color)] text-[var(--text-muted)] font-mono border border-[var(--border-color)] flex-shrink-0">
                    {track.format}
                  </span>
                </div>

                {/* Artist */}
                <div className="w-48 hidden md:block text-[var(--text-muted)] truncate pr-2">
                  {track.artist}
                </div>

                {/* Album */}
                <div className="w-48 hidden lg:block text-[var(--text-muted)] truncate pr-2">
                  {track.album}
                </div>

                {/* Duration */}
                <div className="w-16 text-right text-[var(--text-muted)] font-mono text-[11px] pr-4">
                  {formatDuration(track.duration)}
                </div>

                {/* Action buttons & Menu */}
                <div className="w-12 flex items-center justify-center space-x-1 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    className={`p-1 rounded hover:bg-[var(--surface-hover)] ${
                      track.is_favorite ? 'text-rose-500' : 'text-transparent group-hover:text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${track.is_favorite ? 'fill-rose-500' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuTrackId(isMenuOpen ? null : track.id);
                    }}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* Context dropdown menu */}
                  {isMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-8 w-44 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md shadow-xl py-1 z-30 text-xs"
                    >
                      <button
                        onClick={() => {
                          onAddToQueue(track);
                          setMenuTrackId(null);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-[var(--surface-hover)] text-left"
                      >
                        <ListPlus className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                        <span>Add to Queue</span>
                      </button>

                      {playlists.length > 0 && (
                        <div className="border-t border-[var(--border-color)] my-1 pt-1">
                          <div className="text-[10px] uppercase text-[var(--text-muted)] px-3 py-0.5">
                            Add to Playlist:
                          </div>
                          {playlists.map((pl) => (
                            <button
                              key={pl.id}
                              onClick={() => {
                                onAddToPlaylist(pl.id, track.id);
                                setMenuTrackId(null);
                              }}
                              className="w-full truncate px-4 py-1 hover:bg-[var(--surface-hover)] text-left text-[11px]"
                            >
                              + {pl.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
