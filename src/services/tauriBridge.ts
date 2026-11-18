import { TrackRecord, PlaylistRecord, RadioStation, RadioMetadata, UpdateCheckResult, PendingUpdateInfo, DownloadProgress } from '../types/music';

// Safely detect if running in Tauri desktop runtime
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Safe invoke wrapper
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  console.warn(`[Tauri Mock] Invoke '${cmd}' called in web browser environment:`, args);
  return Promise.reject(new Error(`Tauri environment not available for command ${cmd}`));
}

export const TauriBridge = {
  async getStreamPort(): Promise<number> {
    if (!isTauri()) return 45321;
    return safeInvoke<number>('get_stream_port');
  },

  async pickDirectory(): Promise<string | null> {
    if (!isTauri()) {
      console.warn("Folder picking is only available in the MusicBox desktop app.");
      return null;
    }
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Music Library Folder',
    });
    if (typeof selected === 'string') {
      return selected;
    }
    return null;
  },

  async scanDirectory(path: string): Promise<number> {
    return safeInvoke<number>('scan_music_directory', { path });
  },

  async getTracks(): Promise<TrackRecord[]> {
    if (!isTauri()) return [];
    return safeInvoke<TrackRecord[]>('get_tracks');
  },

  async toggleFavorite(trackId: number): Promise<boolean> {
    if (!isTauri()) return false;
    return safeInvoke<boolean>('toggle_track_favorite', { trackId });
  },

  async recordPlay(trackId: number): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('record_track_played', { trackId });
  },

  async createPlaylist(name: string): Promise<number> {
    if (!isTauri()) return 1;
    return safeInvoke<number>('create_new_playlist', { name });
  },

  async getPlaylists(): Promise<PlaylistRecord[]> {
    if (!isTauri()) return [];
    return safeInvoke<PlaylistRecord[]>('get_all_playlists');
  },

  async addToPlaylist(playlistId: number, trackId: number): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('add_track_to_playlist', { playlistId, trackId });
  },

  async removeFromPlaylist(playlistId: number, trackId: number): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('remove_track_from_playlist', { playlistId, trackId });
  },

  async getPlaylistTracks(playlistId: number): Promise<TrackRecord[]> {
    if (!isTauri()) return [];
    return safeInvoke<TrackRecord[]>('get_tracks_in_playlist', { playlistId });
  },

  async deletePlaylist(playlistId: number): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('delete_selected_playlist', { playlistId });
  },

  async renamePlaylist(playlistId: number, newName: string): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('rename_selected_playlist', { playlistId, newName });
  },

  async updateTrackMetadata(params: {
    trackId: number;
    title: string;
    artist: string;
    album: string;
    genre?: string;
    year?: number;
    trackNumber?: number;
  }): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('update_track_info', {
      trackId: params.trackId,
      title: params.title,
      artist: params.artist,
      album: params.album,
      genre: params.genre || null,
      year: params.year ?? null,
      trackNumber: params.trackNumber ?? null,
    });
  },

  async saveSetting(key: string, value: string): Promise<void> {
    if (!isTauri()) {
      localStorage.setItem(`musicbox_${key}`, value);
      return;
    }
    return safeInvoke<void>('save_setting', { key, value });
  },

  async loadSetting(key: string): Promise<string | null> {
    if (!isTauri()) {
      return localStorage.getItem(`musicbox_${key}`);
    }
    const val = await safeInvoke<string | null>('load_setting', { key });
    return val ?? null;
  },

  async updateDiscordPresence(params: {
    title: string;
    artist: string;
    album: string;
    year?: number;
    duration: number;
    position: number;
    coverUrl?: string;
    coverPath?: string;
    isPlaying: boolean;
    clientId?: string;
  }): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('update_presence', {
      title: params.title,
      artist: params.artist,
      album: params.album,
      year: params.year ?? null,
      duration: params.duration,
      position: params.position,
      coverUrl: params.coverUrl ?? null,
      coverPath: params.coverPath ?? null,
      isPlaying: params.isPlaying,
      clientId: params.clientId ?? null,
    });
  },

  async setDiscordClientId(clientId: string): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('set_discord_client_id', { clientId });
  },

  async clearDiscordPresence(): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('clear_presence');
  },

  async toggleDiscordRpc(enabled: boolean): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('toggle_discord_rpc', { enabled });
  },

  async minimize(): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('minimize_app');
  },

  async maximize(): Promise<boolean> {
    if (!isTauri()) return false;
    return safeInvoke<boolean>('maximize_app');
  },

  async close(): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('close_app');
  },

  async center(): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('center_app');
  },

  async isMaximized(): Promise<boolean> {
    if (!isTauri()) return false;
    return safeInvoke<boolean>('is_app_maximized');
  },

  async getRadioStations(): Promise<RadioStation[]> {
    if (!isTauri()) return [];
    return safeInvoke<RadioStation[]>('get_radio_stations');
  },

  async addRadioStation(
    name: string,
    url: string,
    favicon?: string,
    tags?: string,
    country?: string
  ): Promise<number> {
    if (!isTauri()) return 1;
    return safeInvoke<number>('add_radio_station', {
      name,
      url,
      favicon: favicon || null,
      tags: tags || null,
      country: country || null,
    });
  },

  async updateRadioStation(
    id: number,
    name: string,
    url: string,
    favicon?: string,
    tags?: string
  ): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('update_radio_station', {
      id,
      name,
      url,
      favicon: favicon || null,
      tags: tags || null,
    });
  },

  async deleteRadioStation(id: number): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('delete_radio_station', { id });
  },

  async toggleRadioFavorite(id: number): Promise<boolean> {
    if (!isTauri()) return false;
    return safeInvoke<boolean>('toggle_radio_favorite', { id });
  },

  async fetchRadioMetadata(streamUrl: string): Promise<RadioMetadata | null> {
    if (!isTauri()) return null;
    return safeInvoke<RadioMetadata | null>('fetch_radio_metadata', { streamUrl });
  },

  async updateRadioPresence(params: {
    stationName: string;
    songTitle?: string;
    artist?: string;
    iconUrl?: string;
    isPlaying: boolean;
    clientId?: string;
  }): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('update_radio_presence', {
      stationName: params.stationName,
      songTitle: params.songTitle || null,
      artist: params.artist || null,
      iconUrl: params.iconUrl || null,
      isPlaying: params.isPlaying,
      clientId: params.clientId || null,
    });
  },

  async updateTaskbarPlaybackState(isPlaying: boolean): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('update_taskbar_playback_state', { isPlaying });
  },

  async showInFileManager(path: string): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('show_in_file_manager', { path });
  },

  async checkForUpdates(): Promise<UpdateCheckResult> {
    if (!isTauri()) {
      return {
        update_available: false,
        current_version: '0.1.0',
        latest_version: '0.1.0',
      };
    }
    return safeInvoke<UpdateCheckResult>('check_for_updates');
  },

  async downloadUpdate(downloadUrl: string, targetVersion: string): Promise<string> {
    if (!isTauri()) return '';
    return safeInvoke<string>('download_update', { downloadUrl, targetVersion });
  },

  async installPendingUpdate(): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('install_pending_update');
  },

  async getPendingUpdateStatus(): Promise<PendingUpdateInfo | null> {
    if (!isTauri()) return null;
    return safeInvoke<PendingUpdateInfo | null>('get_pending_update_status');
  },

  async onUpdateProgress(callback: (p: DownloadProgress) => void): Promise<(() => void) | undefined> {
    if (!isTauri()) return undefined;
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<DownloadProgress>('update-download-progress', (e) => callback(e.payload));
    return unlisten;
  },

  async onUpdateDownloaded(callback: (version: string) => void): Promise<(() => void) | undefined> {
    if (!isTauri()) return undefined;
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<string>('update-downloaded', (e) => callback(e.payload));
    return unlisten;
  },
};
