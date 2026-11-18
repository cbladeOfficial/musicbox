import React, { useEffect, useState } from 'react';
import { X, Disc3, Info, Sparkles, Folder, Calendar, Cpu, Tag } from 'lucide-react';
import { TrackRecord, ArtistInfo, AlbumInfo, AlbumArtMode } from '../types/music';
import { MetadataService } from '../services/metadataService';
import { getCoverUrl, formatBitrate } from '../utils/cover';
import { ArtistLinks } from './ArtistLinks';

interface TrackInfoDrawerProps {
  currentTrack: TrackRecord | null;
  isOpen: boolean;
  onClose: () => void;
  lastfmApiKey: string;
  coverArtUrl?: string;
  albumArtMode?: AlbumArtMode;
  streamPort: number;
  onViewArtist?: (artistName: string) => void;
}

export const TrackInfoDrawer: React.FC<TrackInfoDrawerProps> = ({
  currentTrack,
  isOpen,
  onClose,
  lastfmApiKey,
  coverArtUrl,
  albumArtMode = 'local_and_online',
  streamPort,
  onViewArtist,
}) => {
  const [artistInfo, setArtistInfo] = useState<ArtistInfo | null>(null);
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [onlineCover, setOnlineCover] = useState<string | undefined>(() => {
    if (coverArtUrl) return coverArtUrl;
    if (currentTrack) {
      return (
        MetadataService.getCachedCoverArt(
          currentTrack.artist,
          currentTrack.album,
          currentTrack.title
        ) || undefined
      );
    }
    return undefined;
  });
  const [triedOnlineFallback, setTriedOnlineFallback] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Sync or resolve album art first immediately so cover displays on frame 1
  useEffect(() => {
    if (!currentTrack) return;
    setImgError(false);
    setTriedOnlineFallback(false);

    const cached = MetadataService.getCachedCoverArt(
      currentTrack.artist,
      currentTrack.album,
      currentTrack.title
    );
    const hasLocal = Boolean(currentTrack.cover_path && currentTrack.cover_path.trim());
    const initialCover = (!hasLocal && albumArtMode === 'local_and_online')
      ? (coverArtUrl || cached || undefined)
      : undefined;
    setOnlineCover(initialCover);

    // Only fallback to online search if track has NO local embedded cover AND setting allows online fallback
    if (!hasLocal && !initialCover && albumArtMode === 'local_and_online') {
      MetadataService.resolveCoverArt(
        currentTrack.artist,
        currentTrack.album,
        currentTrack.title,
        ['lastfm', 'itunes', 'jiosaavn'],
        lastfmApiKey
      )
        .then((url) => {
          if (url) {
            setOnlineCover(url);
          }
        })
        .catch(() => {});
    }
  }, [currentTrack?.id, coverArtUrl, lastfmApiKey, albumArtMode]);

  useEffect(() => {
    if (!currentTrack || !isOpen) return;

    setLoading(true);
    setArtistInfo(null);
    setAlbumInfo(null);
    Promise.all([
      MetadataService.getArtistDetails(currentTrack.artist, lastfmApiKey),
      MetadataService.getAlbumDetails(currentTrack.artist, currentTrack.album, lastfmApiKey),
    ]).then(([artist, album]) => {
      setArtistInfo(artist);
      setAlbumInfo(album);
      if (album?.coverUrl && !currentTrack.cover_path && albumArtMode === 'local_and_online') {
        setOnlineCover((prev) => prev || album.coverUrl);
      }
      setLoading(false);
    });
  }, [currentTrack?.id, isOpen, lastfmApiKey, albumArtMode]);

  if (!isOpen || !currentTrack) return null;

  const hasLocal = Boolean(currentTrack.cover_path && currentTrack.cover_path.trim());
  const localCover = hasLocal
    ? getCoverUrl(currentTrack.cover_path, streamPort, undefined, albumArtMode)
    : undefined;
  const resolvedArt = (!hasLocal && albumArtMode === 'local_and_online')
    ? (onlineCover || coverArtUrl || albumInfo?.coverUrl)
    : undefined;
  const coverSrc = localCover || resolvedArt;
  const fileSizeMb = (currentTrack.file_size / (1024 * 1024)).toFixed(2);

  const handleImageError = () => {
    if (!triedOnlineFallback && resolvedArt && coverSrc !== resolvedArt) {
      setTriedOnlineFallback(true);
    } else {
      setImgError(true);
    }
  };

  return (
    <aside className="w-96 h-full bg-[#0d0f14]/95 backdrop-blur-md border-l border-white/10 flex flex-col z-30 select-none shadow-2xl overflow-y-auto flex-shrink-0 animate-fadeIn">
      {/* Spacious, un-cramped Header */}
      <div className="h-16 border-b border-white/10 px-5 flex items-center justify-between sticky top-0 bg-[#0d0f14]/95 backdrop-blur-md z-10 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/20 flex items-center justify-center">
            <Info className="w-4 h-4 text-[var(--accent-color)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold text-white tracking-wide">
              Track Details & Specs
            </span>
            <span className="text-[11px] text-zinc-400">Technical specs & metadata</span>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close details"
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5 flex-1">
        {/* Artwork & Header - loads first */}
        <div className="flex flex-col items-center text-center">
          <div className="w-52 h-52 rounded-xl bg-zinc-900 border border-white/10 shadow-xl mb-3.5 overflow-hidden flex items-center justify-center flex-shrink-0">
            {coverSrc && !imgError ? (
              <img
                src={coverSrc}
                alt={currentTrack.album}
                className="w-full h-full object-cover transition-opacity duration-200"
                onError={handleImageError}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">
                <Disc3 className="w-16 h-16 stroke-1 text-zinc-600" />
              </div>
            )}
          </div>
          <h2 className="text-[16px] font-bold text-white px-2 leading-snug">{currentTrack.title}</h2>
          <div className="text-[13px] font-medium text-zinc-300 mt-1">
            <ArtistLinks artists={currentTrack.artist} onSelectArtist={onViewArtist} />
          </div>
          <span className="text-[12px] text-zinc-400 mt-0.5">{currentTrack.album || 'Unknown Album'}</span>
        </div>

        {/* Technical Specs */}
        <div className="space-y-3.5 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs shadow-sm">
          <div className="flex items-center space-x-2 text-[var(--accent-color)] font-semibold text-xs pb-1.5 border-b border-white/5">
            <Cpu className="w-4 h-4" />
            <span className="tracking-wide">Audio Specifications</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-zinc-400">Codec: </span>
              <span className="font-mono text-white font-medium">{currentTrack.format}</span>
            </div>
            {currentTrack.bitrate && (
              <div>
                <span className="text-zinc-400">Bitrate: </span>
                <span className="font-mono text-white tabular-nums font-medium">{formatBitrate(currentTrack.bitrate)}</span>
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
          <div className="space-y-2 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
            <div className="flex items-center space-x-2 text-white font-semibold text-xs">
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
          <div className="flex items-center space-x-2 text-xs text-zinc-400 p-2">
            <Sparkles className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
            <span>Loading artist details from Last.fm...</span>
          </div>
        ) : (
          artistInfo && (
            <div className="space-y-2.5 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
              <div className="flex items-center space-x-2.5 text-white font-semibold text-xs">
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
                      className="text-xs px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10 font-mono"
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
