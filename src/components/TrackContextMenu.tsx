import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Radio,
  ListPlus,
  Heart,
  Star,
  Download,
  Share2,
  ExternalLink,
  Folder,
  Edit3,
  Info,
  ChevronRight,
  Plus,
  ListMusic,
  Check,
  Disc3,
  Mic2,
} from 'lucide-react';
import { TrackRecord, PlaylistRecord } from '../types/music';
import { TauriBridge } from '../services/tauriBridge';

export interface TrackContextMenuProps {
  track: TrackRecord;
  x?: number;
  y?: number;
  anchorRect?: DOMRect | null;
  onClose: () => void;
  onPlayTrack: (track: TrackRecord) => void;
  onPlayNext?: (track: TrackRecord) => void;
  onAddToQueue: (track: TrackRecord) => void;
  onToggleFavorite: (id: number) => void;
  playlists: PlaylistRecord[];
  onAddToPlaylist: (playlistId: number, trackId: number) => void;
  onCreatePlaylist?: (name: string, trackId?: number) => void;
  onViewAlbum?: (albumName: string, artistName?: string) => void;
  onViewArtist?: (artistName: string) => void;
  onEditTrackMetadata?: (track: TrackRecord) => void;
  onToggleInfo?: (track?: TrackRecord) => void;
  onSetRating?: (trackId: number, rating: number) => void;
  onStartRadio?: (track: TrackRecord) => void;
  onShowToast?: (message: string) => void;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  track,
  x,
  y,
  anchorRect,
  onClose,
  onPlayTrack,
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  playlists,
  onAddToPlaylist,
  onCreatePlaylist,
  onViewAlbum,
  onViewArtist,
  onEditTrackMetadata,
  onToggleInfo,
  onSetRating,
  onStartRadio,
  onShowToast,
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [currentRating, setCurrentRating] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`musicbox_rating_${track.id}`);
      if (saved) return parseInt(saved, 10) || 0;
    } catch {}
    return track.is_favorite ? 5 : 0;
  });

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Compute positioning
  let menuStyle: React.CSSProperties = {};
  if (anchorRect) {
    // Open upwards from bottom player bar
    const menuWidth = 230;
    const menuHeight = 410;
    const left = Math.max(12, Math.min(anchorRect.left, window.innerWidth - menuWidth - 12));
    const bottom = window.innerHeight - anchorRect.top + 8;
    menuStyle = {
      position: 'fixed',
      left: `${left}px`,
      bottom: `${bottom}px`,
      maxHeight: `${window.innerHeight - 90}px`,
    };
  } else if (x !== undefined && y !== undefined) {
    const menuWidth = 230;
    const menuHeight = 410;
    const posX = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 10));
    const posY = Math.max(10, Math.min(y, window.innerHeight - menuHeight - 10));
    menuStyle = {
      position: 'fixed',
      left: `${posX}px`,
      top: `${posY}px`,
    };
  }

  const artists = (track.artist || 'Unknown Artist')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);

  const handleRatingClick = (stars: number) => {
    const newRating = currentRating === stars ? 0 : stars;
    setCurrentRating(newRating);
    localStorage.setItem(`musicbox_rating_${track.id}`, newRating.toString());
    if (onSetRating) {
      onSetRating(track.id, newRating);
    }
    if (newRating >= 4 && !track.is_favorite) {
      onToggleFavorite(track.id);
    } else if (newRating === 0 && track.is_favorite) {
      onToggleFavorite(track.id);
    }
    if (onShowToast) {
      onShowToast(newRating > 0 ? `Rated ${newRating} star${newRating > 1 ? 's' : ''}` : 'Rating cleared');
    }
    onClose();
  };

  const handleShare = async () => {
    const shareText = `${track.title} - ${track.artist}`;
    try {
      await navigator.clipboard.writeText(shareText);
      if (onShowToast) onShowToast('Track details copied to clipboard');
    } catch {
      if (onShowToast) onShowToast('Could not copy to clipboard');
    }
    onClose();
  };

  const handleDownload = () => {
    if (onShowToast) {
      onShowToast('File is already stored locally on your device');
    }
    onClose();
  };

  const handleShowInFileManager = async () => {
    try {
      await TauriBridge.showInFileManager(track.path);
      if (onShowToast) onShowToast('Opening track in File Explorer...');
    } catch (e) {
      if (onShowToast) onShowToast('Failed to reveal file in explorer');
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="z-50 w-[230px] bg-[#121316] text-[#e1e3e8] border border-white/10 rounded-xl shadow-2xl py-1.5 text-[13.5px] select-none backdrop-blur-md animate-fadeIn"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. Play > */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('play')}
        onMouseLeave={() => setActiveSubmenu((cur) => (cur === 'play' ? null : cur))}
      >
        <button
          className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
          onClick={() => {
            onPlayTrack(track);
            onClose();
          }}
        >
          <div className="flex items-center space-x-2.5">
            <Play className="w-4 h-4 text-zinc-300 fill-current" />
            <span className="font-normal">Play</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </button>

        {/* Play Submenu */}
        {activeSubmenu === 'play' && (
          <div className="absolute left-full top-0 ml-1 w-48 bg-[#121316] border border-white/10 rounded-xl shadow-2xl py-1.5 text-[12.5px] z-50">
            <button
              onClick={() => {
                onPlayTrack(track);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/10 hover:text-white text-left transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[var(--accent-color)]" />
              <span>Play now</span>
            </button>
            {onPlayNext && (
              <button
                onClick={() => {
                  onPlayNext(track);
                  if (onShowToast) onShowToast('Playing next');
                  onClose();
                }}
                className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/10 hover:text-white text-left transition-colors"
              >
                <ListMusic className="w-3.5 h-3.5 text-zinc-400" />
                <span>Play next</span>
              </button>
            )}
            <button
              onClick={() => {
                onAddToQueue(track);
                if (onShowToast) onShowToast('Added to queue');
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/10 hover:text-white text-left transition-colors"
            >
              <ListPlus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Add to queue</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Track radio > */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('radio')}
        onMouseLeave={() => setActiveSubmenu((cur) => (cur === 'radio' ? null : cur))}
      >
        <button
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
          onClick={() => {
            if (onStartRadio) {
              onStartRadio(track);
            } else if (onShowToast) {
              onShowToast(`Track radio started for ${track.title}`);
            }
            onClose();
          }}
        >
          <div className="flex items-center space-x-2.5">
            <Radio className="w-4 h-4 text-zinc-300" />
            <span className="font-normal">Track radio</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </button>

        {activeSubmenu === 'radio' && (
          <div className="absolute left-full top-0 ml-1 w-44 bg-[#121316] border border-white/10 rounded-lg shadow-2xl py-1 text-[12px] z-50">
            <button
              onClick={() => {
                if (onStartRadio) onStartRadio(track);
                else if (onShowToast) onShowToast(`Track radio started for ${track.title}`);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/10 hover:text-white text-left transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>Start Track Radio</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Add to Playlist > */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('playlist')}
        onMouseLeave={() => setActiveSubmenu((cur) => (cur === 'playlist' ? null : cur))}
      >
        <button
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
          onClick={() => setActiveSubmenu((cur) => (cur === 'playlist' ? null : 'playlist'))}
        >
          <div className="flex items-center space-x-2.5">
            <ListPlus className="w-4 h-4 text-zinc-300" />
            <span className="font-normal">Add to Playlist</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </button>

        {activeSubmenu === 'playlist' && (
          <div className="absolute left-full top-0 ml-1 w-48 bg-[#121316] border border-white/10 rounded-lg shadow-2xl py-1 text-[12px] z-50 max-h-60 overflow-y-auto">
            {onCreatePlaylist && (
              <button
                onClick={() => {
                  const name = prompt('Enter new playlist name:');
                  if (name && name.trim()) {
                    onCreatePlaylist(name.trim(), track.id);
                  }
                  onClose();
                }}
                className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/10 hover:text-white text-left transition-colors text-blue-400 border-b border-white/10 mb-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="font-medium">New Playlist...</span>
              </button>
            )}
            {playlists.length === 0 ? (
              <div className="px-3 py-2 text-zinc-500 text-[11px] text-center">No playlists yet</div>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => {
                    onAddToPlaylist(pl.id, track.id);
                    if (onShowToast) onShowToast(`Added to ${pl.name}`);
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/10 hover:text-white text-left transition-colors truncate"
                >
                  <ListPlus className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                  <span className="truncate">{pl.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. Favorite > */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('favorite')}
        onMouseLeave={() => setActiveSubmenu((cur) => (cur === 'favorite' ? null : cur))}
      >
        <button
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
          onClick={() => {
            onToggleFavorite(track.id);
            if (onShowToast) onShowToast(track.is_favorite ? 'Removed from favorites' : 'Added to favorites');
            onClose();
          }}
        >
          <div className="flex items-center space-x-2.5">
            <Heart
              className={`w-4 h-4 ${track.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-zinc-300'}`}
            />
            <span className="font-normal">{track.is_favorite ? 'Favorited' : 'Favorite'}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </button>

        {activeSubmenu === 'favorite' && (
          <div className="absolute left-full top-0 ml-1 w-44 bg-[#121316] border border-white/10 rounded-lg shadow-2xl py-1 text-[12px] z-50">
            <button
              onClick={() => {
                onToggleFavorite(track.id);
                if (onShowToast) onShowToast(track.is_favorite ? 'Removed from favorites' : 'Added to favorites');
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/10 hover:text-white text-left transition-colors"
            >
              <Heart className={`w-3.5 h-3.5 ${track.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'}`} />
              <span>{track.is_favorite ? 'Remove Favorite' : 'Mark as Favorite'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Set rating > */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('rating')}
        onMouseLeave={() => setActiveSubmenu((cur) => (cur === 'rating' ? null : cur))}
      >
        <button
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
          onClick={() => setActiveSubmenu((cur) => (cur === 'rating' ? null : 'rating'))}
        >
          <div className="flex items-center space-x-2.5">
            <Star
              className={`w-4 h-4 ${currentRating > 0 ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'}`}
            />
            <span className="font-normal">Set rating</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </button>

        {activeSubmenu === 'rating' && (
          <div className="absolute left-full top-0 ml-1 w-44 bg-[#121316] border border-white/10 rounded-lg shadow-2xl py-1 text-[12px] z-50">
            {[5, 4, 3, 2, 1].map((stars) => (
              <button
                key={stars}
                onClick={() => handleRatingClick(stars)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/10 hover:text-white text-left transition-colors"
              >
                <div className="flex items-center space-x-1.5">
                  <div className="flex items-center space-x-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${s <= stars ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`}
                      />
                    ))}
                  </div>
                  <span className="text-zinc-400 text-[11px]">{stars}</span>
                </div>
                {currentRating === stars && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            ))}
            <div className="border-t border-white/10 my-1" />
            <button
              onClick={() => handleRatingClick(0)}
              className="w-full px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-white/10 text-left text-[11px] transition-colors"
            >
              Clear rating
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="my-1 border-t border-white/10" />

      {/* 6. Download */}
      <button
        onClick={handleDownload}
        className="w-full px-3 py-2 flex items-center space-x-2.5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
      >
        <Download className="w-4 h-4 text-zinc-300" />
        <span className="font-normal">Download</span>
      </button>

      {/* 7. Share item */}
      <button
        onClick={handleShare}
        className="w-full px-3 py-2 flex items-center space-x-2.5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
      >
        <Share2 className="w-4 h-4 text-zinc-300" />
        <span className="font-normal">Share item</span>
      </button>

      {/* Divider */}
      <div className="my-1 border-t border-white/10" />

      {/* 8. Go to > */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('goto')}
        onMouseLeave={() => setActiveSubmenu((cur) => (cur === 'goto' ? null : cur))}
      >
        <button
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
          onClick={() => setActiveSubmenu((cur) => (cur === 'goto' ? null : 'goto'))}
        >
          <div className="flex items-center space-x-2.5">
            <ExternalLink className="w-4 h-4 text-zinc-300" />
            <span className="font-normal">Go to</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </button>

        {activeSubmenu === 'goto' && (
          <div className="absolute left-full top-0 ml-1 w-48 bg-[#121316] border border-white/10 rounded-lg shadow-2xl py-1 text-[12px] z-50">
            {onViewAlbum && track.album && (
              <button
                onClick={() => {
                  onViewAlbum(track.album, track.artist);
                  onClose();
                }}
                className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/10 hover:text-white text-left transition-colors truncate"
              >
                <Disc3 className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <span className="truncate">Go to Album: {track.album}</span>
              </button>
            )}
            {onViewArtist &&
              artists.map((art) => (
                <button
                  key={art}
                  onClick={() => {
                    onViewArtist(art);
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/10 hover:text-white text-left transition-colors truncate"
                >
                  <Mic2 className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                  <span className="truncate">Go to Artist: {art}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* 9. Show track in file manager */}
      <button
        onClick={handleShowInFileManager}
        className="w-full px-3 py-2 flex items-center space-x-2.5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
      >
        <Folder className="w-4 h-4 text-zinc-300" />
        <span className="font-normal">Show track in file manager</span>
      </button>

      {/* Divider */}
      <div className="my-1 border-t border-white/10" />

      {/* 10. Edit Metadata */}
      {onEditTrackMetadata && (
        <button
          onClick={() => {
            onEditTrackMetadata(track);
            onClose();
          }}
          className="w-full px-3 py-2 flex items-center space-x-2.5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
        >
          <Edit3 className="w-4 h-4 text-zinc-300" />
          <span className="font-normal">Edit Metadata</span>
        </button>
      )}

      {/* 11. Get info */}
      <button
        onClick={() => {
          if (onToggleInfo) onToggleInfo(track);
          onClose();
        }}
        className="w-full px-3 py-2 flex items-center space-x-2.5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
      >
        <Info className="w-4 h-4 text-zinc-300" />
        <span className="font-normal">Get info</span>
      </button>
    </div>
  );
};
