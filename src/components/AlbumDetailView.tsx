import React, { useEffect, useState } from 'react';
import { Play, Shuffle, Disc3, Clock, Sparkles, ArrowLeft } from 'lucide-react';
import { AlbumItem } from './AlbumGrid';
import { TrackRecord, AlbumInfo } from '../types/music';
import { MetadataService } from '../services/metadataService';
import { getCoverUrl } from '../utils/cover';

interface AlbumDetailViewProps {
  album: AlbumItem;
  streamPort: number;
  onBack: () => void;
  onPlayTrack: (track: TrackRecord) => void;
  onPlayAlbum: (album: AlbumItem, shuffle?: boolean) => void;
  currentTrackId?: number;
  lastfmApiKey: string;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({
  album,
  streamPort,
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
  const coverSrc = getCoverUrl(album.coverPath, streamPort, albumInfo?.coverUrl);

  return (
    <div className="flex-1 overflow-y-auto select-none p-6 space-y-6 bg-[var(--bg-color)]">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1.5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Albums</span>
      </button>

      {/* Album Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
        <div className="w-52 h-52 rounded-lg bg-zinc-900 border border-white/10 shadow-2xl flex-shrink-0 overflow-hidden">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={album.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600">
              <Disc3 className="w-16 h-16 stroke-1" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <span className="text-[11px] uppercase font-bold text-[var(--accent-color)] tracking-wider">
            Album
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {album.name}
          </h1>
          <div className="text-base font-semibold text-zinc-300">
            {album.artist}
          </div>
          <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono tabular-nums">
            {album.year ? <span>{album.year}</span> : null}
            {album.year ? <span>•</span> : null}
            <span>{album.trackCount} tracks</span>
            <span>•</span>
            <span>{mins} mins</span>
          </div>

          <div className="flex items-center space-x-3 pt-3">
            <button
              onClick={() => onPlayAlbum(album, false)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-md bg-[var(--accent-color)] hover:brightness-110 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Album</span>
            </button>
            <button
              onClick={() => onPlayAlbum(album, true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-all"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Album Wiki Summary */}
      {loading ? (
        <div className="flex items-center space-x-2 text-xs text-zinc-400">
          <Sparkles className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
          <span>Fetching album description from Last.fm / iTunes...</span>
        </div>
      ) : (
        albumInfo?.summary && (
          <div className="p-4 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] text-xs text-zinc-300 leading-relaxed select-text">
            <span className="text-[11px] font-bold text-white block mb-1 uppercase tracking-wider">
              About this Album
            </span>
            <p>{albumInfo.summary}</p>
          </div>
        )
      )}

      {/* Tracks Table */}
      <div className="rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] divide-y divide-white/[0.04] overflow-hidden">
        <div className="h-9 px-4 flex items-center text-[11px] font-bold text-zinc-400 uppercase tracking-wider bg-[var(--sidebar-color)] border-b border-[var(--border-color)]">
          <div className="w-8">#</div>
          <div className="flex-1">Title</div>
          <div className="w-16 text-right pr-2">
            <Clock className="w-3.5 h-3.5 inline" />
          </div>
        </div>
        {album.tracks.map((t, idx) => (
          <div
            key={t.id}
            onDoubleClick={() => onPlayTrack(t)}
            className={`flex items-center px-4 py-2.5 text-[13px] hover:bg-white/[0.04] cursor-pointer transition-colors ${
              currentTrackId === t.id ? 'text-[var(--accent-color)] font-semibold bg-[var(--accent-color)]/10' : 'text-zinc-200'
            }`}
          >
            <div className="w-8 text-zinc-500 font-mono text-[12px] tabular-nums">
              {t.track_number || idx + 1}
            </div>
            <div className="flex-1 truncate font-medium text-white">{t.title}</div>
            <div className="w-16 text-right text-zinc-400 font-mono text-[12px] tabular-nums pr-2">
              {Math.floor(t.duration / 60)}:{(Math.floor(t.duration % 60)).toString().padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
