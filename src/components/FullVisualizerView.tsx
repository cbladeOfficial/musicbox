import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Disc3,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Radio as RadioIcon,
  X,
} from 'lucide-react';
import { Visualizer } from './Visualizer';
import { TrackRecord, RadioStation, RadioMetadata, VisualizerMode, LyricsData } from '../types/music';

interface FullVisualizerViewProps {
  currentTrack: TrackRecord | null;
  currentRadio: RadioStation | null;
  radioNowPlaying: RadioMetadata | null;
  isPlaying: boolean;
  accentColor?: string;
  coverUrl?: string;
  visualizerMode: VisualizerMode;
  onChangeVisualizerMode: (mode: VisualizerMode) => void;
  onClose: () => void;
  onTogglePlay: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeek?: (seconds: number) => void;
  volume?: number;
  onVolumeChange?: (vol: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  currentTime: number;
  duration: number;
  lyricsData?: LyricsData | null;
  isTotallyFullscreen: boolean;
  onToggleTotallyFullscreen: () => void;
}

export const FullVisualizerView: React.FC<FullVisualizerViewProps> = ({
  currentTrack,
  currentRadio,
  radioNowPlaying,
  isPlaying,
  accentColor = '#3b82f6',
  coverUrl,
  visualizerMode,
  onChangeVisualizerMode,
  onClose,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
  volume = 1,
  onVolumeChange,
  isMuted = false,
  onToggleMute,
  currentTime,
  duration,
  lyricsData,
  isTotallyFullscreen,
  onToggleTotallyFullscreen,
}) => {
  // Auto-hiding HUD controls for totally fullscreen mode
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (isPlaying && isTotallyFullscreen) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else if (isTotallyFullscreen) {
      resetHideTimer();
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, isTotallyFullscreen]);

