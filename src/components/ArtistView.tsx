import React, { useEffect, useState } from 'react';
import { Play, Users2, Shuffle, Sparkles } from 'lucide-react';
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
      <div className="flex-1 overflow-y-auto p-5 select-none">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {artists.map((artist) => (
            <div
              key={artist.name}
              onClick={() => onSelectArtist(artist)}
              className="flex flex-col items-center p-4 rounded-xl bg-[var(--surface-color)]/60 hover:bg-[var(--surface-color)] border border-[var(--border-color)]/60 hover:border-[var(--border-color)] transition-all cursor-pointer group text-center"
            >
              <div className="w-24 h-24 rounded-full bg-[var(--surface-active)] border border-[var(--border-color)] flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
                <Users2 className="w-10 h-10 text-[var(--accent-color)] opacity-70" />
              </div>
              <span className="text-xs font-semibold text-[var(--text-main)] truncate w-full group-hover:underline">
                {artist.name}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Dedicated Artist Detail Page
  return (
    <div className="flex-1 overflow-y-auto select-none">
      {/* Artist Header Banner */}
      <div className="p-6 bg-gradient-to-b from-[var(--surface-hover)] to-transparent border-b border-[var(--border-color)]/50">
        <button
          onClick={onBackToArtists}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] mb-3 flex items-center space-x-1"
        >
          <span>← Back to all artists</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--accent-color)] tracking-wider">
              Artist
            </span>
            <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              {selectedArtist.name}
            </h1>
            <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] mt-1 font-mono">
              <span>{selectedArtist.albumCount} albums</span>
              <span>•</span>
              <span>{selectedArtist.trackCount} tracks</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onPlayArtist(selectedArtist, false)}
              className="flex items-center space-x-2 px-4 py-2 rounded-full bg-[var(--accent-color)] hover:bg-[var(--feishin-accentHover)] text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play All</span>
            </button>
            <button
              onClick={() => onPlayArtist(selectedArtist, true)}
              className="flex items-center space-x-2 px-3 py-2 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-medium transition-all"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>

        {/* Artist Bio & Tags from Last.fm */}
        {loadingBio ? (
          <div className="mt-4 flex items-center space-x-2 text-xs text-[var(--text-muted)]">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)]" />
            <span>Fetching biography from Last.fm...</span>
          </div>
        ) : (
          artistBio && (
            <div className="mt-4 max-w-3xl space-y-2">
              {artistBio.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {artistBio.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-color)] text-[var(--text-muted)] border border-[var(--border-color)]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {artistBio.bio && (
                <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3 hover:line-clamp-none transition-all">
                  {artistBio.bio}
                </p>
              )}
            </div>
          )
        )}
      </div>

      {/* Artist Tracks */}
      <div className="p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
          Tracks
        </h3>
        <div className="divide-y divide-[var(--border-color)]/40 rounded-lg bg-[var(--surface-color)]/30 border border-[var(--border-color)]">
          {selectedArtist.tracks.map((track, i) => (
            <div
              key={track.id}
              onDoubleClick={() => onPlayTrack(track)}
              className={`flex items-center px-4 py-2 text-xs hover:bg-[var(--surface-hover)] cursor-pointer ${
                currentTrackId === track.id ? 'text-[var(--accent-color)] font-semibold' : 'text-[var(--text-main)]'
              }`}
            >
              <span className="w-8 text-[var(--text-muted)] font-mono text-[11px]">{i + 1}</span>
              <div className="flex-1 truncate font-medium">{track.title}</div>
              <div className="w-48 text-[var(--text-muted)] truncate hidden md:block">{track.album}</div>
              <div className="w-16 text-right text-[var(--text-muted)] font-mono text-[11px]">
                {Math.floor(track.duration / 60)}:{(Math.floor(track.duration % 60)).toString().padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
