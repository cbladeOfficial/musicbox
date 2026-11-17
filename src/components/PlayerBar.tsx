import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Square,
  MoreVertical,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Mic2,
  Activity,
  Disc3,
  Star,
  Cast,
  TimerOff,
  SlidersHorizontal,
  PanelRightClose,
} from 'lucide-react';
import { TrackRecord, RadioStation, RadioMetadata, VisualizerMode, PlaylistRecord } from '../types/music';
import { getCoverUrl } from '../utils/cover';
import { RadioStationIcon } from './RadioStationIcon';
import { ArtistLinks } from './ArtistLinks';
import { TrackContextMenu } from './TrackContextMenu';

interface PlayerBarProps {
  currentTrack: TrackRecord | null;
  currentRadio?: RadioStation | null;
  radioNowPlaying?: RadioMetadata | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  visualizerMode: VisualizerMode;
  showLyrics: boolean;
  showQueue: boolean;
  showInfo: boolean;
  isFullVisualizer?: boolean;
  streamPort: number;
  coverArtUrl?: string;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onStop?: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleVisualizer: () => void;
  onToggleFullVisualizer?: () => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onToggleInfo: (track?: TrackRecord) => void;
  onToggleFavorite: (id: number) => void;
  onToggleRadioFavorite?: (id: number) => void;
  onViewArtist?: (artistName: string) => void;
  onViewAlbum?: (albumName: string, artistName?: string) => void;
  onToggleAutoDj?: () => void;
  isAutoDj?: boolean;
  playlists?: PlaylistRecord[];
  onAddToPlaylist?: (playlistId: number, trackId: number) => void;
  onPlayTrack?: (track: TrackRecord) => void;
  onPlayNext?: (track: TrackRecord) => void;
  onAddToQueue?: (track: TrackRecord) => void;
  onEditTrackMetadata?: (track: TrackRecord) => void;
  onCreatePlaylist?: (name: string, trackId?: number) => void;
  onStartRadio?: (track: TrackRecord) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

const VISUALIZER_LABELS: Record<VisualizerMode, string> = {
  bars: 'Spectrum Bars',
  'mirror-bars': 'Mirrored Bars',
  wave: 'Oscilloscope Wave',
  circle: 'Circular Reactor',
  'rainbow-ribbon': 'Rainbow Ribbons',
  particles: 'Particle Starfield',
  off: 'Off',
};

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  currentRadio,
  radioNowPlaying,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  visualizerMode,
  showLyrics,
  showQueue,
  showInfo,
  isFullVisualizer = false,
  streamPort,
  coverArtUrl,
  onPlayPause,
  onPrevious,
  onNext,
  onStop,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleVisualizer,
  onToggleFullVisualizer,
  onToggleLyrics,
  onToggleQueue,
  onToggleInfo,
  onToggleFavorite,
  onToggleRadioFavorite,
  onViewArtist,
  onViewAlbum,
  onToggleAutoDj,
  isAutoDj = false,
  playlists = [],
  onAddToPlaylist,
  onPlayTrack,
  onPlayNext,
  onAddToQueue,
  onEditTrackMetadata,
  onCreatePlaylist,
  onStartRadio,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [, setHoverTime] = useState<number | null>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);

  // Track rating state (1 to 5 stars)
  const [trackRating, setTrackRating] = useState<number>(0);

  // Sleep timer minutes state (0, 15, 30, 45, 60)
  const [sleepMinutes, setSleepMinutes] = useState<number>(0);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toast / feedback message
  const [statusTooltip, setStatusTooltip] = useState<string | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Three-dot track context menu state
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const threeDotBtnRef = useRef<HTMLButtonElement | null>(null);

  // Draggable Volume Slider state
  const volumeTrackRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  const showStatus = (msg: string) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setStatusTooltip(msg);
    tooltipTimeoutRef.current = setTimeout(() => setStatusTooltip(null), 2500);
  };

  // Sync star rating from track favorite status or saved rating
  useEffect(() => {
    if (currentTrack) {
      const saved = localStorage.getItem(`musicbox_rating_${currentTrack.id}`);
      if (saved) {
        setTrackRating(parseInt(saved, 10) || 0);
      } else {
        setTrackRating(currentTrack.is_favorite ? 5 : 0);
      }
    } else {
      setTrackRating(0);
    }
  }, [currentTrack]);

  const handleSetRating = (stars: number) => {
    if (!currentTrack) return;
    const newRating = trackRating === stars ? 0 : stars;
    setTrackRating(newRating);
    localStorage.setItem(`musicbox_rating_${currentTrack.id}`, newRating.toString());
    if (newRating >= 4 && !currentTrack.is_favorite) {
      onToggleFavorite(currentTrack.id);
    } else if (newRating === 0 && currentTrack.is_favorite) {
      onToggleFavorite(currentTrack.id);
    }
    showStatus(newRating > 0 ? `Rated ${newRating} star${newRating > 1 ? 's' : ''}` : 'Rating cleared');
  };

  // Sleep timer toggle
  const handleSleepTimerToggle = () => {
    const intervals = [0, 15, 30, 45, 60];
    const nextIdx = (intervals.indexOf(sleepMinutes) + 1) % intervals.length;
    const nextMin = intervals[nextIdx];
    setSleepMinutes(nextMin);

    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);

    if (nextMin > 0) {
      showStatus(`Sleep timer: playback will stop in ${nextMin}m`);
      sleepTimerRef.current = setTimeout(() => {
        if (onStop) onStop();
        else onPlayPause();
        setSleepMinutes(0);
        showStatus('Sleep timer finished: playback stopped');
      }, nextMin * 60 * 1000);
    } else {
      showStatus('Sleep timer disabled');
    }
  };

  const displayTime = isSeeking ? seekVal : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const resolvedCover = getCoverUrl(currentTrack?.cover_path, streamPort, coverArtUrl);

  const handleOpenAlbum = () => {
    if (currentTrack && onViewAlbum) {
      onViewAlbum(currentTrack.album, currentTrack.artist);
    }
  };

  const handleMouseMoveProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || duration <= 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
    if (isSeeking) {
      setSeekVal(pos * duration);
    }
  };

  const handleClickProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || duration <= 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pos * duration);
    setIsSeeking(false);
  };

  // Draggable volume slider logic
  const calculateVolumeFromEvent = (clientX: number) => {
    if (!volumeTrackRef.current) return;
    const rect = volumeTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onVolumeChange(pos);
  };

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingVolume(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    calculateVolumeFromEvent(e.clientX);
  };

  const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingVolume) {
      calculateVolumeFromEvent(e.clientX);
    }
  };

  const handleVolumePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingVolume) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setIsDraggingVolume(false);
    }
  };

  const handleVolumeWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const nextVol = Math.max(0, Math.min(1, (isMuted ? 0 : volume) + delta));
    onVolumeChange(nextVol);
  };

  return (
    <footer className="relative h-20 px-5 w-full bg-[#090a0d] border-t border-white/10 flex items-center justify-between select-none z-40 transition-colors shadow-2xl flex-shrink-0">
      {/* Floating status pill notification */}
      {statusTooltip && (
        <div className="absolute -top-10 right-8 px-3.5 py-1 bg-zinc-900 border border-white/15 text-xs text-white rounded-md shadow-2xl backdrop-blur-md animate-fadeIn z-50 pointer-events-none font-medium">
          {statusTooltip}
        </div>
      )}

      {/* 1. Left: Track Information (Larger Cover + Spacious Title + ⋮ + Artist + Album) */}
      <div className="flex items-center space-x-3.5 w-[28%] min-w-[220px]">
        {currentTrack ? (
          <>
            {/* Square Album Cover Thumbnail (56px x 56px, spacious & clean) */}
            <div
              onClick={handleOpenAlbum}
              title={currentTrack.album ? `Open album: ${currentTrack.album}` : 'Open album'}
              className="relative w-14 h-14 rounded-md bg-zinc-900 border border-white/10 flex-shrink-0 overflow-hidden shadow-lg cursor-pointer hover:border-blue-400/70 hover:opacity-95 transition-all group"
            >
              {resolvedCover ? (
                <img
                  src={resolvedCover}
                  alt={currentTrack.album}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                  <Disc3 className="w-6 h-6 stroke-1" />
                </div>
              )}
            </div>

            {/* 3-Line Vertical Track Details Stack with comfortable, un-cramped spacing */}
            <div className="flex flex-col min-w-0 pr-2 justify-center">
              {/* Line 1: Song Title + ⋮ Menu icon */}
              <div className="flex items-center space-x-1.5 min-w-0">
                <span
                  onClick={handleOpenAlbum}
                  title={currentTrack.album ? `Open album: ${currentTrack.album}` : currentTrack.title}
                  className="text-[14px] font-bold text-white truncate hover:underline cursor-pointer tracking-wide leading-tight"
                >
                  {currentTrack.title}
                </span>
                <button
                  ref={threeDotBtnRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTrackMenu((prev) => !prev);
                  }}
                  title="Track options & actions"
                  className="p-1 -my-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Line 2: Artist(s) with clear vertical margin */}
              <div className="text-[12px] text-zinc-400 truncate mt-1 font-normal leading-tight">
                <ArtistLinks
                  artists={currentTrack.artist}
                  onSelectArtist={onViewArtist}
                  linkClassName="hover:underline hover:text-zinc-200 cursor-pointer transition-colors"
                />
              </div>

              {/* Line 3: Album with clear vertical margin */}
              <div className="text-[12px] text-zinc-400 truncate mt-0.5 font-normal leading-tight">
                <span
                  onClick={handleOpenAlbum}
                  title={currentTrack.album}
                  className="hover:underline hover:text-blue-400 cursor-pointer transition-colors"
                >
                  {currentTrack.album || 'Unknown Album'}
                </span>
              </div>
            </div>
          </>
        ) : currentRadio ? (
          <>
            <div className="relative w-14 h-14 rounded-md bg-zinc-900 border border-white/10 flex-shrink-0 overflow-hidden shadow-lg flex items-center justify-center">
              <RadioStationIcon
                favicon={currentRadio.favicon}
                name={currentRadio.name}
                iconClassName="text-blue-400 text-xl"
              />
              {isPlaying && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
              )}
            </div>

            <div className="flex flex-col min-w-0 pr-2 justify-center">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span
                  title={radioNowPlaying?.title || currentRadio.name}
                  className="text-[14px] font-bold text-white truncate tracking-wide leading-tight"
                >
                  {radioNowPlaying?.title || currentRadio.name}
                </span>
                <button
                  onClick={() => onToggleInfo()}
                  title="Station details"
                  className="p-1 -my-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[12px] text-zinc-400 truncate mt-1 font-normal leading-tight">
                {radioNowPlaying?.artist && radioNowPlaying.artist !== 'Live Radio' ? (
                  <ArtistLinks
                    artists={radioNowPlaying.artist}
                    onSelectArtist={onViewArtist}
                    linkClassName="hover:underline hover:text-zinc-200 cursor-pointer transition-colors"
                  />
                ) : (
                  <span>{currentRadio.tags ? currentRadio.tags.split(',')[0] : 'Online Radio'}</span>
                )}
              </div>

              <div className="text-[12px] text-zinc-400 truncate mt-0.5 font-normal leading-tight">
                <span>{currentRadio.name}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-2.5 text-xs text-zinc-400">
            <Disc3 className="w-5 h-5 text-zinc-500" />
            <span className="font-normal text-zinc-400">Ready for playback</span>
          </div>
        )}
      </div>

      {/* 2. Center: Playback Controls (Row 1) & Progress Bar (Row 2) */}
      <div className="flex flex-col items-center justify-center w-[44%] max-w-[540px] px-2">
        {/* Row 1: Center Controls: Stop ■, Shuffle 🔀, Prev ⏮, Play/Pause ⏸, Next ⏭, Repeat 🔁, Queue 𝄃≡ */}
        <div className="flex items-center space-x-4 mb-1.5">
          {/* Stop Button ■ */}
          <button
            onClick={onStop || onPlayPause}
            disabled={!currentTrack && !currentRadio}
            title="Stop playback"
            className="p-1 text-zinc-400 hover:text-white transition-colors duration-150 disabled:opacity-30"
          >
            <Square className="w-3.5 h-3.5 fill-current text-zinc-300 hover:text-white" />
          </button>

          {/* Shuffle Button 🔀 */}
          <button
            onClick={onToggleShuffle}
            disabled={!!currentRadio}
            title={currentRadio ? 'Shuffle not available for live radio' : (isShuffle ? 'Shuffle: On' : 'Shuffle: Off')}
            className={`p-1 transition-colors duration-150 ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-zinc-500'
                : isShuffle
                ? 'text-blue-400 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous Track Button ⏮ */}
          <button
            onClick={onPrevious}
            disabled={!!currentRadio}
            title={currentRadio ? 'Previous disabled for live stream' : 'Previous track'}
            className={`p-1 transition-colors duration-150 ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-zinc-500'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          {/* Play/Pause Button: Solid White Circle with Black Icon */}
          <button
            onClick={onPlayPause}
            disabled={!currentTrack && !currentRadio}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="w-9 h-9 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all duration-150 shadow-md flex-shrink-0 disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black text-black" />
            ) : (
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            )}
          </button>

          {/* Next Track Button ⏭ */}
          <button
            onClick={onNext}
            disabled={!!currentRadio}
            title={currentRadio ? 'Next disabled for live stream' : 'Next track'}
            className={`p-1 transition-colors duration-150 ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-zinc-500'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          {/* Repeat Button 🔁 / 🔂 */}
          <button
            onClick={onToggleRepeat}
            disabled={!!currentRadio}
            title={
              currentRadio
                ? 'Repeat disabled for live stream'
                : repeatMode === 'one'
                ? 'Repeat: One'
                : repeatMode === 'all'
                ? 'Repeat: All'
                : 'Repeat: Off'
            }
            className={`p-1 transition-colors duration-150 ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-zinc-500'
                : repeatMode !== 'off'
                ? 'text-blue-400 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>

          {/* Queue Icon (Feishin style right beside Repeat) */}
          <button
            onClick={onToggleQueue}
            title="Play Queue"
            className={`p-1 transition-colors duration-150 ${
              showQueue ? 'text-blue-400 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Progress Track & Elapsed / Total Durations */}
        <div className="w-full flex items-center space-x-2 text-[11px] font-mono tabular-nums text-zinc-400">
          <span className="w-10 text-right select-none">{formatTime(displayTime)}</span>
          <div
            ref={progressTrackRef}
            onClick={handleClickProgress}
            onMouseMove={handleMouseMoveProgress}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            onMouseLeave={() => setHoverTime(null)}
            className="flex-1 h-3 flex items-center cursor-pointer relative group"
          >
            <div className="w-full h-1 bg-[#27272a] rounded-full overflow-hidden transition-all duration-150 group-hover:h-1.5">
              <div
                className="h-full bg-white transition-[width] duration-100 ease-out rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Scrubber thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${progressPercent}% - 5px)` }}
            />
          </div>
          <span className="w-10 text-left select-none text-zinc-400">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* 3. Right: Rating + AUTO DJ (Top Row) and Action Icons + Volume (Bottom Row) */}
      <div className="w-[28%] min-w-[220px] flex flex-col items-end justify-center pr-1">
        {/* Top Sub-row: 5 Stars Rating + AUTO DJ badge */}
        <div className="flex items-center space-x-3 mb-1.5">
          {/* 5-Star Rating */}
          <div className="flex items-center space-x-0.5" title={`Track rating: ${trackRating} of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleSetRating(star)}
                disabled={!currentTrack}
                className="p-0.5 text-zinc-500 hover:text-amber-400 transition-colors disabled:opacity-20"
              >
                <Star
                  className={`w-3 h-3 ${
                    star <= trackRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* AUTO DJ button */}
          <button
            onClick={() => {
              if (onToggleAutoDj) onToggleAutoDj();
              showStatus(isAutoDj ? 'Auto DJ disabled' : 'Auto DJ enabled: Continuous library mix');
            }}
            title={isAutoDj ? 'Auto DJ: Active (Endless library mix)' : 'Enable Auto DJ'}
            className={`text-[10px] font-bold tracking-wider uppercase transition-colors px-1 py-0.5 rounded ${
              isAutoDj ? 'text-blue-400 bg-blue-500/15' : 'text-blue-400 hover:text-blue-300'
            }`}
          >
            AUTO DJ
          </button>
        </div>

        {/* Bottom Sub-row: Cast, SleepTimer, Equalizer, Lyrics, Favorite, Panel, Visualizer, Volume */}
        <div className="flex items-center space-x-2.5">
          {/* Cast Icon */}
          <button
            onClick={() => showStatus('Default Output: Windows WASAPI Audio Engine')}
            title="Audio Output / Cast"
            className="text-zinc-400 hover:text-white transition-colors p-0.5"
          >
            <Cast className="w-4 h-4" />
          </button>

          {/* Sleep Timer Icon */}
          <button
            onClick={handleSleepTimerToggle}
            title={sleepMinutes ? `Sleep timer: ${sleepMinutes}m active` : 'Set Sleep Timer'}
            className={`p-0.5 transition-colors ${
              sleepMinutes > 0 ? 'text-blue-400 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TimerOff className="w-4 h-4" />
          </button>

          {/* Equalizer Icon */}
          <button
            onClick={() => showStatus('Equalizer: Flat / Direct Output')}
            title="Equalizer"
            className="text-zinc-400 hover:text-white transition-colors p-0.5"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Lyrics Icon (Mic2) */}
          <button
            onClick={onToggleLyrics}
            title="Synced Karaoke Lyrics"
            className={`p-0.5 transition-colors ${
              showLyrics ? 'text-blue-400 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Favorite / Heart Icon */}
          <button
            onClick={() => {
              if (currentTrack) {
                onToggleFavorite(currentTrack.id);
              } else if (currentRadio && onToggleRadioFavorite) {
                onToggleRadioFavorite(currentRadio.id);
              }
            }}
            title={
              (currentTrack?.is_favorite || currentRadio?.is_favorite)
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
            className={`p-0.5 transition-colors ${
              (currentTrack?.is_favorite || currentRadio?.is_favorite)
                ? 'text-rose-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${
                (currentTrack?.is_favorite || currentRadio?.is_favorite)
                  ? 'fill-rose-500 stroke-rose-500'
                  : ''
              }`}
            />
          </button>

          {/* Right Panel / Info Toggle Icon (PanelRightClose) */}
          <button
            onClick={() => onToggleInfo(currentTrack || undefined)}
            title="Track Information Drawer"
            className={`p-0.5 transition-colors ${
              showInfo ? 'text-blue-400 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <PanelRightClose className="w-4 h-4" />
          </button>

          {/* SEPARATE VISUALIZER BUTTON (Preserved as explicitly requested) */}
          <button
            onClick={onToggleVisualizer}
            onContextMenu={(e) => {
              e.preventDefault();
              if (onToggleFullVisualizer) onToggleFullVisualizer();
            }}
            title={`Visualizer: ${VISUALIZER_LABELS[visualizerMode]} (Right-click for full screen)`}
            className={`p-0.5 transition-colors ${
              visualizerMode !== 'off' || isFullVisualizer
                ? 'text-blue-400 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Volume Control: Speaker Icon + Smooth Draggable Pill Slider */}
          <div
            className="flex items-center space-x-1.5 ml-1"
            onWheel={handleVolumeWheel}
          >
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              className="text-zinc-400 hover:text-white transition-colors p-0.5"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div
              ref={volumeTrackRef}
              onPointerDown={handleVolumePointerDown}
              onPointerMove={handleVolumePointerMove}
              onPointerUp={handleVolumePointerUp}
              onPointerCancel={handleVolumePointerUp}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}% (Click or drag)`}
              className="w-20 h-5 flex items-center cursor-pointer select-none group/vol relative touch-none"
            >
              <div className="w-full h-1.5 group-hover/vol:h-2 bg-[#3f3f46]/80 rounded-full overflow-hidden transition-all duration-150">
                <div
                  className="h-full bg-white rounded-full group-hover/vol:bg-white transition-[width] duration-75"
                  style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                />
              </div>
              {/* Draggable knob indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md pointer-events-none opacity-0 group-hover/vol:opacity-100 transition-opacity duration-150"
                style={{
                  left: `calc(${(isMuted ? 0 : volume) * 100}% - 5px)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feishin Desktop Context Menu for Current Track (Image 6) */}
      {showTrackMenu && currentTrack && (
        <TrackContextMenu
          track={currentTrack}
          anchorRect={threeDotBtnRef.current?.getBoundingClientRect()}
          onClose={() => setShowTrackMenu(false)}
          onPlayTrack={onPlayTrack || (() => {})}
          onPlayNext={onPlayNext}
          onAddToQueue={onAddToQueue || (() => {})}
          onToggleFavorite={onToggleFavorite}
          playlists={playlists}
          onAddToPlaylist={onAddToPlaylist || (() => {})}
          onCreatePlaylist={onCreatePlaylist}
          onViewAlbum={onViewAlbum}
          onViewArtist={onViewArtist}
          onEditTrackMetadata={onEditTrackMetadata}
          onToggleInfo={onToggleInfo}
          onSetRating={handleSetRating}
          onStartRadio={onStartRadio}
          onShowToast={showStatus}
        />
      )}
    </footer>
  );
};