  // Current active synced lyric line
  const activeLyric = useMemo(() => {
    if (!lyricsData || !lyricsData.synced || !lyricsData.lines.length) return null;
    const lines = lyricsData.lines;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (currentTime >= lines[i].time) {
        return lines[i].text;
      }
    }
    return lines[0].text;
  }, [lyricsData, currentTime]);

  const modes: { id: VisualizerMode; label: string }[] = [
    { id: 'bars', label: 'Bars' },
    { id: 'mirror-bars', label: 'Mirror' },
    { id: 'wave', label: 'Wave' },
    { id: 'circle', label: 'Circle' },
    { id: 'rainbow-ribbon', label: 'Ribbon' },
    { id: 'particles', label: 'Particles' },
  ];

  const title = currentTrack?.title || radioNowPlaying?.title || currentRadio?.name || 'Nothing Playing';
  const artist = currentTrack?.artist || radioNowPlaying?.artist || (currentRadio ? 'Live Radio' : '');
  const album = currentTrack?.album || currentRadio?.name || '';

  // Keyboard controls inside visualizer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (isTotallyFullscreen) {
          onToggleTotallyFullscreen();
        } else {
          onClose();
        }
      } else if (e.code === 'KeyF') {
        onToggleTotallyFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTotallyFullscreen, onToggleTotallyFullscreen, onClose]);

  // Format seconds into m:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className={`select-none transition-all duration-300 bg-black ${
        isTotallyFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen flex flex-col justify-between overflow-hidden animate-fadeIn'
          : 'relative w-full h-full flex flex-col justify-between overflow-hidden animate-fadeIn'
      }`}
    >
      {/* 1. Ambient Blurred Backdrop */}
      {coverUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-25 scale-125 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      )}

      {/* 2. Full-Space Visualizer Canvas Background */}
      <div
        className="absolute inset-0 z-0 cursor-pointer"
        onDoubleClick={onToggleTotallyFullscreen}
        title="Double-click to toggle totally fullscreen"
      >
        <Visualizer
          mode={visualizerMode === 'off' ? 'bars' : visualizerMode}
          isPlaying={isPlaying}
          accentColor={accentColor}
          isFullSpace={true}
        />
      </div>

      {/* 3. Floating Top Toolbar */}
      <div
        className={`relative z-20 flex items-center justify-between p-5 md:p-6 bg-gradient-to-b from-black/85 via-black/50 to-transparent transition-opacity duration-300 ${
          isTotallyFullscreen && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-md border border-white/10 transition-colors shadow-lg active:scale-95"
            title="Exit Visualizer (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Visualizer</span>
          </button>

          <button
            onClick={onToggleTotallyFullscreen}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-md border border-white/10 transition-colors shadow-lg active:scale-95"
            title={isTotallyFullscreen ? 'Exit Totally Fullscreen (Windowed)' : 'Enter Totally Fullscreen (F)'}
          >
            {isTotallyFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                <span>Windowed Space</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                <span>Totally Fullscreen</span>
              </>
            )}
          </button>
        </div>

        {/* Visualizer Mode Switcher */}
        <div className="flex items-center space-x-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg">
          {modes.map((m) => {
            const active = visualizerMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onChangeVisualizerMode(m.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  active
                    ? 'bg-[var(--accent-color)] text-white shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Content Overlay */}
      <div
        className={`relative z-20 flex flex-col justify-end transition-opacity duration-300 ${
          isTotallyFullscreen && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Fullscreen interactive timeline slider (visible when totally fullscreen) */}
        {isTotallyFullscreen && duration > 0 && onSeek && (
          <div className="px-8 sm:px-12 py-2 flex items-center space-x-3 text-xs font-mono text-zinc-300">
            <span>{formatTime(currentTime)}</span>
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                onSeek(pos * duration);
              }}
              className="relative flex-1 h-2 bg-white/20 rounded-full cursor-pointer overflow-hidden group py-1"
            >
              <div
                className="h-full bg-[var(--accent-color)] rounded-full transition-all group-hover:brightness-125"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        )}

        {/* Metadata & Controls Bar */}
        <div className="p-8 sm:p-12 flex flex-col md:flex-row items-end md:items-center justify-between gap-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
          <div className="flex items-center space-x-6 min-w-0 max-w-2xl">
            {/* Album Cover Art */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-zinc-900 border border-white/15 overflow-hidden shadow-2xl flex-shrink-0 flex items-center justify-center group">
              <Disc3 className="w-12 h-12 text-zinc-600" />
              {coverUrl && (
                <img
                  src={coverUrl}
                  alt=""
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              <button
                onClick={onTogglePlay}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                <div className="w-12 h-12 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center shadow-xl">
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-white" />
                  ) : (
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  )}
                </div>
              </button>
            </div>

            {/* Typography Metadata */}
            <div className="min-w-0 space-y-1.5">
              <h1
                className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight truncate drop-shadow-md"
                title={title}
              >
                {title}
              </h1>
              <p className="text-base sm:text-lg text-zinc-300 font-medium truncate drop-shadow" title={artist}>
                {artist}
              </p>
              {album && (
                <p className="text-xs sm:text-sm text-zinc-400 truncate" title={album}>
                  {album} {currentTrack?.year ? `(${currentTrack.year})` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Right Section: Lyrics and/or Fullscreen Controls */}
          <div className="flex items-center space-x-4">
            {/* In totally fullscreen mode: quick playback transport controls */}
            {isTotallyFullscreen && (
              <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-xl">
                {onPrevious && (
                  <button
                    onClick={onPrevious}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Previous"
                  >
                    <SkipBack className="w-4 h-4 fill-current" />
                  </button>
                )}

                <button
                  onClick={onTogglePlay}
                  className="w-9 h-9 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>

                {onNext && (
                  <button
                    onClick={onNext}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Next"
                  >
                    <SkipForward className="w-4 h-4 fill-current" />
                  </button>
                )}

                {onToggleMute && onVolumeChange && (
                  <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
                    <button
                      onClick={onToggleMute}
                      className="p-1.5 text-zinc-300 hover:text-white rounded-full transition-colors"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-red-400" />
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
                      className="w-16 h-1 accent-[var(--accent-color)] cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Floating Active Lyric Pill */}
            {activeLyric && (
              <div className="max-w-md text-right hidden md:block">
                <div className="inline-block px-4 py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-base sm:text-lg font-semibold tracking-wide shadow-2xl text-balance">
                  {activeLyric}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
