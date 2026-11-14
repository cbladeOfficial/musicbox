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
    <div className="w-80 h-full bg-[var(--surface-color)] border-l border-[var(--border-color)] flex flex-col z-30 select-none shadow-xl">
      {/* Header */}
      <div className="h-12 border-b border-[var(--border-color)] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ListMusic className="w-4 h-4 text-[var(--accent-color)]" />
          <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
            Play Queue
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">({queue.length})</span>
        </div>

        <div className="flex items-center space-x-1">
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              title="Clear queue"
              className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Now Playing section */}
        {currentTrack && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--accent-color)] px-2">
              Now Playing
            </span>
            <div className="flex items-center px-2 py-2 rounded-md bg-[var(--surface-active)] text-xs">
              <div className="flex-1 truncate">
                <div className="font-semibold text-[var(--text-main)] truncate">
                  {currentTrack.title}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">
                  {currentTrack.artist}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] px-2">
            Up Next
          </span>
          {queue.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)] italic">
              Queue is empty. Right-click or use action menu on any song to add it to the queue.
            </div>
          ) : (
            <div className="space-y-0.5">
              {queue.map((track, i) => (
                <div
                  key={`${track.id}_${i}`}
                  className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[var(--surface-hover)] text-xs transition-colors"
                >
                  <button
                    onClick={() => onPlayFromQueue(i)}
                    className="flex-1 text-left truncate pr-2 flex items-center space-x-2"
                  >
                    <span className="w-4 text-[10px] text-[var(--text-muted)] font-mono">
                      {i + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-[var(--text-main)] font-medium truncate">
                        {track.title}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        {track.artist}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onPlayFromQueue(i)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      title="Play now"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                    <button
                      onClick={() => onRemoveFromQueue(i)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-red-400"
                      title="Remove from queue"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
