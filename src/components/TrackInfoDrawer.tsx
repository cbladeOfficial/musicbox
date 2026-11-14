import React, { useEffect, useState } from 'react';
import { X, Disc3, Info, Sparkles, Folder, Calendar, Cpu } from 'lucide-react';
import { TrackRecord, ArtistInfo, AlbumInfo } from '../types/music';
import { MetadataService } from '../services/metadataService';

interface TrackInfoDrawerProps {
  currentTrack: TrackRecord | null;
  isOpen: boolean;
  onClose: () => void;
  lastfmApiKey: string;
  coverArtUrl?: string;
}

export const TrackInfoDrawer: React.FC<TrackInfoDrawerProps> = ({
  currentTrack,
  isOpen,
  onClose,
  lastfmApiKey,
  coverArtUrl,
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

  return (
    <div className="w-88 h-full bg-[var(--surface-color)] border-l border-[var(--border-color)] flex flex-col z-30 select-none shadow-xl overflow-y-auto">
      {/* Header */}
      <div className="h-12 border-b border-[var(--border-color)] px-4 flex items-center justify-between sticky top-0 bg-[var(--surface-color)]/95 backdrop-blur-md z-10">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-[var(--accent-color)]" />
          <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
            Track Details
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Artwork & Main Titles */}
        <div className="flex flex-col items-center text-center">
          <div className="w-44 h-44 rounded-lg overflow-hidden bg-[var(--surface-active)] border border-[var(--border-color)] shadow-md mb-3">
            {coverArtUrl || currentTrack.cover_path ? (
              <img
                src={coverArtUrl || `file://${currentTrack.cover_path}`}
                alt={currentTrack.album}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                <Disc3 className="w-16 h-16 opacity-30" />
              </div>
            )}
          </div>
          <h2 className="text-sm font-bold text-[var(--text-main)]">{currentTrack.title}</h2>
          <span className="text-xs text-[var(--text-muted)] mt-0.5">{currentTrack.artist}</span>
          <span className="text-xs text-[var(--text-muted)] opacity-80">{currentTrack.album}</span>
        </div>

        {/* Technical Specs */}
        <div className="space-y-2 p-3 rounded-lg bg-[var(--surface-active)]/50 border border-[var(--border-color)] text-xs">
          <div className="flex items-center space-x-1.5 text-[var(--accent-color)] font-semibold text-[11px] mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>Audio Specifications</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[var(--text-muted)]">Format: </span>
              <span className="font-mono text-[var(--text-main)]">{currentTrack.format}</span>
            </div>
            {currentTrack.bitrate && (
              <div>
                <span className="text-[var(--text-muted)]">Bitrate: </span>
                <span className="font-mono text-[var(--text-main)]">{Math.round(currentTrack.bitrate / 1000)} kbps</span>
              </div>
            )}
            {currentTrack.sample_rate && (
              <div>
                <span className="text-[var(--text-muted)]">Sample Rate: </span>
                <span className="font-mono text-[var(--text-main)]">{currentTrack.sample_rate} Hz</span>
              </div>
            )}
            {currentTrack.year ? (
              <div>
                <span className="text-[var(--text-muted)]">Year: </span>
                <span className="font-mono text-[var(--text-main)]">{currentTrack.year}</span>
              </div>
            ) : null}
            {currentTrack.genre ? (
              <div className="col-span-2">
                <span className="text-[var(--text-muted)]">Genre: </span>
                <span className="text-[var(--text-main)]">{currentTrack.genre}</span>
              </div>
            ) : null}
          </div>

          <div className="pt-1.5 border-t border-[var(--border-color)]/60 text-[10px] text-[var(--text-muted)] flex items-start space-x-1 break-all">
            <Folder className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="select-text">{currentTrack.path}</span>
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
            <span>Loading artist info from Last.fm...</span>
          </div>
        ) : (
          artistInfo && (
            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-semibold text-[var(--text-main)] block">
                About {currentTrack.artist}
              </span>
              {artistInfo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {artistInfo.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-active)] text-[var(--text-muted)] border border-[var(--border-color)]"
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
    </div>
  );
};
