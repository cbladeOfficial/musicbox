import React, { useEffect, useState } from 'react';
import { X, Disc3, Info, Sparkles, Folder, Calendar, Cpu, Tag } from 'lucide-react';
import { TrackRecord, ArtistInfo, AlbumInfo } from '../types/music';
import { MetadataService } from '../services/metadataService';
import { getCoverUrl } from '../utils/cover';

interface TrackInfoDrawerProps {
  currentTrack: TrackRecord | null;
  isOpen: boolean;
  onClose: () => void;
  lastfmApiKey: string;
  coverArtUrl?: string;
  streamPort: number;
}

export const TrackInfoDrawer: React.FC<TrackInfoDrawerProps> = ({
  currentTrack,
  isOpen,
  onClose,
  lastfmApiKey,
  coverArtUrl,
  streamPort,
}) => {
  const [artistInfo, setArtistInfo] = useState<ArtistInfo | null>(null);
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentTrack || !isOpen) return;

    setLoading(true);
    Promise.all([
      MetadataService.getArtistDetails(currentTrack.artist, lastfmApiKey),
      MetadataService.getAlbumDetails(currentTrack.artist, currentTrack.album, lastfmApiKey),
    ]).then(([artist, album]) => {
      setArtistInfo(artist);
      setAlbumInfo(album);
      setLoading(false);
    });
  }, [currentTrack, isOpen, lastfmApiKey]);

  if (!isOpen || !currentTrack) return null;

  const coverSrc = getCoverUrl(currentTrack.cover_path, streamPort, coverArtUrl);
  const fileSizeMb = (currentTrack.file_size / (1024 * 1024)).toFixed(2);

  return (
    <aside className="w-88 h-full bg-[var(--surface-color)]/95 backdrop-blur-md border-l border-[var(--border-color)] flex flex-col z-30 select-none shadow-xl overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="h-12 border-b border-[var(--border-color)] px-4 flex items-center justify-between sticky top-0 bg-[var(--surface-color)]/95 backdrop-blur-md z-10">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-[var(--accent-color)]" />
          <span className="text-sm font-medium text-[var(--text-main)]">
            Track Details & Specs
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Artwork & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-48 h-48 rounded-lg bg-[var(--surface-active)] border border-[var(--border-color)] shadow-md mb-3 overflow-hidden">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt={currentTrack.album}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                <Disc3 className="w-16 h-16 opacity-30" />
              </div>
            )}
          </div>
          <h2 className="text-base font-semibold text-white">{currentTrack.title}</h2>
          <span className="text-sm font-medium text-zinc-300 mt-0.5">{currentTrack.artist}</span>
          <span className="text-xs text-zinc-400 mt-0.5">{currentTrack.album}</span>
        </div>

        {/* Technical Specs */}
        <div className="space-y-3 p-4 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] text-xs shadow-sm">
          <div className="flex items-center space-x-2 text-[var(--accent-color)] font-medium text-xs mb-1">
            <Cpu className="w-4 h-4" />
            <span>Audio Specifications</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-zinc-400">Codec: </span>
              <span className="font-mono text-white font-medium">{currentTrack.format}</span>
            </div>
            {currentTrack.bitrate && (
              <div>
                <span className="text-zinc-400">Bitrate: </span>
                <span className="font-mono text-white tabular-nums font-medium">{Math.round(currentTrack.bitrate / 1000)} kbps</span>
              </div>
            )}
            {currentTrack.sample_rate && (
              <div>
                <span className="text-zinc-400">Sample Rate: </span>
                <span className="font-mono text-white tabular-nums font-medium">{currentTrack.sample_rate} Hz</span>
              </div>
            )}
            {currentTrack.year ? (
              <div>
                <span className="text-zinc-400">Year: </span>
                <span className="font-mono text-white tabular-nums font-medium">{currentTrack.year}</span>
              </div>
            ) : null}
            <div>
              <span className="text-zinc-400">File Size: </span>
              <span className="font-mono text-white tabular-nums font-medium">{fileSizeMb} MB</span>
            </div>
            {currentTrack.genre ? (
              <div>
                <span className="text-zinc-400">Genre: </span>
                <span className="text-white font-medium">{currentTrack.genre}</span>
              </div>
            ) : null}
          </div>

          <div className="pt-2.5 border-t border-white/10 text-xs text-zinc-400 flex items-start space-x-2 break-all">
            <Folder className="w-4 h-4 flex-shrink-0 mt-0.5 text-zinc-500" />
            <span className="select-text font-mono text-zinc-300">{currentTrack.path}</span>
          </div>
        </div>

        {/* Album Description */}
        {albumInfo?.summary && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-[var(--text-main)] font-medium text-xs">
              <Calendar className="w-4 h-4 text-[var(--accent-color)]" />
              <span>About the Album ({currentTrack.album})</span>
            </div>
            <p className="text-zinc-300 text-[13px] leading-relaxed select-text">
              {albumInfo.summary}
            </p>
          </div>
        )}

        {/* Artist Biography from Last.fm / Deezer */}
        {loading ? (
          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
            <Sparkles className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
            <span>Loading artist biography from Last.fm...</span>
          </div>
        ) : (
          artistInfo && (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center space-x-2.5 text-[var(--text-main)] font-medium text-xs">
                {artistInfo.image ? (
                  <img
                    src={artistInfo.image}
                    alt={currentTrack.artist}
                    className="w-6 h-6 rounded-full object-cover border border-white/20 shadow-sm"
                  />
                ) : (
                  <Tag className="w-4 h-4 text-[var(--accent-color)]" />
                )}
                <span className="text-sm font-semibold">About {currentTrack.artist}</span>
              </div>
              {artistInfo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {artistInfo.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded bg-[var(--surface-active)] text-zinc-300 border border-[var(--border-color)] font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              {artistInfo.bio && (
                <p className="text-zinc-300 text-[13px] leading-relaxed select-text">
                  {artistInfo.bio}
                </p>
              )}
            </div>
          )
        )}
      </div>
    </aside>
  );
};
