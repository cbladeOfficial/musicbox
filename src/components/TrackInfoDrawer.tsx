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
      <div className="h-11 border-b border-[var(--border-color)] px-4 flex items-center justify-between sticky top-0 bg-[var(--surface-color)]/95 backdrop-blur-md z-10">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-[var(--accent-color)]" />
          <span className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-wider">
            Track Details & Specs
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Artwork & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-44 h-44 rounded bg-[var(--surface-active)] border border-[var(--border-color)] shadow-md mb-3 overflow-hidden">
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
          <h2 className="text-sm font-bold text-[var(--text-main)] tracking-tight">{currentTrack.title}</h2>
          <span className="text-xs text-[var(--text-muted)] mt-0.5">{currentTrack.artist}</span>
          <span className="text-[11px] text-[var(--text-muted)] opacity-80">{currentTrack.album}</span>
        </div>

        {/* Technical Specs */}
        <div className="space-y-2 p-3 rounded bg-[var(--surface-active)]/50 border border-[var(--border-color)] text-xs">
          <div className="flex items-center space-x-1.5 text-[var(--accent-color)] font-semibold text-[11px] mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>Audio Specifications</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[var(--text-muted)]">Codec: </span>
              <span className="font-mono text-[var(--text-main)]">{currentTrack.format}</span>
            </div>
            {currentTrack.bitrate && (
              <div>
                <span className="text-[var(--text-muted)]">Bitrate: </span>
                <span className="font-mono text-[var(--text-main)] tabular-nums">{Math.round(currentTrack.bitrate / 1000)} kbps</span>
              </div>
            )}
            {currentTrack.sample_rate && (
              <div>
                <span className="text-[var(--text-muted)]">Sample Rate: </span>
                <span className="font-mono text-[var(--text-main)] tabular-nums">{currentTrack.sample_rate} Hz</span>
              </div>
            )}
            {currentTrack.year ? (
              <div>
                <span className="text-[var(--text-muted)]">Year: </span>
                <span className="font-mono text-[var(--text-main)] tabular-nums">{currentTrack.year}</span>
              </div>
            ) : null}
            <div>
              <span className="text-[var(--text-muted)]">File Size: </span>
              <span className="font-mono text-[var(--text-main)] tabular-nums">{fileSizeMb} MB</span>
            </div>
            {currentTrack.genre ? (
              <div>
                <span className="text-[var(--text-muted)]">Genre: </span>
                <span className="text-[var(--text-main)]">{currentTrack.genre}</span>
              </div>
            ) : null}
          </div>

          <div className="pt-2 border-t border-[var(--border-color)]/60 text-[10px] text-[var(--text-muted)] flex items-start space-x-1.5 break-all">
            <Folder className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-60" />
            <span className="select-text font-mono opacity-80">{currentTrack.path}</span>
          </div>
        </div>

        {/* Album Description */}
        {albumInfo?.summary && (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center space-x-1.5 text-[var(--text-main)] font-semibold text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent-color)]" />
              <span>About the Album ({currentTrack.album})</span>
            </div>
            <p className="text-[var(--text-muted)] leading-relaxed select-text">
              {albumInfo.summary}
            </p>
          </div>
        )}

        {/* Artist Biography from Last.fm */}
        {loading ? (
          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)]" />
            <span>Loading artist biography from Last.fm...</span>
          </div>
        ) : (
          artistInfo && (
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-1.5 text-[var(--text-main)] font-semibold text-[11px]">
                <Tag className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                <span>About {currentTrack.artist}</span>
              </div>
              {artistInfo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {artistInfo.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-active)] text-[var(--text-muted)] border border-[var(--border-color)] font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[var(--text-muted)] leading-relaxed select-text">
                {artistInfo.bio}
              </p>
            </div>
          )
        )}
      </div>
    </aside>
  );
};
