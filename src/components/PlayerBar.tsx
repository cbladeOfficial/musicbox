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
} from 'lucide-react';
import { TrackRecord, RadioStation, RadioMetadata, VisualizerMode } from '../types/music';
import { getCoverUrl } from '../utils/cover';

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
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onToggleInfo: () => void;
  onToggleFavorite: (id: number) => void;
  onToggleRadioFavorite?: (id: number) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

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
  onToggleLyrics,
  onToggleQueue,
  onToggleInfo,
  onToggleFavorite,
  onToggleRadioFavorite,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);

  const displayTime = isSeeking ? seekVal : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const resolvedCover = getCoverUrl(currentTrack?.cover_path, streamPort, coverArtUrl);

  const handleMouseMoveProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || duration <= 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(e.clientX - rect.left);
    setHoverTime(pos * duration);
  };

  return (
    <footer className="h-[76px] w-full bg-[var(--surface-color)]/95 backdrop-blur-md border-t border-[var(--border-color)] flex items-center justify-between px-4 select-none z-40 transition-colors">
      {/* Left: Track Information */}
      <div className="flex items-center space-x-3 w-[28%] min-w-[210px]">
        {currentTrack ? (
          <>
            <div className="relative w-12 h-12 rounded bg-[var(--surface-active)] border border-[var(--border-color)] flex-shrink-0 overflow-hidden shadow-sm">
              {resolvedCover ? (
                <img
                  src={resolvedCover}
                  alt={currentTrack.album}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--surface-active)]">
                  <Disc3 className="w-6 h-6 opacity-40 text-[var(--text-muted)]" />
                </div>
              )}
            </div>

            <div className="flex flex-col truncate pr-2">
              <span
                onClick={onToggleInfo}
                title={currentTrack.title}
                className="text-[13px] font-medium text-[var(--text-main)] truncate hover:underline cursor-pointer tracking-tight"
              >
                {currentTrack.title}
              </span>
              <span
                onClick={onToggleInfo}
                title={currentTrack.artist}
                className="text-[11px] text-[var(--text-muted)] truncate hover:text-[var(--text-main)] cursor-pointer"
              >
                {currentTrack.artist}
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] font-mono border border-[var(--border-color)] tracking-wider">
                  {currentTrack.format}
                </span>
                {currentTrack.bitrate && (
                  <span className="text-[9px] text-[var(--text-muted)] font-mono tabular-nums opacity-80">
                    {Math.round(currentTrack.bitrate / 1000)}k
                  </span>
                )}
                {currentTrack.year ? (
                  <span className="text-[9px] text-[var(--text-muted)] font-mono opacity-80">
                    • {currentTrack.year}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              onClick={() => onToggleFavorite(currentTrack.id)}
              title={currentTrack.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`p-1.5 rounded-full hover:bg-[var(--surface-hover)] transition-all ${
                currentTrack.is_favorite ? 'text-rose-500 scale-105' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Heart className={`w-4 h-4 ${currentTrack.is_favorite ? 'fill-rose-500 stroke-rose-500' : ''}`} />
            </button>
          </>
        ) : currentRadio ? (
          <>
            <div className="relative w-12 h-12 rounded bg-[var(--surface-active)] border border-[var(--border-color)] flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center">
              {currentRadio.favicon ? (
                <img
                  src={currentRadio.favicon}
                  alt={currentRadio.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Radio className="w-5 h-5 text-[var(--accent-color)]" />
              )}
            </div>

            <div className="flex flex-col truncate pr-2">
              <span
                title={radioNowPlaying?.title || currentRadio.name}
                className="text-[13px] font-medium text-[var(--text-main)] truncate tracking-tight"
              >
                {radioNowPlaying?.title || currentRadio.name}
              </span>
              <span
                title={radioNowPlaying?.artist || currentRadio.name}
                className="text-[11px] text-[var(--text-muted)] truncate"
              >
                {radioNowPlaying?.artist && radioNowPlaying.artist !== 'Live Radio'
                  ? `${radioNowPlaying.artist} • ${currentRadio.name}`
                  : (currentRadio.tags ? currentRadio.tags.split(',')[0] : 'Online Radio')}
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono border border-emerald-500/30 tracking-wider flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LIVE</span>
                </span>
                {currentRadio.country && (
                  <span className="text-[9px] text-[var(--text-muted)] font-mono opacity-80">
                    • {currentRadio.country}
                  </span>
                )}
              </div>
            </div>

            {onToggleRadioFavorite && (
              <button
                onClick={() => onToggleRadioFavorite(currentRadio.id)}
                title={currentRadio.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                className={`p-1.5 rounded-full hover:bg-[var(--surface-hover)] transition-all ${
                  currentRadio.is_favorite ? 'text-rose-500 scale-105' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Heart className={`w-4 h-4 ${currentRadio.is_favorite ? 'fill-rose-500 stroke-rose-500' : ''}`} />
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
            <Disc3 className="w-4 h-4 opacity-40" />
            <span>Ready for playback</span>
          </div>
        )}
      </div>

      {/* Center: Playback Controls & Timeline */}
      <div className="flex flex-col items-center max-w-xl w-[44%] px-4">
        <div className="flex items-center space-x-3 mb-1">
          <button
            onClick={onToggleShuffle}
            disabled={!!currentRadio}
            title={currentRadio ? 'Shuffle not available for live radio' : (isShuffle ? 'Shuffle: On' : 'Shuffle: Off')}
            className={`p-1.5 rounded transition-colors ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-[var(--text-muted)]'
                : isShuffle
                ? 'text-[var(--accent-color)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onPrevious}
            disabled={!!currentRadio}
            title={currentRadio ? 'Previous disabled for live stream' : 'Previous (Skip / Restart)'}
            className={`p-1.5 rounded transition-colors active:scale-95 ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-[var(--text-muted)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onPlayPause}
            disabled={!currentTrack && !currentRadio}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="w-8 h-8 rounded-full bg-[var(--accent-color)] hover:brightness-110 text-white flex items-center justify-center transition-all active:scale-95 shadow-sm shadow-[var(--accent-color)]/30 disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!!currentRadio}
            title={currentRadio ? 'Next disabled for live stream' : 'Next Track'}
            className={`p-1.5 rounded transition-colors active:scale-95 ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-[var(--text-muted)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onToggleRepeat}
            disabled={!!currentRadio}
            title={currentRadio ? 'Repeat not available for live radio' : `Repeat mode: ${repeatMode}`}
            className={`p-1.5 rounded transition-colors ${
              currentRadio
                ? 'opacity-20 cursor-not-allowed text-[var(--text-muted)]'
                : repeatMode !== 'off'
                ? 'text-[var(--accent-color)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Timeline Slider with Tooltip or Live Radio Banner */}
        {currentRadio ? (
          <div className="w-full flex items-center justify-center space-x-2 py-0.5 text-[11px] text-[var(--text-muted)] font-mono">
            <span className="relative flex h-2 w-2">
              {isPlaying && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-[var(--text-main)]">
              {isPlaying ? 'LIVE STREAM' : 'PAUSED'}
            </span>
            <span className="opacity-40">•</span>
            <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[260px]">
              {currentRadio.name}
            </span>
          </div>
        ) : (
          <div className="w-full flex items-center space-x-2 text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
            <span className="w-9 text-right">{formatTime(displayTime)}</span>
            <div
              ref={progressTrackRef}
              onMouseMove={handleMouseMoveProgress}
              onMouseLeave={() => setHoverTime(null)}
              className="relative flex-1 flex items-center h-4 group cursor-pointer"
            >
              {/* Hover timestamp tooltip */}
              {hoverTime !== null && (
                <div
                  className="absolute -top-6 px-1.5 py-0.5 rounded bg-[var(--sidebar-color)] border border-[var(--border-color)] text-[10px] text-[var(--text-main)] font-mono pointer-events-none transform -translate-x-1/2 shadow-lg"
                  style={{ left: `${hoverPos}px` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}

              <div className="w-full h-1 bg-[var(--border-color)] rounded-full overflow-hidden group-hover:h-1.5 transition-all">
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
            <span className="w-9">{formatTime(duration)}</span>
          </div>
        )}
      </div>

      {/* Right: Drawer Toggles, Visualizer & Volume */}
      <div className="flex items-center justify-end space-x-1.5 w-[28%] min-w-[210px]">
        {/* Visualizer Toggle */}
        <button
          onClick={onToggleVisualizer}
          title={`Visualizer Style: ${visualizerMode}`}
          className={`p-1.5 rounded transition-colors ${
            visualizerMode !== 'off'
              ? 'text-[var(--accent-color)] bg-[var(--surface-active)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Synced Lyrics Toggle */}
        <button
          onClick={onToggleLyrics}
          title="Synced Karaoke Lyrics"
          className={`p-1.5 rounded transition-colors ${
            showLyrics
              ? 'text-[var(--accent-color)] bg-[var(--surface-active)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Queue Toggle */}
        <button
          onClick={onToggleQueue}
          title="Play Queue"
          className={`p-1.5 rounded transition-colors ${
            showQueue
              ? 'text-[var(--accent-color)] bg-[var(--surface-active)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Info Drawer Toggle */}
        <button
          onClick={onToggleInfo}
          title="Track Specs & Bio"
          className={`p-1.5 rounded transition-colors ${
            showInfo
              ? 'text-[var(--accent-color)] bg-[var(--surface-active)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <Info className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-[var(--border-color)] mx-1" />

        {/* Volume Slider */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded"
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
            className="w-18 h-1 bg-[var(--border-color)] accent-[var(--accent-color)] rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
};
