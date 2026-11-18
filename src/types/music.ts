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
