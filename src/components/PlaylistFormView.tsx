import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ListMusic,
  Save,
  X,
  Search,
  Check,
  Music2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { TrackRecord, PlaylistRecord } from '../types/music';

interface PlaylistFormViewProps {
  playlistToEdit?: PlaylistRecord | null;
  existingPlaylistTrackIds?: number[];
  allTracks: TrackRecord[];
  onSave: (data: {
    name: string;
    description: string;
    trackIds: number[];
  }) => void;
  onBack: () => void;
}

function formatDuration(sec: number): string {
  if (!sec || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const PlaylistFormView: React.FC<PlaylistFormViewProps> = ({
  playlistToEdit,
  existingPlaylistTrackIds = [],
  allTracks,
  onSave,
  onBack,
}) => {
  const isEditing = !!playlistToEdit;
  const [name, setName] = useState(playlistToEdit?.name || '');
  const [description, setDescription] = useState('');
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(
    new Set(existingPlaylistTrackIds)
  );
  const [trackSearch, setTrackSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Filtered tracks for the track picker
  const filteredTracks = useMemo(() => {
    if (!trackSearch.trim()) return allTracks;
    const q = trackSearch.toLowerCase();
    return allTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
    );
  }, [allTracks, trackSearch]);

  // Selected tracks summary calculation
  const selectedStats = useMemo(() => {
    let totalSec = 0;
    allTracks.forEach((t) => {
      if (selectedTrackIds.has(t.id)) {
        totalSec += t.duration || 0;
      }
    });
    const mins = Math.round(totalSec / 60);
    return {
      count: selectedTrackIds.size,
      totalMinutes: mins,
    };
  }, [allTracks, selectedTrackIds]);

  const toggleTrack = (id: number) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      filteredTracks.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedTrackIds(new Set());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for the playlist.');
      return;
    }
    setError(null);
    onSave({
      name: name.trim(),
      description: description.trim(),
      trackIds: Array.from(selectedTrackIds),
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto select-none bg-[var(--bg-color)] animate-fadeIn">
      {/* Top sticky navigation toolbar */}
      <div className="h-14 border-b border-[var(--border-color)] px-6 flex items-center justify-between sticky top-0 bg-[var(--bg-color)]/95 backdrop-blur-md z-20">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors duration-150 group px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 transition-opacity group-hover:opacity-80" />
          <span className="text-sm font-medium">Back to Playlists</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            className="flex items-center space-x-2 px-5 py-1.5 rounded-md text-xs font-semibold bg-[var(--accent-color)] text-white hover:brightness-110 transition-opacity active:opacity-75 shadow-md shadow-[var(--accent-color)]/20"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Save Playlist' : 'Create Playlist'}</span>
          </button>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="max-w-4xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Header section with icon */}
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-color)]/20 to-[var(--accent-color)]/5 border border-[var(--accent-color)]/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--accent-color)]/10">
            <ListMusic className="w-8 h-8 text-[var(--accent-color)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isEditing ? `Edit Playlist "${playlistToEdit.name}"` : 'Create New Playlist'}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {isEditing
                ? 'Update playlist title, notes, and customize included tracks.'
                : 'Build a personalized collection from your indexed library tracks.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <X className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Basic Parameters Card */}
        <div className="p-6 rounded-xl bg-[var(--surface-color)] border border-[var(--border-color)] shadow-md space-y-5">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-[11px] text-zinc-400">
            Playlist Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Playlist Name <span className="text-[var(--accent-color)]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Chill Synthwave, Night Drive, Workout Beats..."
                className="w-full bg-black/40 text-sm text-white px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-zinc-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Description / Notes <span className="text-zinc-500 text-[11px]">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a brief note or description for this playlist..."
                rows={2}
                className="w-full bg-black/40 text-sm text-white px-3.5 py-2 rounded-lg border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-zinc-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Track Picker Card */}
        <div className="p-6 rounded-xl bg-[var(--surface-color)] border border-[var(--border-color)] shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Music2 className="w-4 h-4 text-[var(--accent-color)]" />
                <h2 className="text-sm font-semibold text-white">Select Tracks from Library</h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {selectedStats.count} track{selectedStats.count === 1 ? '' : 's'} selected
                {selectedStats.totalMinutes > 0 ? ` • ~${selectedStats.totalMinutes} mins total` : ''}
              </p>
            </div>

            {/* Track search bar & quick actions */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={trackSearch}
                  onChange={(e) => setTrackSearch(e.target.value)}
                  placeholder="Filter tracks..."
                  className="bg-black/40 text-xs text-white pl-8 pr-3 py-1.5 rounded-md border border-[var(--border-color)] focus:border-[var(--accent-color)] outline-none placeholder-zinc-500 w-44 md:w-56"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1.5 rounded text-xs bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors whitespace-nowrap"
              >
                Select Filtered
              </button>
              {selectedTrackIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1.5 rounded text-xs bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-rose-400 border border-white/5 transition-colors whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Tracks list */}
          <div className="border border-white/10 rounded-lg overflow-hidden divide-y divide-white/5 max-h-96 overflow-y-auto bg-black/20">
            {allTracks.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No tracks indexed yet. Add a music folder first to pick tracks.
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No tracks match "{trackSearch}"
              </div>
            ) : (
              filteredTracks.map((track) => {
                const isSelected = selectedTrackIds.has(track.id);
                return (
                  <div
                    key={track.id}
                    onClick={() => toggleTrack(track.id)}
                    className={`flex items-center px-4 py-2 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-color)]/10 text-white font-medium'
                        : 'hover:bg-white/[0.04] text-zinc-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center mr-3 flex-shrink-0 transition-all ${
                        isSelected
                          ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white'
                          : 'border-zinc-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    {/* Track Title & Artist */}
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="truncate font-medium text-zinc-100">{track.title}</div>
                      <div className="truncate text-[11px] text-zinc-400">{track.artist} • {track.album}</div>
                    </div>

                    {/* Format Badge */}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-mono border border-white/5 mr-3 hidden sm:inline-block">
                      {track.format}
                    </span>

                    {/* Duration */}
                    <div className="w-14 text-right text-zinc-400 font-mono text-xs tabular-nums flex items-center justify-end space-x-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Save Bar at Bottom */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            className="flex items-center space-x-2 px-6 py-2 rounded-lg text-xs font-semibold bg-[var(--accent-color)] text-white hover:brightness-110 transition-opacity active:opacity-75 shadow-lg shadow-[var(--accent-color)]/25"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Save Playlist' : 'Create Playlist'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
