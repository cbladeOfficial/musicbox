import { TrackRecord, PlaylistRecord } from '../types/music';

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
      alert("Folder picking is only available in the MusicBox desktop app.");
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
    isPlaying: boolean;
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
      isPlaying: params.isPlaying,
    });
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

  async maximize(): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('maximize_app');
  },

  async close(): Promise<void> {
    if (!isTauri()) return;
    return safeInvoke<void>('close_app');
  },

  async isMaximized(): Promise<boolean> {
    if (!isTauri()) return false;
    return safeInvoke<boolean>('is_app_maximized');
  },
};
