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
  | 'tracks'
  | 'albums'
  | 'artists'
  | 'album_detail'
  | 'artist_detail'
  | 'playlist'
  | 'playlist_form'
  | 'track_edit_form'
  | 'favorites'
  | 'radio'
  | 'radio_form'
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

export type ThemeId = 'feishin' | 'amoled' | 'nord' | 'catppuccin' | 'cyberpunk';

export type ArtSource = 'itunes' | 'lastfm' | 'jiosaavn';

export type TrackSortField = 'title' | 'artist' | 'album' | 'duration' | 'date_added' | 'track_number';

export interface AppSettings {
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
  discordRpcEnabled: boolean;
  discordClientId: string;
  discordShowYear: boolean;
  artSourcePriority: ArtSource[];
  lastfmEnabled: boolean;
  lastfmApiKey: string;
  lastfmSecret: string;
  lastfmUsername: string;
  lowMemoryMode: boolean;
}
