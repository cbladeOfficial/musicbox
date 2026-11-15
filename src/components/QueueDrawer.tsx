import React from 'react';
import { X, Trash2, ListMusic, Play } from 'lucide-react';
import { TrackRecord } from '../types/music';

interface QueueDrawerProps {
  queue: TrackRecord[];
  currentTrack: TrackRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayFromQueue: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  queue,
  currentTrack,
  isOpen,
  onClose,
  onPlayFromQueue,
  onRemoveFromQueue,
  onClearQueue,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-84 h-full bg-[var(--surface-color)]/95 backdrop-blur-md border-l border-[var(--border-color)] flex flex-col z-30 select-none shadow-xl flex-shrink-0">
      {/* Header */}
      <div className="h-12 border-b border-[var(--border-color)] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ListMusic className="w-4 h-4 text-[var(--accent-color)]" />
          <span className="text-sm font-medium text-[var(--text-main)]">
            Play Queue
          </span>
          <span className="text-xs text-[var(--text-muted)] font-mono">({queue.length})</span>
        </div>

        <div className="flex items-center space-x-1">
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              title="Clear queue"
              className="p-1.5 rounded text-[var(--text-muted)] hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Now Playing section */}
        {currentTrack && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--accent-color)] px-1">
              Now Playing
            </span>
            <div className="flex items-center px-3.5 py-3 rounded-lg bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/30 shadow-sm">
              <div className="flex-1 truncate">
                <div className="font-medium text-white text-[14px] truncate">
                  {currentTrack.title}
                </div>
                <div className="text-[13px] text-zinc-300 font-normal truncate mt-0.5">
                  {currentTrack.artist}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-zinc-400 px-1">
            Up Next
          </span>
          {queue.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 italic">
              Queue is empty. Right click any track to add it to queue.
            </div>
          ) : (
            <div className="space-y-1">
              {queue.map((track, i) => (
                <div
                  key={`${track.id}_${i}`}
                  className="group flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/5 transition-colors"
                >
                  <button
                    onClick={() => onPlayFromQueue(i)}
                    className="flex-1 text-left truncate pr-2 flex items-center space-x-3"
                  >
                    <span className="w-5 text-xs text-zinc-500 font-mono tabular-nums">
                      {i + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-white font-medium text-[14px] truncate group-hover:text-[var(--accent-color)] transition-colors">
                        {track.title}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {track.artist}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onPlayFromQueue(i)}
                      className="p-1 rounded text-zinc-400 hover:text-white"
                      title="Play now"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => onRemoveFromQueue(i)}
                      className="p-1 rounded text-zinc-400 hover:text-rose-400"
                      title="Remove from queue"
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
