import React, { useEffect, useState } from 'react';
import { Play, Mic2, Shuffle, Sparkles, ArrowLeft, Disc3 } from 'lucide-react';
import { TrackRecord, ArtistInfo } from '../types/music';
import { MetadataService } from '../services/metadataService';

export interface ArtistGroup {
  name: string;
  trackCount: number;
  albumCount: number;
  tracks: TrackRecord[];
}

interface ArtistViewProps {
  artists: ArtistGroup[];
  selectedArtist: ArtistGroup | null;
  onSelectArtist: (artist: ArtistGroup) => void;
  onBackToArtists: () => void;
  onPlayTrack: (track: TrackRecord) => void;
  onPlayArtist: (artist: ArtistGroup, shuffle?: boolean) => void;
  currentTrackId?: number;
  lastfmApiKey: string;
}

export const ArtistView: React.FC<ArtistViewProps> = ({
  artists,
  selectedArtist,
  onSelectArtist,
  onBackToArtists,
  onPlayTrack,
  onPlayArtist,
  currentTrackId,
  lastfmApiKey,
}) => {
  const [artistBio, setArtistBio] = useState<ArtistInfo | null>(null);
  const [loadingBio, setLoadingBio] = useState(false);

  useEffect(() => {
    if (selectedArtist) {
      setLoadingBio(true);
      MetadataService.getArtistDetails(selectedArtist.name, lastfmApiKey).then((info) => {
        setArtistBio(info);
        setLoadingBio(false);
      });
    } else {
      setArtistBio(null);
    }
  }, [selectedArtist, lastfmApiKey]);

  if (!selectedArtist) {
    // Artist List Grid
    return (
      <div className="flex-1 overflow-y-auto p-6 select-none bg-[var(--bg-color)]">
        {artists.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center text-sm text-zinc-400 space-y-3">
            <Mic2 className="w-12 h-12 opacity-40 stroke-1" />
            <p className="text-base font-medium text-zinc-300">No artists found</p>
            <p className="text-sm text-zinc-500">Scan a music folder in the sidebar to populate artists.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {artists.map((artist) => (
              <div
                key={artist.name}
                onClick={() => onSelectArtist(artist)}
                className="flex flex-col items-center p-4 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)] hover:border-white/20 transition-all cursor-pointer group text-center shadow-sm hover:shadow-xl"
              >
                <div className="w-24 h-24 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
                  <Mic2 className="w-9 h-9 text-[var(--accent-color)]" />
                </div>
                <span className="text-[14px] font-medium text-zinc-100 truncate w-full group-hover:text-[var(--accent-color)] transition-colors">
                  {artist.name}
                </span>
                <span className="text-xs text-zinc-400 mt-1 font-mono tabular-nums">
                  {artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Dedicated Artist Detail Page
  return (
    <div className="flex-1 overflow-y-auto select-none bg-[var(--bg-color)]">
      {/* Artist Header Banner */}
      <div className="p-6 bg-gradient-to-b from-white/[0.05] to-transparent border-b border-white/10">
        <button
          onClick={onBackToArtists}
          className="text-sm text-zinc-400 hover:text-white mb-3 flex items-center space-x-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Artists</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-[var(--accent-color)]">
              Artist
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
              {selectedArtist.name}
            </h1>
            <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-1.5 font-mono tabular-nums">
              <span>{selectedArtist.albumCount} albums</span>
              <span>•</span>
              <span>{selectedArtist.trackCount} tracks</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onPlayArtist(selectedArtist, false)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-md bg-[var(--accent-color)] hover:brightness-110 text-white text-sm font-medium shadow-md active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play All</span>
            </button>
            <button
              onClick={() => onPlayArtist(selectedArtist, true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>

        {/* Artist Bio & Tags from Last.fm */}
        {loadingBio ? (
          <div className="mt-4 flex items-center space-x-2 text-xs text-zinc-400">
            <Sparkles className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
            <span>Fetching artist biography from Last.fm...</span>
          </div>
        ) : (
          artistBio && (
            <div className="mt-4 max-w-3xl space-y-2.5">
              {artistBio.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {artistBio.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10 font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {artistBio.bio && (
                <p className="text-[13px] text-zinc-300 leading-relaxed select-text bg-white/[0.02] p-3.5 rounded-md border border-white/5">
                  {artistBio.bio}
                </p>
              )}
            </div>
          )
        )}
      </div>

      {/* Artist Tracks */}
      <div className="p-6">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-3">
          All Songs
        </h3>
        <div className="divide-y divide-white/[0.04] rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] overflow-hidden">
          {selectedArtist.tracks.map((track, i) => (
            <div
              key={track.id}
              onDoubleClick={() => onPlayTrack(track)}
              className={`flex items-center px-4 py-3 text-[14px] hover:bg-white/[0.04] cursor-pointer transition-colors ${
                currentTrackId === track.id ? 'text-[var(--accent-color)] font-medium bg-[var(--accent-color)]/10' : 'text-zinc-200'
              }`}
            >
              <span className="w-8 text-zinc-500 font-mono text-xs tabular-nums">{i + 1}</span>
              <div className="flex-1 truncate font-medium text-white">{track.title}</div>
              <div className="w-48 text-zinc-400 truncate hidden md:block text-[13px]">{track.album}</div>
              <div className="w-16 text-right text-zinc-400 font-mono text-xs tabular-nums">
                {Math.floor(track.duration / 60)}:{(Math.floor(track.duration % 60)).toString().padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
