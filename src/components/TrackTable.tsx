import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Play,
  Heart,
  MoreVertical,
  Volume2,
  Clock,
  ArrowUp,
  ArrowDown,
  Disc3,
  Music2,
  ChevronDown,
} from 'lucide-react';
import { TrackRecord, PlaylistRecord, TableDensity, TrackSortField } from '../types/music';
import { getCoverUrl } from '../utils/cover';
import { MetadataService } from '../services/metadataService';
import { ArtistLinks } from './ArtistLinks';
import { TrackContextMenu } from './TrackContextMenu';

interface TrackTableProps {
  tracks: TrackRecord[];
  currentTrackId?: number;
  isPlaying: boolean;
  density: TableDensity;
  streamPort: number;
  onPlayTrack: (track: TrackRecord) => void;
  onPlayNext?: (track: TrackRecord) => void;
  onToggleFavorite: (id: number) => void;
  onAddToQueue: (track: TrackRecord) => void;
  playlists: PlaylistRecord[];
  onAddToPlaylist: (playlistId: number, trackId: number) => void;
  onCreatePlaylist?: (name: string, trackId?: number) => void;
  onViewAlbum?: (albumName: string, artistName?: string) => void;
  onViewArtist?: (artistName: string) => void;
  onEditTrackMetadata?: (track: TrackRecord) => void;
  onToggleInfo?: (track?: TrackRecord) => void;
  sortField?: TrackSortField;
  sortAsc?: boolean;
  onSortChange?: (field: TrackSortField, asc: boolean) => void;
  resolvedCoverArt?: string;
  onStartRadio?: (track: TrackRecord) => void;
  onShowToast?: (message: string) => void;
}

