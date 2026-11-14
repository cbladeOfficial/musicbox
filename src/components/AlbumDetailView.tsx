import React, { useEffect, useState } from 'react';
import { Play, Shuffle, Disc3, Clock, Sparkles } from 'lucide-react';
import { AlbumItem } from './AlbumGrid';
import { TrackRecord, AlbumInfo } from '../types/music';
import { MetadataService } from '../services/metadataService';

interface AlbumDetailViewProps {
  album: AlbumItem;
  onBack: () => void;
  onPlayTrack: (track: TrackRecord) => void;
  onPlayAlbum: (album: AlbumItem, shuffle?: boolean) => void;
  currentTrackId?: number;
  lastfmApiKey: string;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({
  album,
  onBack,
  onPlayTrack,
  onPlayAlbum,
  currentTrackId,
  lastfmApiKey,
}) => {
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    MetadataService.getAlbumDetails(album.artist, album.name, lastfmApiKey).then((info) => {
      setAlbumInfo(info);
      setLoading(false);
    });
  }, [album, lastfmApiKey]);

  const totalDuration = album.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const mins = Math.floor(totalDuration / 60);

  return (
    <div className="flex-1 overflow-y-auto select-none p-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center space-x-1"
      >
        <span>← Back to all albums</span>
      </button>

      {/* Album Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
        <div className="w-48 h-48 rounded-xl overflow-hidden bg-[var(--surface-active)] border border-[var(--border-color)] shadow-xl flex-shrink-0">
          {albumInfo?.coverUrl || album.coverPath ? (
            <img
              src={albumInfo?.coverUrl || `file://${album.coverPath}`}
              alt={album.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
              <Disc3 className="w-16 h-16 opacity-30" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <span className="text-[10px] uppercase font-bold text-[var(--accent-color)] tracking-wider">
            Album
          </span>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            {album.name}
          </h1>
          <div className="text-sm font-semibold text-[var(--text-muted)]">
            {album.artist}
          </div>
          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] font-mono">
            {album.year ? <span>{album.year}</span> : null}
            {album.year ? <span>•</span> : null}
            <span>{album.trackCount} tracks</span>
            <span>•</span>
            <span>{mins} mins</span>
          </div>

          <div className="flex items-center space-x-3 pt-3">
            <button
              onClick={() => onPlayAlbum(album, false)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[var(--accent-color)] hover:bg-[var(--feishin-accentHover)] text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Album</span>
            </button>
            <button
              onClick={() => onPlayAlbum(album, true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-medium transition-all"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Album Wiki Summary */}
      {loading ? (
        <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
          <Sparkles className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)]" />
          <span>Fetching album description...</span>
        </div>
      ) : (
        albumInfo?.summary && (
          <div className="p-4 rounded-lg bg-[var(--surface-color)]/50 border border-[var(--border-color)] text-xs text-[var(--text-muted)] leading-relaxed select-text">
            <span className="text-[11px] font-semibold text-[var(--text-main)] block mb-1">
              About this Album
            </span>
            {albumInfo.summary}
          </div>
        )
      )}

      {/* Tracks Table */}
      <div className="rounded-lg bg-[var(--surface-color)]/30 border border-[var(--border-color)] divide-y divide-[var(--border-color)]/40 overflow-hidden">
        <div className="h-8 px-4 flex items-center text-[10px] font-semibold text-[var(--text-muted)] uppercase bg-[var(--surface-color)]/60">
          <div className="w-8">#</div>
          <div className="flex-1">Title</div>
          <div className="w-16 text-right pr-2">
            <Clock className="w-3 h-3 inline" />
          </div>
        </div>
        {album.tracks.map((t, idx) => (
          <div
            key={t.id}
            onDoubleClick={() => onPlayTrack(t)}
            className={`flex items-center px-4 py-2 text-xs hover:bg-[var(--surface-hover)] cursor-pointer ${
              currentTrackId === t.id ? 'text-[var(--accent-color)] font-semibold' : 'text-[var(--text-main)]'
            }`}
          >
            <div className="w-8 text-[var(--text-muted)] font-mono text-[11px]">
              {t.track_number || idx + 1}
            </div>
            <div className="flex-1 truncate font-medium">{t.title}</div>
            <div className="w-16 text-right text-[var(--text-muted)] font-mono text-[11px] pr-2">
              {Math.floor(t.duration / 60)}:{(Math.floor(t.duration % 60)).toString().padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
