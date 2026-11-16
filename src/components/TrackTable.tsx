import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Play,
  Heart,
  MoreVertical,
  Volume2,
  Clock,
  ArrowUp,
  ArrowDown,
  ListPlus,
  Disc3,
  Mic2,
  Check,
  Plus,
  Music2,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { TrackRecord, PlaylistRecord, TableDensity, TrackSortField } from '../types/music';
import { getCoverUrl } from '../utils/cover';
import { ArtistLinks } from './ArtistLinks';

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
  onEditTrackMetadata?: (track: TrackRecord) => void;
  sortField?: TrackSortField;
  sortAsc?: boolean;
  onSortChange?: (field: TrackSortField, asc: boolean) => void;
}

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
  onEditTrackMetadata,
  sortField: propSortField,
  sortAsc: propSortAsc,
  onSortChange,
}) => {
  const [internalField, setInternalField] = useState<TrackSortField>(() => {
    try {
      const saved = localStorage.getItem('musicbox_track_sort_field');
      if (saved) return saved as TrackSortField;
    } catch {}
    return 'title';
  });

  const [internalAsc, setInternalAsc] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('musicbox_track_sort_asc');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  const sortField = propSortField ?? internalField;
  const sortAsc = propSortAsc ?? internalAsc;

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

  const applySort = (field: TrackSortField, asc: boolean) => {
    setInternalField(field);
    setInternalAsc(asc);
    try {
      localStorage.setItem('musicbox_track_sort_field', field);
      localStorage.setItem('musicbox_track_sort_asc', String(asc));
    } catch {}
    if (onSortChange) {
      onSortChange(field, asc);
    }
  };

  const handleHeaderSort = (field: TrackSortField) => {
    if (sortField === field) {
      applySort(field, !sortAsc);
    } else {
      applySort(field, true);
    }
  };

  const handleDropdownSort = (compositeValue: string) => {
    const parts = compositeValue.split('_');
    const asc = parts[parts.length - 1] === 'asc';
    const field = parts.slice(0, parts.length - 1).join('_') as TrackSortField;
    applySort(field, asc);
  };

  const sortedTracks = useMemo(() => {
    const list = [...tracks];
    list.sort((a, b) => {
      const vA = a[sortField];
      const vB = b[sortField];

      if (vA === undefined || vA === null) return sortAsc ? 1 : -1;
      if (vB === undefined || vB === null) return sortAsc ? -1 : 1;

      if (typeof vA === 'string' && typeof vB === 'string') {
        const cmp = vA.localeCompare(vB, undefined, { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return sortAsc ? cmp : -cmp;
      } else {
        if (vA < vB) return sortAsc ? -1 : 1;
        if (vA > vB) return sortAsc ? 1 : -1;
      }

      // Secondary tie-breaker:
      if (sortField === 'title') {
        const artistCmp = (a.artist || '').localeCompare(b.artist || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (artistCmp !== 0) return artistCmp;
      } else {
        const titleCmp = (a.title || '').localeCompare(b.title || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (titleCmp !== 0) return titleCmp;
      }

      return (a.track_number || 0) - (b.track_number || 0);
    });
    return list;
  }, [tracks, sortField, sortAsc]);

  const rowPadding = density === 'compact' ? 'py-1.5' : 'py-2.5';
  const thumbnailSize = density === 'compact' ? 'w-7 h-7' : 'w-9 h-9';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-[var(--bg-color)] animate-fadeIn">
      {/* Table Toolbar / Controls */}
      <div className="h-11 px-4 border-b border-[var(--border-color)] bg-[var(--sidebar-color)]/50 flex items-center justify-between flex-shrink-0 text-xs">
        <div className="flex items-center space-x-2 text-zinc-400">
          <span className="font-semibold text-zinc-200">{sortedTracks.length}</span>
          <span>{sortedTracks.length === 1 ? 'track' : 'tracks'}</span>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="track-sort-dropdown" className="text-zinc-400 text-xs font-medium">
            Sort by:
          </label>
          <div className="relative">
            <select
              id="track-sort-dropdown"
              value={`${sortField}_${sortAsc ? 'asc' : 'desc'}`}
              onChange={(e) => handleDropdownSort(e.target.value)}
              aria-label="Sort tracks by"
              className="bg-[var(--surface-color)] text-zinc-200 text-xs font-medium rounded-md pl-3 pr-8 py-1.5 border border-[var(--border-color)] hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] cursor-pointer appearance-none transition-colors"
            >
              <option value="title_asc">Title (A-Z - Alphabetical)</option>
              <option value="title_desc">Title (Z-A)</option>
              <option value="artist_asc">Artist (A-Z)</option>
              <option value="artist_desc">Artist (Z-A)</option>
              <option value="album_asc">Album (A-Z)</option>
              <option value="album_desc">Album (Z-A)</option>
              <option value="duration_asc">Duration (Shortest first)</option>
              <option value="duration_desc">Duration (Longest first)</option>
              <option value="date_added_desc">Date Added (Newest first)</option>
              <option value="date_added_asc">Date Added (Oldest first)</option>
              <option value="track_number_asc">Track # (Ascending)</option>
              <option value="track_number_desc">Track # (Descending)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="h-9 border-b border-[var(--border-color)] bg-[var(--sidebar-color)] px-4 flex items-center text-xs font-medium text-zinc-400 sticky top-0 z-10 backdrop-blur-md">
        <div
          onClick={() => handleHeaderSort('track_number')}
          className="w-10 text-center font-mono cursor-pointer hover:text-white transition-colors flex items-center justify-center space-x-1"
          title="Sort by Track Number"
        >
          <span>#</span>
          {sortField === 'track_number' && (
            sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent-color)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent-color)]" />
          )}
        </div>
        <div
          onClick={() => handleHeaderSort('title')}
          className="flex-1 flex items-center space-x-1.5 cursor-pointer hover:text-white transition-colors"
          title="Sort by Title (Alphabetical)"
        >
          <span>Title</span>
          {sortField === 'title' && (
            sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[var(--accent-color)]" /> : <ArrowDown className="w-3.5 h-3.5 text-[var(--accent-color)]" />
          )}
        </div>
        <div
          onClick={() => handleHeaderSort('artist')}
          className="w-48 hidden md:flex items-center space-x-1.5 cursor-pointer hover:text-white transition-colors"
          title="Sort by Artist"
        >
          <span>Artist</span>
          {sortField === 'artist' && (
            sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[var(--accent-color)]" /> : <ArrowDown className="w-3.5 h-3.5 text-[var(--accent-color)]" />
          )}
        </div>
        <div
          onClick={() => handleHeaderSort('album')}
          className="w-48 hidden lg:flex items-center space-x-1.5 cursor-pointer hover:text-white transition-colors"
          title="Sort by Album"
        >
          <span>Album</span>
          {sortField === 'album' && (
            sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[var(--accent-color)]" /> : <ArrowDown className="w-3.5 h-3.5 text-[var(--accent-color)]" />
          )}
        </div>
        <div
          onClick={() => handleHeaderSort('duration')}
          className="w-16 flex items-center justify-end space-x-1 cursor-pointer hover:text-white pr-4 transition-colors"
          title="Sort by Duration"
        >
          <Clock className="w-3.5 h-3.5" />
          {sortField === 'duration' && (
            sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[var(--accent-color)]" /> : <ArrowDown className="w-3.5 h-3.5 text-[var(--accent-color)]" />
          )}
        </div>
        <div className="w-14 text-center"></div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {sortedTracks.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center space-y-3">
            <Music2 className="w-16 h-16 opacity-30 stroke-1 text-zinc-400 mb-2" />
            <p className="text-lg font-medium text-zinc-200">No tracks in this view</p>
            <p className="text-sm text-zinc-400 max-w-sm">Scan a music folder in the sidebar to index and stream your library.</p>
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
                className={`group flex items-center px-2.5 ${rowPadding} text-[13px] rounded-lg transition-colors cursor-pointer select-none outline-none focus:outline-none ${
                  isCurrent
                    ? 'bg-[var(--accent-color)]/15 text-white font-medium shadow-sm'
                    : 'hover:bg-white/[0.06] text-zinc-200'
                }`}
              >
                {/* Track number / Animated play indicator */}
                <div className="w-10 text-center text-zinc-400 flex-shrink-0 flex items-center justify-center font-mono text-[12px] tabular-nums">
                  {isCurrent ? (
                    <Volume2 className="w-4 h-4 text-[var(--accent-color)]" />
                  ) : (
                    <>
                      <span className="group-hover:hidden">
                        {track.track_number || idx + 1}
                      </span>
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="hidden group-hover:block text-white hover:text-[var(--accent-color)] transition-colors duration-150"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    </>
                  )}
                </div>

                {/* Title + Thumbnail + Format badge */}
                <div className="flex-1 flex items-center space-x-3 truncate pr-3">
                  <div className={`${thumbnailSize} rounded-md overflow-hidden bg-zinc-900 border border-white/10 flex-shrink-0 flex items-center justify-center shadow-sm`}>
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
                      <Disc3 className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>

                  <div className="flex flex-col truncate min-w-0 pr-1">
                    <span className={`truncate text-[14px] ${isCurrent ? 'text-[var(--accent-color)] font-medium' : 'text-zinc-100 font-medium'}`}>
                      {track.title}
                    </span>
                    <span className="text-xs text-zinc-400 md:hidden truncate" title={track.artist}>
                      <ArtistLinks artists={track.artist} onSelectArtist={onViewArtist} />
                    </span>
                  </div>

                  <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-zinc-300 font-mono border border-white/5 flex-shrink-0 font-normal">
                    {track.format}
                  </span>
                </div>

                {/* Artist */}
                <div
                  title={track.artist}
                  className="w-48 hidden md:block text-zinc-300 truncate pr-2 text-[13px] font-normal transition-colors"
                >
                  <ArtistLinks artists={track.artist} onSelectArtist={onViewArtist} />
                </div>

                {/* Album */}
                <div
                  onClick={(e) => {
                    if (onViewAlbum) {
                      e.stopPropagation();
                      onViewAlbum(track.album, track.artist);
                    }
                  }}
                  className="w-48 hidden lg:block text-zinc-400 truncate pr-2 hover:underline hover:text-white text-[13px] transition-colors"
                >
                  {track.album}
                </div>

                {/* Duration */}
                <div className="w-16 text-right text-zinc-400 font-mono text-[13px] tabular-nums pr-4">
                  {formatDuration(track.duration)}
                </div>

                {/* Favorite & More button */}
                <div className="w-14 flex items-center justify-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
                      track.is_favorite
                        ? 'text-rose-500'
                        : 'opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${track.is_favorite ? 'fill-rose-500 stroke-rose-500' : ''}`} />
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
                    className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
          className="fixed w-56 bg-[#13151b] border border-white/15 rounded-lg shadow-2xl py-1.5 z-50 text-[12px] select-none text-zinc-200 backdrop-blur-xl"
        >
          <button
            onClick={() => {
              onPlayTrack(contextMenu.track);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-white/10 hover:text-white text-left font-medium transition-colors"
          >
            <Play className="w-4 h-4 text-[var(--accent-color)]" />
            <span>Play Now</span>
          </button>

          <button
            onClick={() => {
              onAddToQueue(contextMenu.track);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-white/10 hover:text-white text-left font-medium transition-colors"
          >
            <ListPlus className="w-4 h-4 text-zinc-400" />
            <span>Add to Queue</span>
          </button>

          <button
            onClick={() => {
              onToggleFavorite(contextMenu.track.id);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-white/10 hover:text-white text-left font-medium transition-colors"
          >
            <Heart className={`w-4 h-4 ${contextMenu.track.is_favorite ? 'text-rose-500 fill-rose-500' : 'text-zinc-400'}`} />
            <span>{contextMenu.track.is_favorite ? 'Remove Favorite' : 'Favorite'}</span>
          </button>

          {onViewAlbum && (
            <button
              onClick={() => {
                onViewAlbum(contextMenu.track.album, contextMenu.track.artist);
                setContextMenu(null);
              }}
              className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-white/10 hover:text-white text-left font-medium transition-colors"
            >
              <Disc3 className="w-4 h-4 text-zinc-400" />
              <span>Go to Album</span>
            </button>
          )}

          {onViewArtist && (() => {
            const artists = (contextMenu.track.artist || 'Unknown Artist')
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean);
            const list = artists.length > 0 ? artists : ['Unknown Artist'];
            return list.map((art) => (
              <button
                key={art}
                onClick={() => {
                  onViewArtist(art);
                  setContextMenu(null);
                }}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-white/10 hover:text-white text-left font-medium transition-colors"
              >
                <Mic2 className="w-4 h-4 text-zinc-400" />
                <span className="truncate">Go to Artist: {art}</span>
              </button>
            ));
          })()}

          {onEditTrackMetadata && (
            <button
              onClick={() => {
                onEditTrackMetadata(contextMenu.track);
                setContextMenu(null);
              }}
              className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-white/10 hover:text-white text-left font-medium transition-colors"
            >
              <Tag className="w-4 h-4 text-zinc-400" />
              <span>Edit Track Tags</span>
            </button>
          )}

          {/* Submenu: Add to Playlist */}
          {playlists.length > 0 && (
            <div className="border-t border-white/10 my-1 pt-1">
              <div className="text-[10px] font-medium text-zinc-500 px-3.5 py-1">
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
                    className="w-full flex items-center space-x-2 px-3.5 py-1.5 hover:bg-white/10 hover:text-white text-left text-[11px] truncate"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
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