function formatDuration(sec: number): string {
  if (!sec || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const TrackThumbnail: React.FC<{
  src?: string;
  fallbackSrc?: string;
  size: string;
  alt?: string;
}> = ({ src, fallbackSrc, size, alt = '' }) => {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setHasError(false);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      className={`${size} rounded-md overflow-hidden bg-zinc-900 border border-white/10 flex-shrink-0 flex items-center justify-center shadow-sm`}
    >
      {currentSrc && !hasError ? (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={handleError}
        />
      ) : (
        <Disc3 className="w-4 h-4 text-zinc-500" />
      )}
    </div>
  );
};

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  density,
  streamPort,
  onPlayTrack,
  onPlayNext,
  onToggleFavorite,
  onAddToQueue,
  playlists,
  onAddToPlaylist,
  onCreatePlaylist,
  onViewAlbum,
  onViewArtist,
  onEditTrackMetadata,
  onToggleInfo,
  sortField: propSortField,
  sortAsc: propSortAsc,
  onSortChange,
  resolvedCoverArt,
  onStartRadio,
  onShowToast,
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

  const handleHeaderSort = (field: TrackSortField) => {
    let nextAsc = true;
    if (sortField === field) {
      nextAsc = !sortAsc;
    }
    setInternalField(field);
    setInternalAsc(nextAsc);
    try {
      localStorage.setItem('musicbox_track_sort_field', field);
      localStorage.setItem('musicbox_track_sort_asc', nextAsc.toString());
    } catch {}
    if (onSortChange) {
      onSortChange(field, nextAsc);
    }
  };

  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'artist':
          comparison = (a.artist || '').localeCompare(b.artist || '');
          break;
        case 'album':
          comparison = (a.album || '').localeCompare(b.album || '');
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
        case 'track_number':
          comparison = (a.track_number || 0) - (b.track_number || 0);
          break;
        case 'date_added': {
          const aDate = typeof a.date_added === 'number' ? a.date_added : (Number(a.date_added) || 0);
          const bDate = typeof b.date_added === 'number' ? b.date_added : (Number(b.date_added) || 0);
          comparison = aDate - bDate;
          break;
        }
        default:
          comparison = 0;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [tracks, sortField, sortAsc]);

  const rowPadding = density === 'compact' ? 'py-1.5' : 'py-2.5';
  const thumbnailSize = density === 'compact' ? 'w-7 h-7' : 'w-8 h-8';

  const renderSortIndicator = (field: TrackSortField) => {
    if (sortField !== field) return null;
    return sortAsc ? (
      <ArrowUp className="w-3.5 h-3.5 inline ml-1 text-[var(--accent-color)]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 inline ml-1 text-[var(--accent-color)]" />
    );
  };

  return (
    <div className="flex flex-col h-full w-full select-none text-zinc-300">
      {/* Table Header Bar */}
      <div className="flex items-center px-2.5 py-2 border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-zinc-400 bg-[var(--surface-color)]/60 backdrop-blur-sm sticky top-0 z-10">
        <div
          onClick={() => handleHeaderSort('track_number')}
          className="w-10 text-center cursor-pointer hover:text-white transition-colors"
          title="Sort by Track Number"
        >
          # {renderSortIndicator('track_number')}
        </div>

        <div
          onClick={() => handleHeaderSort('title')}
          className="flex-1 cursor-pointer hover:text-white transition-colors pl-3 flex items-center"
          title="Sort by Title"
        >
          <span>Title</span>
          {renderSortIndicator('title')}
        </div>

        <div
          onClick={() => handleHeaderSort('artist')}
          className="w-48 hidden md:flex items-center cursor-pointer hover:text-white transition-colors"
          title="Sort by Artist"
        >
          <span>Artist</span>
          {renderSortIndicator('artist')}
        </div>

        <div
          onClick={() => handleHeaderSort('album')}
          className="w-44 hidden lg:flex items-center cursor-pointer hover:text-white transition-colors"
          title="Sort by Album"
        >
          <span>Album</span>
          {renderSortIndicator('album')}
        </div>

        <div
          onClick={() => handleHeaderSort('duration')}
          className="w-16 text-right pr-4 cursor-pointer hover:text-white transition-colors flex items-center justify-end"
          title="Sort by Duration"
        >
          <Clock className="w-3.5 h-3.5" />
          {renderSortIndicator('duration')}
        </div>

        <div className="w-16 text-right pr-2">
          <span className="sr-only">Actions</span>
        </div>
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
            const cachedCover = MetadataService.getCachedCoverArt(track.artist, track.album, track.title);
            const coverSrc = isCurrent && resolvedCoverArt
              ? resolvedCoverArt
              : (cachedCover || getCoverUrl(track.cover_path, streamPort, cachedCover || undefined));
            const fallbackSrc = cachedCover || undefined;

            return (
              <div
                key={track.id}
                onDoubleClick={() => onPlayTrack(track)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: Math.min(e.clientX, window.innerWidth - 240),
                    y: Math.min(e.clientY, window.innerHeight - 400),
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
                    <Volume2 className="w-4 h-4 text-[var(--accent-color)] animate-pulse" />
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
                  <TrackThumbnail
                    src={coverSrc}
                    fallbackSrc={fallbackSrc}
                    size={thumbnailSize}
                    alt={track.album}
                  />

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
                  title={track.album}
                  className="w-44 hidden lg:block text-zinc-400 truncate pr-2 text-[13px] font-normal hover:text-blue-400 hover:underline transition-colors"
                >
                  {track.album || 'Unknown Album'}
                </div>

                {/* Duration */}
                <div className="w-16 text-right pr-4 font-mono text-[12px] tabular-nums text-zinc-400 flex-shrink-0">
                  {formatDuration(track.duration)}
                </div>

                {/* Quick Hover Actions: Favorite + Three Dots Menu */}
                <div className="w-16 flex items-center justify-end space-x-1 pr-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    title={track.is_favorite ? 'Remove Favorite' : 'Mark Favorite'}
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
                        x: Math.min(rect.left - 180, window.innerWidth - 240),
                        y: Math.min(rect.bottom + 5, window.innerHeight - 400),
                        track,
                      });
                    }}
                    title="Track actions"
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

      {/* Full Feishin Desktop Context Menu Matching Image 6 */}
      {contextMenu && (
        <TrackContextMenu
          track={contextMenu.track}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onPlayTrack={onPlayTrack}
          onPlayNext={onPlayNext}
          onAddToQueue={onAddToQueue}
          onToggleFavorite={onToggleFavorite}
          playlists={playlists}
          onAddToPlaylist={onAddToPlaylist}
          onCreatePlaylist={onCreatePlaylist}
          onViewAlbum={onViewAlbum}
          onViewArtist={onViewArtist}
          onEditTrackMetadata={onEditTrackMetadata}
          onToggleInfo={onToggleInfo}
          onStartRadio={onStartRadio}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
