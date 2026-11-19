export interface TrackRecord {
  id: number;
  path: string;
  title: string;
  artist: string;
  album: string;
  album_artist?: string;
  track_number?: number;
  disc_number?: number;
  year?: number;
  genre?: string;
  duration: number;
  bitrate?: number;
  sample_rate?: number;
  format: string;
  cover_path?: string;
  file_size: number;
  play_count: number;
  is_favorite: boolean;
  date_added: number;
  last_played?: number;
}

export interface PlaylistRecord {
  id: number;
  name: string;
  track_count: number;
  created_at: number;
}

export interface RadioStation {
  id: number;
  name: string;
  url: string;
  homepage?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  is_favorite: boolean;
  created_at: number;
}

export interface RadioMetadata {
  title: string;
  artist: string;
  raw: string;
  station_name?: string;
}

export interface LyricsLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  synced: boolean;
  lines: LyricsLine[];
  plain?: string;
}

export interface ArtistInfo {
  name: string;
  bio: string;
  image?: string;
  tags: string[];
  similar: string[];
}

export interface AlbumInfo {
  name: string;
  artist: string;
  summary: string;
  releaseDate?: string;
  coverUrl?: string;
  listeners?: string;
}

export type ViewMode =
  | 'home'
  | 'tracks'
  | 'albums'
  | 'artists'
  | 'album_artists'
  | 'genres'
  | 'folders'
  | 'album_detail'
  | 'artist_detail'
  | 'genre_detail'
  | 'playlist'
  | 'playlist_form'
  | 'track_edit_form'
  | 'favorites'
  | 'radio'
  | 'radio_form'
  | 'visualizer'
  | 'settings';

export type TableDensity = 'comfortable' | 'compact';

export type VisualizerMode =
  | 'bars'
  | 'mirror-bars'
  | 'wave'
  | 'circle'
  | 'rainbow-ribbon'
  | 'particles'
  | 'off';

export type VisualizerState = 'regular_fullscreen' | 'bottom';

export type ThemeId = 'feishin' | 'amoled' | 'nord' | 'catppuccin' | 'cyberpunk';

export type ArtSource = 'itunes' | 'wikipedia' | 'lastfm' | 'jiosaavn';

export type TrackSortField = 'title' | 'artist' | 'album' | 'duration' | 'date_added' | 'track_number';

export type AlbumArtMode = 'local_and_online' | 'local_only' | 'disabled';

export type AlbumTrackOrder = 'track_number' | 'alphabetical';

export interface AppSettings {
  defaultStartingPage?: ViewMode;
  musicFolders: string[];
  theme: ThemeId;
  fontFamily: string;
  startMaximized: boolean;
  customAccentColor: string;
  tableDensity: TableDensity;
  trackSortField: TrackSortField;
  trackSortAsc: boolean;
  visualizerMode: VisualizerMode;
  visualizerHeight: number;
  visualizerState?: VisualizerState;
  discordRpcEnabled: boolean;
  discordClientId: string;
  discordShowYear: boolean;
  artSourcePriority: ArtSource[];
  albumArtMode: AlbumArtMode;
  albumTrackOrder?: AlbumTrackOrder;
  lastfmEnabled: boolean;
  lastfmApiKey: string;
  lastfmSecret: string;
  lastfmUsername: string;
  lowMemoryMode: boolean;
  autoUpdateEnabled?: boolean;
  autoInstallOnNextStart?: boolean;
}

export interface UpdateCheckResult {
  update_available: boolean;
  current_version: string;
  latest_version: string;
  release_name?: string;
  release_notes?: string;
  published_at?: string;
  download_url?: string;
  file_size?: number;
  file_name?: string;
}

export interface PendingUpdateInfo {
  version: string;
  file_name: string;
  file_size: number;
  ready_to_install: boolean;
}

export interface DownloadProgress {
  percent: number;
  downloaded_bytes: number;
  total_bytes: number;
}

/**
 * Sorts album tracks strictly following disc_number (ascending) and track_number (ascending 1..N).
 * Unnumbered tracks follow numbered tracks in a deterministic natural order (title / path).
 */
export function sortAlbumTracks(tracks: TrackRecord[], order: AlbumTrackOrder = 'track_number'): TrackRecord[] {
  return [...tracks].sort((a, b) => {
    if (order === 'alphabetical') {
      // Strictly sort by song title (A-Z) regardless of track numbers and not by filename
      const titleA = (a.title || '').trim();
      const titleB = (b.title || '').trim();
      const titleCmp = titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
      if (titleCmp !== 0) return titleCmp;

      // Tiebreakers
      const discA = a.disc_number || 1;
      const discB = b.disc_number || 1;
      if (discA !== discB) return discA - discB;

      const trackA = a.track_number || 0;
      const trackB = b.track_number || 0;
      if (trackA !== trackB) return trackA - trackB;

      return (a.path || '').localeCompare(b.path || '');
    }

    // Default 'track_number' priority:
    // 1. Disc number ascending (defaulting to 1)
    const discA = a.disc_number || 1;
    const discB = b.disc_number || 1;
    if (discA !== discB) return discA - discB;

    // 2. Track number ascending (prioritize present positive track numbers)
    const hasTrackA = a.track_number != null && a.track_number > 0;
    const hasTrackB = b.track_number != null && b.track_number > 0;
    if (hasTrackA && hasTrackB) {
      if (a.track_number !== b.track_number) {
        return (a.track_number as number) - (b.track_number as number);
      }
    } else if (hasTrackA && !hasTrackB) {
      return -1; // Numbered tracks come first
    } else if (!hasTrackA && hasTrackB) {
      return 1; // Unnumbered tracks come after
    }

    // 3. Natural sort by title (A-Z)
    const titleCmp = (a.title || '').trim().localeCompare((b.title || '').trim(), undefined, { numeric: true, sensitivity: 'base' });
    if (titleCmp !== 0) return titleCmp;

    // 4. Stable tiebreaker: file path / id
    return (a.path || '').localeCompare(b.path || '');
  });
}

