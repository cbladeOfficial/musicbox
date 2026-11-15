import React, { useState } from 'react';
import {
  ArrowLeft,
  Tag,
  Save,
  Disc3,
  Cpu,
  Folder,
  Calendar,
  Hash,
  User,
  Music,
  Check,
} from 'lucide-react';
import { TrackRecord } from '../types/music';
import { getCoverUrl, formatBitrate } from '../utils/cover';

interface TrackEditFormViewProps {
  track: TrackRecord;
  streamPort: number;
  onSave: (updatedData: {
    title: string;
    artist: string;
    album: string;
    genre?: string;
    year?: number;
    trackNumber?: number;
  }) => void;
  onBack: () => void;
}

export const TrackEditFormView: React.FC<TrackEditFormViewProps> = ({
  track,
  streamPort,
  onSave,
  onBack,
}) => {
  const [title, setTitle] = useState(track.title || '');
  const [artist, setArtist] = useState(track.artist || '');
  const [album, setAlbum] = useState(track.album || '');
  const [genre, setGenre] = useState(track.genre || '');
  const [year, setYear] = useState<string>(track.year ? String(track.year) : '');
  const [trackNumber, setTrackNumber] = useState<string>(
    track.track_number ? String(track.track_number) : ''
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const coverSrc = getCoverUrl(track.cover_path, streamPort);
  const fileSizeMb = (track.file_size / (1024 * 1024)).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim() || track.title,
      artist: artist.trim() || track.artist,
      album: album.trim() || track.album,
      genre: genre.trim() || undefined,
      year: year ? parseInt(year, 10) : undefined,
      trackNumber: trackNumber ? parseInt(trackNumber, 10) : undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onBack();
    }, 400);
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
          <span className="text-sm font-medium">Back</span>
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
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Tags</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-3xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Track Banner & Overview */}
        <div className="p-6 rounded-xl bg-[var(--surface-color)] border border-[var(--border-color)] shadow-md flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5">
          <div className="w-32 h-32 rounded-lg bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Disc3 className="w-12 h-12 text-zinc-600" />
            )}
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-color)] bg-[var(--accent-color)]/10 px-2 py-0.5 rounded border border-[var(--accent-color)]/20 inline-block mb-1.5">
              Edit Track Tags
            </span>
            <h1 className="text-xl font-bold text-white truncate">{track.title}</h1>
            <p className="text-sm text-zinc-300 truncate mt-0.5">{track.artist}</p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{track.album}</p>

            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10 text-[11px] text-zinc-400">
              <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">
                {track.format}
              </span>
              {track.bitrate && (
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">
                  {formatBitrate(track.bitrate)}
                </span>
              )}
              {track.sample_rate && (
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">
                  {track.sample_rate} Hz
                </span>
              )}
              <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">
                {fileSizeMb} MB
              </span>
            </div>
          </div>
        </div>

        {/* Form Parameters */}
        <form onSubmit={handleSubmit} className="p-6 rounded-xl bg-[var(--surface-color)] border border-[var(--border-color)] shadow-md space-y-5">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Tag className="w-4 h-4 text-[var(--accent-color)]" />
            <span>Metadata Parameters</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                <Music className="w-3.5 h-3.5 text-zinc-400" />
                <span>Track Title</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black/40 text-sm text-white px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-zinc-500"
                placeholder="Track title"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Artist Name</span>
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full bg-black/40 text-sm text-white px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-zinc-500"
                  placeholder="Artist name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                  <Disc3 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Album Name</span>
                </label>
                <input
                  type="text"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  className="w-full bg-black/40 text-sm text-white px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-zinc-500"
                  placeholder="Album name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Genre</span>
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-black/40 text-sm text-white px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-zinc-500"
                  placeholder="e.g. Electronic, Rock"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Release Year</span>
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-black/40 text-sm text-white px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-zinc-500"
                  placeholder="e.g. 2024"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                  <Hash className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Track Number</span>
                </label>
                <input
                  type="number"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  className="w-full bg-black/40 text-sm text-white px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-zinc-500"
                  placeholder="e.g. 1"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-start space-x-2 text-xs text-zinc-400 break-all">
            <Folder className="w-4 h-4 flex-shrink-0 mt-0.5 text-zinc-500" />
            <span className="font-mono text-zinc-400">{track.path}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2 rounded-lg text-xs font-semibold bg-[var(--accent-color)] text-white hover:brightness-110 transition-opacity active:opacity-75 shadow-lg shadow-[var(--accent-color)]/25"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
