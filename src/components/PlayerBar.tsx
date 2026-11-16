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
import { TrackRecord, RadioStation, RadioMetadata, VisualizerMode } from '../types/music';
import { getCoverUrl } from '../utils/cover';
import { RadioStationIcon } from './RadioStationIcon';
import { ArtistLinks } from './ArtistLinks';

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
  onToggleInfo: () => void;
  onToggleFavorite: (id: number) => void;
  onToggleRadioFavorite?: (id: number) => void;
  onViewArtist?: (artistName: string) => void;
  onViewAlbum?: (albumName: string, artistName?: string) => void;
  onToggleAutoDj?: () => void;
  isAutoDj?: boolean;
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

  const handleClickVolume = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onVolumeChange(pos);
  };

  return (
    <footer className="relative h-16 px-4 w-full bg-[#0a0b0e] border-t border-white/5 flex items-center justify-between select-none z-40 transition-colors">
      {/* Floating status pill notification */}
      {statusTooltip && (
        <div className="absolute -top-9 right-8 px-3 py-1 bg-zinc-900 border border-white/10 text-xs text-white rounded-md shadow-xl backdrop-blur-md animate-fadeIn z-50 pointer-events-none font-medium">
          {statusTooltip}
        </div>
      )}

      {/* 1. Left: Track Information (Cover + Title + ⋮ + Artist + Album) */}
      <div className="flex items-center space-x-3 w-[28%] min-w-[200px]">
        {currentTrack ? (
          <>
            {/* Square Album Cover Thumbnail */}
            <div
              onClick={handleOpenAlbum}
              title={currentTrack.album ? `Open album: ${currentTrack.album}` : 'Open album'}
              className="relative w-11 h-11 rounded-[4px] bg-zinc-900 border border-white/10 flex-shrink-0 overflow-hidden shadow cursor-pointer hover:border-blue-400/60 hover:opacity-90 transition-all group"
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
                  <Disc3 className="w-5 h-5 stroke-1" />
                </div>
              )}
            </div>

            {/* 3-Line Vertical Track Details Stack */}
            <div className="flex flex-col min-w-0 pr-2 leading-none">
              {/* Line 1: Song Title + ⋮ Menu icon */}
              <div className="flex items-center space-x-1 truncate">
                <span
                  onClick={handleOpenAlbum}
                  title={currentTrack.album ? `Open album: ${currentTrack.album}` : currentTrack.title}
                  className="text-[13px] font-semibold text-white truncate hover:underline hover:text-white cursor-pointer tracking-tight"
                >
                  {currentTrack.title}
                </span>
                <button
                  onClick={onToggleInfo}
                  title="Track details & specifications"
                  className="text-zinc-500 hover:text-white transition-colors p-0.5 rounded flex-shrink-0"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Line 2: Artist */}
              <div className="text-[11px] text-zinc-400 truncate mt-0.5 font-normal">
                <ArtistLinks
                  artists={currentTrack.artist}
                  onSelectArtist={onViewArtist}
                  linkClassName="hover:underline hover:text-zinc-200 cursor-pointer transition-colors"
                />
              </div>

              {/* Line 3: Album */}
              <div className="text-[11px] text-zinc-400 truncate mt-0.5 font-normal">
                <span
                  onClick={handleOpenAlbum}
                  title={currentTrack.album}
                  className="hover:underline hover:text-zinc-200 cursor-pointer transition-colors"
                >
                  {currentTrack.album || 'Unknown Album'}
                </span>
              </div>
            </div>
          </>
        ) : currentRadio ? (
          <>
            <div className="relative w-11 h-11 rounded-[4px] bg-zinc-900 border border-white/10 flex-shrink-0 overflow-hidden shadow flex items-center justify-center">
              <RadioStationIcon
                favicon={currentRadio.favicon}
                name={currentRadio.name}
                iconClassName="text-blue-400 text-lg"
              />
              {isPlaying && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </div>

            <div className="flex flex-col min-w-0 pr-2 leading-none">
              <div className="flex items-center space-x-1 truncate">
                <span
                  title={radioNowPlaying?.title || currentRadio.name}
                  className="text-[13px] font-semibold text-white truncate tracking-tight"
                >
                  {radioNowPlaying?.title || currentRadio.name}
                </span>
                <button
                  onClick={onToggleInfo}
                  title="Station details"
                  className="text-zinc-500 hover:text-white transition-colors p-0.5 rounded flex-shrink-0"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[11px] text-zinc-400 truncate mt-0.5 font-normal">
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

              <div className="text-[11px] text-zinc-400 truncate mt-0.5 font-normal">
                <span>{currentRadio.name}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-2 text-xs text-zinc-400">
            <Disc3 className="w-4 h-4 text-zinc-500" />
            <span className="font-normal text-zinc-400">Ready for playback</span>
          </div>
        )}
      </div>

      {/* 2. Center: Playback Controls (Row 1) & Progress Bar (Row 2) */}
      <div className="flex flex-col items-center justify-center w-[44%] max-w-[480px] px-2">
        {/* Row 1: Center Controls: Stop ■, Shuffle 🔀, Prev ⏮, Play/Pause ⏸, Next ⏭, Repeat 🔁, Queue 𝄃≡ */}
        <div className="flex items-center space-x-4 mb-1">
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
            className="w-8 h-8 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all duration-150 shadow-md flex-shrink-0 disabled:opacity-40"
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

          {/* Repeat Button 🔁 */}
          <button
            onClick={onToggleRepeat}
            disabled={!!currentRadio}
            title={
              currentRadio
                ? 'Repeat not available for live radio'
                : repeatMode === 'all'
                ? 'Repeat: All'
                : repeatMode === 'one'
                ? 'Repeat: One'
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

          {/* Queue Button 𝄃≡ */}
          <button
            onClick={onToggleQueue}
            title={showQueue ? 'Close queue' : 'Open queue'}
            className={`p-1 transition-colors duration-150 ${
              showQueue ? 'text-blue-400 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Seekbar / Progress Timeline: Time 3:13 ▬▬▬▬▬▬▬▬▬ 4:18 */}
        <div className="flex items-center space-x-2.5 w-full">
          <span className="text-[11px] font-mono text-zinc-400 tabular-nums w-8 text-right select-none">
            {formatTime(displayTime)}
          </span>

          <div
            ref={progressTrackRef}
            onClick={handleClickProgress}
            onMouseMove={handleMouseMoveProgress}
            onMouseLeave={() => setHoverTime(null)}
            className="flex-1 h-1 hover:h-1.5 rounded-full bg-[#3f3f46]/80 cursor-pointer relative transition-all group overflow-hidden"
          >
            <div
              className="h-full bg-white rounded-full transition-[width] duration-75"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>

          <span className="text-[11px] font-mono text-zinc-400 tabular-nums w-8 text-left select-none">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* 3. Right: Rating + AUTO DJ (Top Row) and Action Icons + Volume (Bottom Row) */}
      <div className="w-[28%] min-w-[220px] flex flex-col items-end justify-center pr-1">
        {/* Top Sub-row: 5 Stars Rating + AUTO DJ badge */}
        <div className="flex items-center space-x-3 mb-1">
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
            onClick={onToggleInfo}
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

          {/* Volume Control: Speaker Icon + Sleek White Filled Pill Slider */}
          <div className="flex items-center space-x-1.5 ml-1">
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
              onClick={handleClickVolume}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              className="w-16 h-1.5 bg-[#3f3f46]/80 rounded-full cursor-pointer relative overflow-hidden group transition-all"
            >
              <div
                className="h-full bg-white rounded-full transition-all group-hover:bg-zinc-100"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
