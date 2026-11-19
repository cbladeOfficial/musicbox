import React, { useEffect, useState } from 'react';
import { Play, Shuffle, Disc3, Clock, Sparkles, ArrowLeft, Volume2 } from 'lucide-react';
import { AlbumItem } from './AlbumGrid';
import { TrackRecord, AlbumInfo, AlbumArtMode, AlbumTrackOrder, sortAlbumTracks } from '../types/music';
import { MetadataService } from '../services/metadataService';
import { getCoverUrl } from '../utils/cover';
import { ArtistLinks } from './ArtistLinks';

interface AlbumDetailViewProps {
  album: AlbumItem;
  streamPort: number;
  albumArtMode?: AlbumArtMode;
  albumTrackOrder?: AlbumTrackOrder;
  onBack: () => void;
  onPlayTrack: (track: TrackRecord, album?: AlbumItem) => void;
  onPlayAlbum: (album: AlbumItem, shuffle?: boolean) => void;
  currentTrackId?: number;
  lastfmApiKey?: string;
  onViewArtist?: (artistName: string) => void;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({
  album,
  streamPort,
  albumArtMode = 'local_and_online',
  albumTrackOrder = 'track_number',
  onBack,
  onPlayTrack,
  onPlayAlbum,
  currentTrackId,
  lastfmApiKey = '',
  onViewArtist,
}) => {
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const sortedTracks = React.useMemo(() => sortAlbumTracks(album.tracks, albumTrackOrder), [album.tracks, albumTrackOrder]);
  const sortedAlbum = React.useMemo(() => ({
    ...album,
    tracks: sortedTracks,
  }), [album, sortedTracks]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setImgError(false);

    MetadataService.getAlbumDetails(album.artist, album.name, lastfmApiKey)
      .then((info) => {
        if (isMounted) {
          setAlbumInfo(info);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [album.artist, album.name, lastfmApiKey]);

  const totalDuration = album.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const mins = Math.floor(totalDuration / 60);
  const hasLocal = Boolean(album.coverPath && album.coverPath.trim());
  const coverSrc = getCoverUrl(
    album.coverPath,
    streamPort,
    hasLocal ? undefined : albumInfo?.coverUrl,
    albumArtMode
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-color)] p-6 space-y-7 select-none animate-fadeIn">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-sm text-zinc-400 hover:text-white flex items-center space-x-2 transition-colors duration-150"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Albums</span>
      </button>

      {/* Album Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-6 bg-gradient-to-b from-white/[0.04] to-transparent p-5 rounded-2xl border border-white/5 shadow-sm">
        <div className="w-56 h-56 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl flex-shrink-0 overflow-hidden flex items-center justify-center">
          {coverSrc && !imgError ? (
            <img
              src={coverSrc}
              alt={album.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">
              <Disc3 className="w-16 h-16 stroke-1" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--accent-color)]">
            Album
          </span>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {album.name}
          </h1>
          <div className="text-base font-medium text-zinc-200">
            <ArtistLinks artists={album.artist} onSelectArtist={onViewArtist} />
          </div>
          <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono tabular-nums">
            {album.year ? <span>{album.year}</span> : null}
            {album.year ? <span>•</span> : null}
            <span>{album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}</span>
            <span>•</span>
            <span>{mins} mins</span>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => onPlayAlbum(sortedAlbum, false)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-md bg-[var(--accent-color)] hover:brightness-110 text-white text-sm font-medium shadow-md transition-opacity active:opacity-75"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Album</span>
            </button>
            <button
              onClick={() => onPlayAlbum(sortedAlbum, true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-colors duration-150"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Album Wiki Summary */}
      {loading ? (
        <div className="flex items-center space-x-2 text-xs text-zinc-400 px-2">
          <Sparkles className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
          <span>Fetching album description from Last.fm / iTunes...</span>
        </div>
      ) : (
        albumInfo?.summary && (
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-300 leading-relaxed select-text">
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2">
              About this Album
            </span>
            <p className="text-[13px] leading-relaxed text-zinc-300">{albumInfo.summary}</p>
          </div>
        )
      )}

      {/* Tracks Table */}
      <div className="rounded-xl bg-white/[0.02] border border-white/10 p-2 space-y-1 overflow-hidden">
        <div className="h-10 px-4 flex items-center text-xs uppercase tracking-wider font-semibold text-zinc-400 bg-white/[0.03] border-b border-white/5 rounded-lg mb-1">
          <div className="w-10">#</div>
          <div className="flex-1">Title</div>
          <div className="w-16 text-right pr-2">
            <Clock className="w-3.5 h-3.5 inline" />
          </div>
        </div>
        {sortedTracks.map((t, idx) => {
          const isCurrent = currentTrackId === t.id;
          return (
            <div
              key={t.id}
              onDoubleClick={() => onPlayTrack(t, sortedAlbum)}
              className={`group flex items-center px-4 py-3 text-[14px] rounded-lg cursor-pointer transition-colors outline-none select-none ${
                isCurrent
                  ? 'text-[var(--accent-color)] font-medium bg-[var(--accent-color)]/15 shadow-sm'
                  : 'text-zinc-200 hover:bg-white/[0.06]'
              }`}
            >
              <div className="w-10 text-zinc-400 font-mono text-xs tabular-nums flex items-center">
                {isCurrent ? (
                  <Volume2 className="w-4 h-4 text-[var(--accent-color)] animate-pulse" />
                ) : (
                  <>
                    <span className="group-hover:hidden">
                      {albumTrackOrder === 'alphabetical' ? idx + 1 : (t.track_number || idx + 1)}
                    </span>
                    <button
                      onClick={() => onPlayTrack(t, sortedAlbum)}
                      className="hidden group-hover:block text-white hover:text-[var(--accent-color)] transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex-1 truncate font-medium text-white group-hover:text-[var(--accent-color)] transition-colors">
                {t.title}
              </div>
              <div className="w-16 text-right text-zinc-400 font-mono text-xs tabular-nums pr-2">
                {Math.floor(t.duration / 60)}:{(Math.floor(t.duration % 60)).toString().padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
