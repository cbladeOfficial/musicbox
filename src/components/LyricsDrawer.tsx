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
    <aside className="w-84 h-full bg-[var(--surface-color)]/95 backdrop-blur-md border-l border-[var(--border-color)] flex flex-col z-30 select-none shadow-xl flex-shrink-0 animate-fadeIn">
      {/* Drawer Header */}
      <div className="h-12 border-b border-[var(--border-color)] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Mic2 className="w-4 h-4 text-[var(--accent-color)]" />
          <span className="text-sm font-medium text-[var(--text-main)]">
            Lyrics
          </span>
          {lyrics?.synced && !preferPlain && (
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-color)]/15 text-[var(--accent-color)] font-medium border border-[var(--accent-color)]/20">
              Synced
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {lyrics?.plain && (
            <button
              onClick={() => setPreferPlain(!preferPlain)}
              title={preferPlain ? 'View Synced Karaoke' : 'View Plain Text'}
              className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
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
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lyrics Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 text-center font-medium"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-sm text-[var(--text-muted)] space-y-2.5">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-color)]" />
            <span>Finding lyrics on LRCLIB...</span>
          </div>
        ) : !lyrics ? (
          <div className="h-full flex flex-col items-center justify-center text-sm text-[var(--text-muted)] space-y-2.5">
            <Music2 className="w-8 h-8 opacity-30 stroke-1" />
            <span>No lyrics found for this track</span>
            <span className="text-xs opacity-70">
              {currentTrack?.title} - {currentTrack?.artist}
            </span>
          </div>
        ) : preferPlain || !lyrics.synced ? (
          <div className="whitespace-pre-line text-sm text-[var(--text-main)] leading-loose select-text font-sans opacity-90">
            {lyrics.plain || 'No plain text lyrics available.'}
          </div>
        ) : (
          lyrics.lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;
            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(line.time)}
                className={`py-2 px-3.5 rounded-lg transition-all duration-300 cursor-pointer leading-relaxed text-center select-none ${
                  isActive
                    ? 'text-white font-bold text-lg bg-[var(--accent-color)]/20 ring-1 ring-[var(--accent-color)]/30 shadow-md scale-[1.02]'
                    : isPast
                    ? 'text-zinc-400 opacity-75 hover:opacity-100 hover:text-white text-sm'
                    : 'text-zinc-500 opacity-50 hover:opacity-100 hover:text-white text-sm'
                }`}
              >
                {line.text}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
