import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Disc3,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Radio as RadioIcon,
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
  currentTime: number;
  duration: number;
  lyricsData?: LyricsData | null;
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
  currentTime,
  duration,
  lyricsData,
}) => {
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

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black select-none animate-fadeIn">
      {/* 1. Ambient Blurred Backdrop */}
      {coverUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 scale-125 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      )}

      {/* 2. Full-Space Visualizer Canvas Background */}
      <div className="absolute inset-0 z-0">
        <Visualizer
          mode={visualizerMode === 'off' ? 'bars' : visualizerMode}
          isPlaying={isPlaying}
          accentColor={accentColor}
          isFullSpace={true}
        />
      </div>

      {/* 3. Floating Top Toolbar */}
      <div className="relative z-20 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button
          onClick={onClose}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-md border border-white/10 transition-colors shadow-lg"
          title="Exit Full Visualizer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Visualizer</span>
        </button>

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

      {/* 4. Center / Bottom Content: Album Art & Track Info Overlay */}
      <div className="relative z-20 p-8 sm:p-12 flex flex-col md:flex-row items-end md:items-center justify-between gap-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="flex items-center space-x-6 min-w-0 max-w-2xl">
          {/* Album Cover Art */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-zinc-900 border border-white/15 overflow-hidden shadow-2xl flex-shrink-0 flex items-center justify-center group">
            {coverUrl ? (
              <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
            ) : currentRadio ? (
              <RadioIcon className="w-16 h-16 text-zinc-600" />
            ) : (
              <Disc3 className="w-16 h-16 text-zinc-600" />
            )}

            <button
              onClick={onTogglePlay}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center shadow-xl">
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
              </div>
            </button>
          </div>

          {/* Typography Metadata */}
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight truncate drop-shadow-md" title={title}>
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

        {/* Floating Active Lyric Display */}
        {activeLyric && (
          <div className="max-w-md text-right hidden md:block">
            <div className="inline-block px-4 py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-base sm:text-lg font-semibold tracking-wide shadow-2xl text-balance">
              {activeLyric}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
