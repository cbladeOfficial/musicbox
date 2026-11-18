import React from 'react';
import { X, Trash2, ListMusic, Play, Sparkles, Plus, RotateCw } from 'lucide-react';
import { TrackRecord } from '../types/music';
import { ArtistLinks } from './ArtistLinks';

interface QueueDrawerProps {
  queue: TrackRecord[];
  autoQueue: TrackRecord[];
  currentTrack: TrackRecord | null;
  isOpen: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  activeAlbumName?: string;
  onClose: () => void;
  onPlayFromQueue: (index: number) => void;
  onPlayFromAutoQueue: (track: TrackRecord) => void;
  onAddAutoQueueToManualQueue: (track: TrackRecord) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onRefreshAutoQueue: () => void;
  onViewArtist?: (artistName: string) => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  queue,
  autoQueue,
  currentTrack,
  isOpen,
  repeatMode,
  isShuffle,
  activeAlbumName,
  onClose,
  onPlayFromQueue,
  onPlayFromAutoQueue,
  onAddAutoQueueToManualQueue,
  onRemoveFromQueue,
  onClearQueue,
  onRefreshAutoQueue,
  onViewArtist,
}) => {
  if (!isOpen) return null;

  const isAutoplayActive = repeatMode === 'all';

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
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                {queue.length + autoQueue.length}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">
              {queue.length > 0 ? `${queue.length} in queue • ` : ''}
              {autoQueue.length} smart auto-queue
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              title="Clear manual queue"
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
              <div className="flex items-center space-x-1.5">
                {activeAlbumName && (
                  <span
                    className="text-[10px] font-mono text-zinc-300 bg-white/10 px-2 py-0.5 rounded border border-white/15 truncate max-w-[150px]"
                    title={`Playing from album: ${activeAlbumName}${repeatMode === 'all' ? ' (Repeating Album)' : ''}`}
                  >
                    Album: {activeAlbumName}
                  </span>
                )}
                {isShuffle && (
                  <span className="text-[10px] font-mono text-[var(--accent-color)] bg-[var(--accent-color)]/15 px-2 py-0.5 rounded border border-[var(--accent-color)]/30">
                    Smart Shuffle On
                  </span>
                )}
              </div>
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

        {/* Up Next List (Manual Queue) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs uppercase font-semibold tracking-wider text-zinc-400">
              Up Next ({queue.length})
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-400 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <p className="font-medium text-zinc-300">Manual queue is empty</p>
              <p className="text-[11px] text-zinc-500">Add songs using the three-dot menu or from Smart Queue below.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {queue.map((track, i) => (
                <div
                  key={`manual_${track.id}_${i}`}
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

        {/* Smart Auto-Queue Section (Spotify-like Recommendations) */}
        {autoQueue.length > 0 ? (
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs uppercase font-semibold tracking-wider text-zinc-300">
                  Smart Queue ({autoQueue.length})
                </span>
              </div>
              <button
                onClick={onRefreshAutoQueue}
                title="Refresh smart recommendations"
                className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Autoplay Status Banner */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                isAutoplayActive
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : 'bg-white/[0.02] border-white/5 text-zinc-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAutoplayActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                  }`}
                />
                <span className="font-medium text-[11.5px]">
                  {isAutoplayActive ? 'Autoplay Active (Repeat All)' : 'Autoplay Paused'}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {isAutoplayActive ? 'Plays automatically' : 'Needs Repeat All'}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 px-1 leading-snug">
              {isAutoplayActive
                ? 'Spotify-style autoplay: will play seamlessly when your manual queue finishes.'
                : 'Auto-queue is ready! Select "Repeat All" to play automatically, or click any song below.'}
            </p>

            {/* List of Smart Recommendations */}
            <div className="space-y-1">
              {autoQueue.map((track, i) => (
                <div
                  key={`auto_${track.id}_${i}`}
                  className="group flex items-center justify-between px-3.5 py-2.5 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                >
                  <button
                    onClick={() => onPlayFromAutoQueue(track)}
                    className="flex-1 text-left truncate pr-2 flex items-center space-x-3 cursor-pointer"
                  >
                    <span className="w-5 text-xs text-amber-400/70 font-mono tabular-nums flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-[13px] font-medium text-white group-hover:text-[var(--accent-color)] truncate transition-colors leading-tight">
                        {track.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5 leading-tight flex items-center space-x-1.5">
                        <span className="truncate">{track.artist}</span>
                        {track.genre && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-[10px] text-zinc-400 font-mono truncate">{track.genre}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onPlayFromAutoQueue(track)}
                      title="Play this track now"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => onAddAutoQueueToManualQueue(track)}
                      title="Add to manual queue"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-amber-400 hover:bg-white/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2.5">
            <div className="flex items-center justify-center space-x-2 text-zinc-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Smart Queue</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {currentTrack
                ? 'Spotify-style recommendations based on artist, genre, and era.'
                : 'Play a track to generate smart auto-queue recommendations.'}
            </p>
            {currentTrack && (
              <button
                onClick={onRefreshAutoQueue}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-color)] text-white hover:brightness-110 transition-colors shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Generate Smart Queue</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
