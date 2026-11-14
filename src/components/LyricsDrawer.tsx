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
    <aside className="w-80 h-full bg-[var(--surface-color)]/95 backdrop-blur-md border-l border-[var(--border-color)] flex flex-col z-30 select-none shadow-xl flex-shrink-0">
      {/* Drawer Header */}
      <div className="h-11 border-b border-[var(--border-color)] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Mic2 className="w-3.5 h-3.5 text-[var(--accent-color)]" />
          <span className="text-[11px] font-medium text-[var(--text-main)]">
            Lyrics
          </span>
          {lyrics?.synced && !preferPlain && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-color)]/15 text-[var(--accent-color)] font-medium border border-[var(--accent-color)]/20">
              Synced
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {lyrics?.plain && (
            <button
              onClick={() => setPreferPlain(!preferPlain)}
              title={preferPlain ? 'View Synced Karaoke' : 'View Plain Text'}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
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
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lyrics Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-3.5 text-center font-medium"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-[var(--text-muted)] space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-color)]" />
            <span>Finding lyrics on LRCLIB...</span>
          </div>
        ) : !lyrics ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-[var(--text-muted)] space-y-2">
            <Music2 className="w-6 h-6 opacity-30 stroke-1" />
            <span>No lyrics found for this track</span>
            <span className="text-[10px] opacity-70">
              {currentTrack?.title} - {currentTrack?.artist}
            </span>
          </div>
        ) : preferPlain || !lyrics.synced ? (
          <div className="whitespace-pre-line text-xs text-[var(--text-main)] leading-loose select-text font-sans opacity-90">
            {lyrics.plain || 'No plain text lyrics available.'}
          </div>
        ) : (
          lyrics.lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(line.time)}
                className={`py-2 px-3.5 rounded-lg transition-all duration-200 cursor-pointer text-sm leading-relaxed ${
                  isActive
                    ? 'text-white font-medium text-base bg-[var(--accent-color)]/15 ring-1 ring-[var(--accent-color)]/25'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
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
