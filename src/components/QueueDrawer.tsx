import React from 'react';
import { X, Trash2, ListMusic, Play } from 'lucide-react';
import { TrackRecord } from '../types/music';
import { ArtistLinks } from './ArtistLinks';

interface QueueDrawerProps {
  queue: TrackRecord[];
  currentTrack: TrackRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayFromQueue: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onViewArtist?: (artistName: string) => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  queue,
  currentTrack,
  isOpen,
  onClose,
  onPlayFromQueue,
  onRemoveFromQueue,
  onClearQueue,
  onViewArtist,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-96 h-full bg-[#0d0f14]/95 backdrop-blur-md border-l border-white/10 flex flex-col z-30 select-none shadow-2xl flex-shrink-0 animate-fadeIn">
      {/* Spacious Header matching Track Details Drawer */}
      <div className="h-16 border-b border-white/10 px-5 flex items-center justify-between sticky top-0 bg-[#0d0f14]/95 backdrop-blur-md z-10 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/20 flex items-center justify-center">
            <ListMusic className="w-4 h-4 text-[var(--accent-color)]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-[14px] font-semibold text-white tracking-wide">
                Play Queue
              </span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                {queue.length}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">Up next in your session</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              title="Clear queue"
              className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close queue"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Now Playing Section */}
        {currentTrack && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs uppercase font-semibold tracking-wider text-[var(--accent-color)]">
                Now Playing
              </span>
            </div>
            <div className="flex items-center px-4 py-3.5 rounded-xl bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/25 shadow-sm">
              <div className="flex-1 truncate">
                <div className="font-bold text-white text-[14px] truncate leading-tight">
                  {currentTrack.title}
                </div>
                <div title={currentTrack.artist} className="text-[12px] text-zinc-300 font-normal truncate mt-1 leading-tight">
                  <ArtistLinks artists={currentTrack.artist} onSelectArtist={onViewArtist} />
                </div>
                <div className="text-[11px] text-zinc-400 truncate mt-0.5 font-mono">
                  {currentTrack.album || 'Unknown Album'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs uppercase font-semibold tracking-wider text-zinc-400">
              Up Next ({queue.length})
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <p className="font-medium text-zinc-300">Queue is empty</p>
              <p className="text-[11px]">Use the three-dot menu on any song to add it to your queue.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {queue.map((track, i) => (
                <div
                  key={`${track.id}_${i}`}
                  className="group flex items-center justify-between px-3.5 py-2.5 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                >
                  <button
                    onClick={() => onPlayFromQueue(i)}
                    className="flex-1 text-left truncate pr-2 flex items-center space-x-3 cursor-pointer"
                  >
                    <span className="w-5 text-xs text-zinc-500 font-mono tabular-nums flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-[13px] font-medium text-white group-hover:text-[var(--accent-color)] truncate transition-colors leading-tight">
                        {track.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5 leading-tight">
                        {track.artist}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onPlayFromQueue(i)}
                      title="Play this track"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => onRemoveFromQueue(i)}
                      title="Remove from queue"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
