import React, { useState } from 'react';
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
  ListOrdered,
  ListMusic,
  Mic2,
  Info,
  Activity,
} from 'lucide-react';
import { TrackRecord, VisualizerMode } from '../types/music';

interface PlayerBarProps {
  currentTrack: TrackRecord | null;
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
  coverArtUrl?: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
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
  coverArtUrl,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);

  const displayTime = isSeeking ? seekVal : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <div className="h-20 w-full bg-[var(--surface-color)] border-t border-[var(--border-color)] flex items-center justify-between px-4 select-none z-40">
      {/* Left: Current Track Info */}
      <div className="flex items-center space-x-3 w-1/4 min-w-[200px]">
        {currentTrack ? (
          <>
            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-[var(--surface-active)] border border-[var(--border-color)] flex-shrink-0 shadow-sm">
              {coverArtUrl || currentTrack.cover_path ? (
                <img
                  src={coverArtUrl || `file://${currentTrack.cover_path}`}
                  alt={currentTrack.album}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback on image error
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs font-semibold">
                  🎵
                </div>
              )}
            </div>

            <div className="flex flex-col truncate pr-2">
              <span className="text-xs font-semibold text-[var(--text-main)] truncate hover:underline cursor-pointer">
                {currentTrack.title}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] truncate hover:underline cursor-pointer">
                {currentTrack.artist}
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] font-mono border border-[var(--border-color)]">
                  {currentTrack.format}
                </span>
                {currentTrack.bitrate && (
                  <span className="text-[9px] text-[var(--text-muted)] font-mono">
                    {Math.round(currentTrack.bitrate / 1000)} kbps
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onToggleFavorite(currentTrack.id)}
              className={`p-1.5 rounded-full hover:bg-[var(--surface-hover)] transition-colors ${
                currentTrack.is_favorite ? 'text-rose-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Heart className={`w-4 h-4 ${currentTrack.is_favorite ? 'fill-rose-500' : ''}`} />
            </button>
          </>
        ) : (
          <div className="text-xs text-[var(--text-muted)] italic">No track selected</div>
        )}
      </div>

      {/* Center: Playback & Timeline Controls */}
      <div className="flex flex-col items-center max-w-lg w-2/4 px-4">
        <div className="flex items-center space-x-4 mb-1.5">
          <button
            onClick={onToggleShuffle}
            title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'}
            className={`p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors ${
              isShuffle ? 'text-[var(--accent-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={onPrevious}
            title="Previous"
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onPlayPause}
            disabled={!currentTrack}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-8 h-8 rounded-full bg-[var(--accent-color)] hover:bg-[var(--feishin-accentHover)] text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-[var(--accent-color)]/25 disabled:opacity-50"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
          </button>

          <button
            onClick={onNext}
            title="Next"
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onToggleRepeat}
            title={`Repeat: ${repeatMode}`}
            className={`p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors ${
              repeatMode !== 'off' ? 'text-[var(--accent-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Timeline Slider */}
        <div className="w-full flex items-center space-x-2 text-[10px] text-[var(--text-muted)] font-mono">
          <span className="w-8 text-right">{formatTime(displayTime)}</span>
          <div className="relative flex-1 flex items-center h-4 group cursor-pointer">
            <div className="w-full h-1 bg-[var(--border-color)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-color)] rounded-full transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
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
          <span className="w-8">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Auxiliary Toggles & Volume */}
      <div className="flex items-center justify-end space-x-2 w-1/4 min-w-[200px]">
        {/* Visualizer Mode Toggle */}
        <button
          onClick={onToggleVisualizer}
          title={`Visualizer: ${visualizerMode}`}
          className={`p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors ${
            visualizerMode !== 'off' ? 'text-[var(--accent-color)] bg-[var(--surface-active)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Lyrics Drawer Toggle */}
        <button
          onClick={onToggleLyrics}
          title="Synced Lyrics"
          className={`p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors ${
            showLyrics ? 'text-[var(--accent-color)] bg-[var(--surface-active)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Queue Toggle */}
        <button
          onClick={onToggleQueue}
          title="Play Queue"
          className={`p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors ${
            showQueue ? 'text-[var(--accent-color)] bg-[var(--surface-active)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Track Info Drawer */}
        <button
          onClick={onToggleInfo}
          title="Track Details & Artist Bio"
          className={`p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors ${
            showInfo ? 'text-[var(--accent-color)] bg-[var(--surface-active)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Info className="w-4 h-4" />
        </button>

        {/* Volume Slider */}
        <div className="flex items-center space-x-1.5 pl-2">
          <button
            onClick={onToggleMute}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-[var(--border-color)] accent-[var(--accent-color)] rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
