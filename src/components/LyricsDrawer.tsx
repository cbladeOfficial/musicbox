import React, { useEffect, useRef, useState } from 'react';
import { X, Mic2, RefreshCw, FileText, Loader2, Music2 } from 'lucide-react';
import { LyricsData, TrackRecord } from '../types/music';
import { LyricsService } from '../services/lyricsService';

interface LyricsDrawerProps {
  currentTrack: TrackRecord | null;
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
  onSeek: (time: number) => void;
}

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({
  currentTrack,
  currentTime,
  isOpen,
  onClose,
  onSeek,
}) => {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [preferPlain, setPreferPlain] = useState(false);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch lyrics whenever currentTrack changes
  useEffect(() => {
    if (!currentTrack || !isOpen) return;

    setLoading(true);
    LyricsService.fetchLyrics(currentTrack)
      .then((data) => {
        setLyrics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentTrack, isOpen]);

  // Find active line index
  let activeIndex = -1;
  if (lyrics?.synced && lyrics.lines.length > 0) {
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (currentTime >= lyrics.lines[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  // Smooth auto-scroll to keep active line centered
  useEffect(() => {
    if (activeLineRef.current && containerRef.current && lyrics?.synced && !preferPlain) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, lyrics, preferPlain]);

  if (!isOpen) return null;

  return (
    <aside className="w-96 h-full bg-[#0d0f14]/95 backdrop-blur-md border-l border-white/10 flex flex-col z-30 select-none shadow-2xl flex-shrink-0 animate-fadeIn">
      {/* Spacious Drawer Header matching Track Info & Queue Drawers */}
      <div className="h-16 border-b border-white/10 px-5 flex items-center justify-between sticky top-0 bg-[#0d0f14]/95 backdrop-blur-md z-10 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/20 flex items-center justify-center">
            <Mic2 className="w-4 h-4 text-[var(--accent-color)]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-[14px] font-semibold text-white tracking-wide">
                Lyrics
              </span>
              {lyrics?.synced && !preferPlain && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-color)]/20 text-[var(--accent-color)] font-bold border border-[var(--accent-color)]/30">
                  Synced
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400">Karaoke words & translation</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {lyrics?.plain && (
            <button
              onClick={() => setPreferPlain(!preferPlain)}
              title={preferPlain ? 'View Synced Karaoke' : 'View Plain Text'}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              if (currentTrack) {
                setLoading(true);
                localStorage.removeItem(`mb_lyrics_${currentTrack.id}`);
                LyricsService.fetchLyrics(currentTrack).then((d) => {
                  setLyrics(d);
                  setLoading(false);
                });
              }
            }}
            title="Reload lyrics from LRCLIB"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onClose}
            title="Close lyrics"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lyrics Content with comfortable breathing room */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 text-center font-medium"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-color)]" />
            <span className="text-xs">Searching LRCLIB for synced lyrics...</span>
          </div>
        ) : !lyrics ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 text-zinc-400">
            <Music2 className="w-12 h-12 stroke-1 opacity-40 text-zinc-500" />
            <p className="text-sm font-medium text-zinc-200">No lyrics available</p>
            <p className="text-xs text-zinc-400 max-w-xs">
              No synced or plain lyrics found for "{currentTrack?.title}" on LRCLIB.
            </p>
          </div>
        ) : lyrics.synced && !preferPlain ? (
          <div className="space-y-4 py-8">
            {lyrics.lines.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek(line.time)}
                  className={`cursor-pointer transition-all duration-300 py-1 px-3 rounded-lg ${
                    isActive
                      ? 'text-white font-bold text-xl scale-105 filter drop-shadow'
                      : isPast
                      ? 'text-zinc-400 text-base opacity-75 hover:opacity-100'
                      : 'text-zinc-400 text-base opacity-50 hover:opacity-90'
                  }`}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-left text-sm text-zinc-200 leading-loose whitespace-pre-line p-3 select-text font-normal">
            {lyrics.plain}
          </div>
        )}
      </div>
    </aside>
  );
};
