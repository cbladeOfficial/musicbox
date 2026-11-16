import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Mic2,
  Info,
  Activity,
  Disc3,
  Radio,
  Maximize2,
} from 'lucide-react';
import { TrackRecord, RadioStation, RadioMetadata, VisualizerMode } from '../types/music';
import { getCoverUrl, formatBitrate } from '../utils/cover';
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
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);

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
    setHoverPos(e.clientX - rect.left);
    setHoverTime(pos * duration);
  };

  return (
    <footer className="h-24 py-4 px-6 w-full bg-[var(--sidebar-color)] border-t border-[var(--border-color)] flex items-center justify-between select-none z-40 transition-colors">
      {/* Left: Track Information */}
      <div className="flex items-center space-x-3.5 w-[28%] min-w-[220px]">
        {currentTrack ? (
          <>
            <div
              onClick={handleOpenAlbum}
              title={currentTrack.album ? `Open album: ${currentTrack.album}` : 'Open album'}
              className="relative w-14 h-14 rounded-md bg-zinc-900 border border-white/10 flex-shrink-0 overflow-hidden shadow-md cursor-pointer hover:border-[var(--accent-color)]/70 hover:opacity-90 transition-all group"
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
                <div className="w-full h-full flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  <Disc3 className="w-7 h-7 stroke-1" />
                </div>
              )}
            </div>

            <div className="flex flex-col truncate pr-2">
              <span
                onClick={handleOpenAlbum}
                title={currentTrack.album ? `Open album: ${currentTrack.album}` : currentTrack.title}
                className="text-[15px] font-medium text-white truncate hover:underline hover:text-[var(--accent-color)] cursor-pointer tracking-normal transition-colors"
              >
                {currentTrack.title}
              </span>
              <div
                title={currentTrack.artist}
                className="text-[13px] font-normal text-zinc-300 truncate mt-0.5"
              >
                <ArtistLinks
                  artists={currentTrack.artist}
                  onSelectArtist={onViewArtist}
                  linkClassName="hover:underline hover:text-white cursor-pointer transition-colors"
                />
              </div>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-zinc-300 font-mono border border-white/5">
                  {currentTrack.format}
                </span>
                {(() => {
                  const br = formatBitrate(currentTrack.bitrate);
                  return br ? (
                    <span className="text-xs text-zinc-400 font-mono tabular-nums">
                      • {br}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>

            <button
              onClick={() => onToggleFavorite(currentTrack.id)}
              title={currentTrack.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`p-2 rounded-full hover:bg-white/10 transition-colors duration-150 ${
                currentTrack.is_favorite ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${currentTrack.is_favorite ? 'fill-rose-500 stroke-rose-500' : ''}`} />
            </button>
          </>
        ) : currentRadio ? (
          <>
            <div className="relative w-14 h-14 rounded-lg bg-zinc-900 border border-white/10 flex-shrink-0 overflow-hidden shadow-md flex items-center justify-center">
              <RadioStationIcon
                favicon={currentRadio.favicon}
                name={currentRadio.name}
                iconClassName="text-[var(--accent-color)] text-xl"
              />
              {isPlaying && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </div>

            <div className="flex flex-col truncate pr-2">
              <span
                title={radioNowPlaying?.title || currentRadio.name}
                className="text-[15px] font-medium text-white truncate"
              >
                {radioNowPlaying?.title || currentRadio.name}
              </span>
              <div
                title={radioNowPlaying?.artist || currentRadio.name}
                className="text-[13px] font-normal text-zinc-300 truncate mt-0.5"
              >
                {radioNowPlaying?.artist && radioNowPlaying.artist !== 'Live Radio' ? (
                  <>
                    <ArtistLinks
                      artists={radioNowPlaying.artist}
                      onSelectArtist={onViewArtist}
                      linkClassName="hover:underline hover:text-white cursor-pointer transition-colors"
                    />
                    <span className="text-zinc-400"> • {currentRadio.name}</span>
                  </>
                ) : (
                  <span>{currentRadio.tags ? currentRadio.tags.split(',')[0] : 'Online Radio'}</span>
                )}
              </div>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono border border-emerald-500/25 flex items-center space-x-1.5 font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>LIVE</span>
                </span>
                {currentRadio.country && (
                  <span className="text-xs text-zinc-400 font-mono">
                    • {currentRadio.country}
                  </span>
                )}
              </div>
            </div>

            {onToggleRadioFavorite && (
              <button
                onClick={() => onToggleRadioFavorite(currentRadio.id)}
                title={currentRadio.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                className={`p-2 rounded-full hover:bg-white/10 transition-colors duration-150 ${
                  currentRadio.is_favorite ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${currentRadio.is_favorite ? 'fill-rose-500 stroke-rose-500' : ''}`} />
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center space-x-2.5 text-xs text-zinc-400">
            <Disc3 className="w-5 h-5 text-zinc-500" />
            <span className="font-medium text-zinc-400">Ready for playback</span>
          </div>
        )}
      </div>

      {/* Center: Playback Controls & Timeline */}
      <div className="flex flex-col items-center max-w-xl w-[44%] px-4">
        <div className="flex items-center space-x-4 mb-1.5">
          <button
            onClick={onToggleShuffle}
            disabled={!!currentRadio}
            title={currentRadio ? 'Shuffle not available for live radio' : (isShuffle ? 'Shuffle: On' : 'Shuffle: Off')}
            className={`p-1.5 rounded-md transition-colors ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-zinc-500'
                : isShuffle
                ? 'text-[var(--accent-color)] font-bold bg-[var(--accent-color)]/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={onPrevious}
            disabled={!!currentRadio}
            title={currentRadio ? 'Previous disabled for live stream' : 'Previous (Skip / Restart)'}
            className={`p-1.5 rounded-md transition-colors duration-150 active:opacity-75 ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-zinc-500'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <SkipBack className="w-4.5 h-4.5 fill-current" />
          </button>

          <button
            onClick={onPlayPause}
            disabled={!currentTrack && !currentRadio}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="w-9 h-9 rounded-full bg-[var(--accent-color)] hover:brightness-110 text-white flex items-center justify-center transition-opacity duration-150 active:opacity-75 shadow-md shadow-[var(--accent-color)]/30 disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause className="w-4.5 h-4.5 fill-current" />
            ) : (
              <Play className="w-4.5 h-4.5 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!!currentRadio}
            title={currentRadio ? 'Next disabled for live stream' : 'Next Track'}
            className={`p-1.5 rounded-md transition-colors duration-150 active:opacity-75 ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-zinc-500'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <SkipForward className="w-4.5 h-4.5 fill-current" />
          </button>

          <button
            onClick={onToggleRepeat}
            disabled={!!currentRadio}
            title={
              currentRadio
                ? 'Repeat not available for live radio'
                : repeatMode === 'all'
                ? 'Repeat: All (Continuous playlist playback)'
                : repeatMode === 'one'
                ? 'Repeat: One (Loop current track)'
                : 'Repeat: Off (Single track playback - do not advance)'
            }
            className={`p-1.5 rounded-md transition-colors duration-150 active:opacity-75 ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-zinc-500'
                : repeatMode !== 'off'
                ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/10 font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Timeline Slider with Tooltip or Live Radio Banner */}
        {currentRadio ? (
          <div className="w-full flex items-center justify-center space-x-2.5 py-1 text-[12px] text-zinc-300 font-mono">
            <span className="relative flex h-2 w-2">
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-[11px] font-medium text-zinc-300">
              {isPlaying ? 'LIVE STREAM' : 'STREAM PAUSED'}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-[13px] text-zinc-300 truncate max-w-[280px]">
              {currentRadio.name}
            </span>
          </div>
        ) : (
          <div className="w-full flex items-center space-x-2.5 text-[13px] text-zinc-300 font-mono tabular-nums">
            <span className="w-10 text-right">{formatTime(displayTime)}</span>
            <div
              ref={progressTrackRef}
              onMouseMove={handleMouseMoveProgress}
              onMouseLeave={() => setHoverTime(null)}
              className="relative flex-1 flex items-center h-4 group cursor-pointer"
            >
              {/* Hover timestamp tooltip */}
              {hoverTime !== null && (
                <div
                  className="absolute -top-7 px-2 py-0.5 rounded bg-zinc-900 border border-white/20 text-[11px] text-white font-mono pointer-events-none transform -translate-x-1/2 shadow-xl"
                  style={{ left: `${hoverPos}px` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}

              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden group-hover:h-2 transition-all">
                <div
                  className="h-full bg-[var(--accent-color)] rounded-full relative"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.25}
                value={displayTime}
                onMouseDown={() => setIsSeeking(true)}
                onChange={(e) => setSeekVal(parseFloat(e.target.value))}
                onMouseUp={() => {
                  onSeek(seekVal);
                  setIsSeeking(false);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        )}
      </div>

      {/* Right: Drawer Toggles, Visualizer & Volume */}
      <div className="flex items-center justify-end space-x-2 w-[28%] min-w-[220px]">
        {/* Visualizer Toggle */}
        <button
          onClick={onToggleVisualizer}
          title={`Visualizer: ${VISUALIZER_LABELS[visualizerMode] || visualizerMode} (Click to switch)`}
          className={`p-2 rounded-md transition-colors ${
            visualizerMode !== 'off'
              ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/15 font-medium'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Full-space Visualizer View Toggle */}
        {onToggleFullVisualizer && (
          <button
            onClick={onToggleFullVisualizer}
            title={isFullVisualizer ? 'Exit Full-space Visualizer' : 'Enter Full-space Visualizer'}
            className={`p-2 rounded-md transition-colors ${
              isFullVisualizer
                ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/15 font-medium'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {/* Synced Lyrics Toggle */}
        <button
          onClick={onToggleLyrics}
          title="Synced Karaoke Lyrics"
          className={`p-2 rounded-md transition-colors ${
            showLyrics
              ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/15 font-medium'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Queue Toggle */}
        <button
          onClick={onToggleQueue}
          title="Play Queue"
          className={`p-2 rounded-md transition-colors ${
            showQueue
              ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/15 font-medium'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Info Drawer Toggle */}
        <button
          onClick={onToggleInfo}
          title="Track Specs & Bio"
          className={`p-2 rounded-md transition-colors ${
            showInfo
              ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/15 font-medium'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Info className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        {/* Volume Slider */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-zinc-800 accent-[var(--accent-color)] rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
};
