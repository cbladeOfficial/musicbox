import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Mic2,
  Shuffle,
  Sparkles,
  ArrowLeft,
  Disc3,
  Search,
  Tag,
  Users,
} from 'lucide-react';
import { TrackRecord, ArtistInfo } from '../types/music';
import { MetadataService } from '../services/metadataService';
import { getCoverUrl } from '../utils/cover';

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
  streamPort?: number;
  onViewAlbum?: (albumName: string, artistName: string) => void;
}

// 1. Grid Card for each Artist with Picture from Deezer/Wikipedia/Last.fm
const ArtistGridCard: React.FC<{
  artist: ArtistGroup;
  onSelect: () => void;
}> = ({ artist, onSelect }) => {
  const [pictureUrl, setPictureUrl] = useState<string | null>(() => {
    return localStorage.getItem(`mb_artist_img_${artist.name.toLowerCase()}`);
  });

  useEffect(() => {
    let isMounted = true;
    if (!pictureUrl) {
      MetadataService.fetchArtistImage(artist.name).then((url) => {
        if (isMounted && url) {
          setPictureUrl(url);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [artist.name, pictureUrl]);

  return (
    <div
      onClick={onSelect}
      className="flex flex-col items-center p-4 rounded-xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)] hover:border-white/20 transition-colors duration-150 cursor-pointer group text-center shadow-sm hover:shadow-xl"
    >
      <div className="relative w-28 h-28 rounded-full bg-zinc-900 border-2 border-white/10 flex items-center justify-center mb-3.5 shadow-md overflow-hidden group-hover:border-[var(--accent-color)] transition-colors duration-150">
        {pictureUrl ? (
          <img
            src={pictureUrl}
            alt={artist.name}
            loading="lazy"
            className="w-full h-full object-cover transition-opacity duration-150 group-hover:opacity-90"
            onError={() => setPictureUrl(null)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <Mic2 className="w-10 h-10 text-[var(--accent-color)] opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      <span
        className="text-[14px] font-semibold text-zinc-100 truncate w-full group-hover:text-[var(--accent-color)] transition-colors"
        title={artist.name}
      >
        {artist.name}
      </span>

      <span className="text-xs text-zinc-400 mt-1 font-mono tabular-nums">
        {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'} • {artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
      </span>
    </div>
  );
};

export const ArtistView: React.FC<ArtistViewProps> = ({
  artists,
  selectedArtist,
  onSelectArtist,
  onBackToArtists,
  onPlayTrack,
  onPlayArtist,
  currentTrackId,
  lastfmApiKey,
  streamPort = 45321,
  onViewAlbum,
}) => {
  const [artistBio, setArtistBio] = useState<ArtistInfo | null>(null);
  const [loadingBio, setLoadingBio] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch Artist Details (Bio, Image, Tags, Similar)
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

  // Group albums for the selected artist
  const artistAlbums = useMemo(() => {
    if (!selectedArtist) return [];
    const map = new Map<string, { name: string; year?: number; coverPath?: string; tracks: TrackRecord[] }>();
    for (const t of selectedArtist.tracks) {
      const albName = t.album || 'Unknown Album';
      if (!map.has(albName)) {
        map.set(albName, {
          name: albName,
          year: t.year,
          coverPath: t.cover_path,
          tracks: [],
        });
      }
      map.get(albName)!.tracks.push(t);
    }
    return Array.from(map.values()).sort((a, b) => (b.year || 0) - (a.year || 0));
  }, [selectedArtist]);

  // Filter artists in grid
  const filteredArtists = useMemo(() => {
    if (!searchFilter.trim()) return artists;
    const q = searchFilter.toLowerCase();
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [artists, searchFilter]);

  if (!selectedArtist) {
    // 1. Artist List Grid
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-[var(--bg-color)] animate-fadeIn">
        {/* Top Filter Bar */}
        <div className="h-12 border-b border-[var(--border-color)] px-6 flex items-center justify-between bg-[var(--sidebar-color)] flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Mic2 className="w-4 h-4 text-[var(--accent-color)]" />
            <h1 className="text-base font-semibold text-white">Artists</h1>
            <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 font-mono border border-white/5">
              {artists.length}
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search artists..."
              className="w-52 bg-[var(--surface-color)] text-xs text-white pl-8 pr-3 py-1.5 rounded-md border border-[var(--border-color)] focus:border-[var(--accent-color)] outline-none"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
          </div>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredArtists.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center text-sm text-zinc-400 space-y-3">
              <Mic2 className="w-12 h-12 opacity-30 stroke-1" />
              <p className="text-base font-medium text-zinc-300">No artists found</p>
              <p className="text-sm text-zinc-500">Scan a music folder in the sidebar to populate artists.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {filteredArtists.map((artist) => (
                <ArtistGridCard
                  key={artist.name}
                  artist={artist}
                  onSelect={() => onSelectArtist(artist)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Dedicated Artist Detail Page
  return (
    <div className="flex-1 overflow-y-auto select-none bg-[var(--bg-color)] animate-fadeIn">
      {/* Back Button & Header Banner */}
      <div className="p-6 bg-gradient-to-b from-white/[0.06] to-transparent border-b border-white/10 space-y-5">
        <button
          onClick={onBackToArtists}
          className="text-sm text-zinc-400 hover:text-white flex items-center space-x-2 transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Artists</span>
        </button>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Large Artist Portrait */}
          <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full bg-zinc-900 border-2 border-white/20 shadow-2xl flex-shrink-0 overflow-hidden flex items-center justify-center">
            {artistBio?.image ? (
              <img
                src={artistBio.image}
                alt={selectedArtist.name}
                className="w-full h-full object-cover"
                onError={() => {
                  if (artistBio) setArtistBio({ ...artistBio, image: undefined });
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <Mic2 className="w-16 h-16 text-[var(--accent-color)] opacity-60" />
              </div>
            )}
          </div>

          {/* Artist Info & Actions */}
          <div className="flex-1 space-y-2.5">
            <span className="text-xs uppercase tracking-wider font-semibold text-[var(--accent-color)]">
              Artist
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              {selectedArtist.name}
            </h1>
            <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono tabular-nums">
              <span>{selectedArtist.albumCount} {selectedArtist.albumCount === 1 ? 'album' : 'albums'}</span>
              <span>•</span>
              <span>{selectedArtist.trackCount} {selectedArtist.trackCount === 1 ? 'track' : 'tracks'}</span>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => onPlayArtist(selectedArtist, false)}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-md bg-[var(--accent-color)] hover:brightness-110 text-white text-sm font-medium shadow-md transition-opacity active:opacity-75"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play All</span>
              </button>
              <button
                onClick={() => onPlayArtist(selectedArtist, true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-colors duration-150"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle</span>
              </button>
            </div>
          </div>
        </div>

        {/* Artist Biography & Tags from Last.fm / Wikipedia */}
        {loadingBio ? (
          <div className="pt-2 flex items-center space-x-2 text-xs text-zinc-400">
            <Sparkles className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
            <span>Fetching artist picture and biography from Last.fm & Deezer...</span>
          </div>
        ) : (
          artistBio && (
            <div className="pt-2 max-w-4xl space-y-3">
              {/* Tags */}
              {artistBio.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Tag className="w-3.5 h-3.5 text-zinc-400 mr-1" />
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

              {/* Biography Text */}
              {artistBio.bio && (
                <div className="bg-white/[0.02] p-4 rounded-lg border border-white/5 text-[13px] text-zinc-300 leading-relaxed select-text">
                  <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-1.5">
                    About {selectedArtist.name}
                  </span>
                  <p>{artistBio.bio}</p>
                </div>
              )}

              {/* Similar Artists */}
              {artistBio.similar.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center text-xs text-zinc-400 pt-1">
                  <div className="flex items-center space-x-1.5 text-zinc-400 mr-1">
                    <Users className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                    <span className="font-medium">Similar Artists:</span>
                  </div>
                  {artistBio.similar.map((sim) => {
                    const localMatch = artists.find(
                      (a) => a.name.toLowerCase() === sim.toLowerCase()
                    );
                    return (
                      <button
                        key={sim}
                        disabled={!localMatch}
                        onClick={() => localMatch && onSelectArtist(localMatch)}
                        className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                          localMatch
                            ? 'bg-[var(--accent-color)]/15 text-white border border-[var(--accent-color)]/30 hover:bg-[var(--accent-color)]/30 cursor-pointer'
                            : 'bg-white/5 text-zinc-400 border border-white/10 cursor-default'
                        }`}
                        title={localMatch ? 'View in library' : 'Not in local library'}
                      >
                        {sim}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Artist Discography (Albums) */}
      {artistAlbums.length > 0 && (
        <div className="p-6 border-b border-white/[0.04]">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-3.5">
            Albums & Releases ({artistAlbums.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artistAlbums.map((alb) => {
              const coverSrc = getCoverUrl(alb.coverPath, streamPort);
              return (
                <div
                  key={alb.name}
                  onClick={() => onViewAlbum && onViewAlbum(alb.name, selectedArtist.name)}
                  className="flex flex-col p-3 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)] hover:border-white/20 transition-colors duration-150 cursor-pointer group shadow-sm"
                >
                  <div className="aspect-square w-full rounded-md bg-zinc-900 border border-white/10 mb-2.5 overflow-hidden flex items-center justify-center shadow-md">
                    {coverSrc ? (
                      <img
                        src={coverSrc}
                        alt={alb.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-opacity duration-150 group-hover:opacity-90"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Disc3 className="w-10 h-10 text-zinc-600 stroke-1" />
                    )}
                  </div>
                  <span
                    className="text-[13px] font-semibold text-white truncate group-hover:text-[var(--accent-color)] transition-colors"
                    title={alb.name}
                  >
                    {alb.name}
                  </span>
                  <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mt-0.5 font-mono">
                    {alb.year ? <span>{alb.year}</span> : null}
                    {alb.year ? <span>•</span> : null}
                    <span>{alb.tracks.length} {alb.tracks.length === 1 ? 'track' : 'tracks'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Songs by this Artist */}
      <div className="p-6">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-3">
          All Songs ({selectedArtist.tracks.length})
        </h3>
        <div className="divide-y divide-white/[0.04] rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] overflow-hidden">
          {selectedArtist.tracks.map((track, i) => (
            <div
              key={track.id}
              onDoubleClick={() => onPlayTrack(track)}
              className={`flex items-center px-4 py-3 text-[14px] hover:bg-white/[0.04] cursor-pointer transition-colors ${
                currentTrackId === track.id
                  ? 'text-[var(--accent-color)] font-medium bg-[var(--accent-color)]/10'
                  : 'text-zinc-200'
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
