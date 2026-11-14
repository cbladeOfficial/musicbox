use crate::db::{self, PlaylistRecord, TrackRecord};
use crate::discord::DiscordManager;
use crate::scanner;
use crate::server::SERVER_PORT;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Mutex;
use tauri::{State, Window};

pub struct AppState {
    pub db: Mutex<Connection>,
    pub discord: DiscordManager,
    pub cache_dir: PathBuf,
}

#[tauri::command]
pub fn get_stream_port() -> u16 {
    SERVER_PORT.load(Ordering::SeqCst)
}

#[tauri::command]
pub async fn scan_music_directory(
    path: String,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let p = PathBuf::from(&path);
    if !p.exists() || !p.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let cache_dir = state.cache_dir.clone();
    // Run CPU-heavy file tag extraction on a threadpool to keep UI completely responsive
    let tracks = tauri::async_runtime::spawn_blocking(move || {
        scanner::scan_directory(&p, &cache_dir)
    })
    .await
    .map_err(|e| e.to_string())?;

    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    let inserted = db::insert_or_update_tracks(&mut db, &tracks).map_err(|e| e.to_string())?;

    Ok(inserted)
}

#[tauri::command]
pub fn get_tracks(state: State<'_, AppState>) -> Result<Vec<TrackRecord>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::get_all_tracks(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_track_favorite(track_id: i64, state: State<'_, AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::toggle_favorite(&db, track_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn record_track_played(track_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::increment_play_count(&db, track_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_new_playlist(name: String, state: State<'_, AppState>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::create_playlist(&db, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_playlists(state: State<'_, AppState>) -> Result<Vec<PlaylistRecord>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::get_playlists(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_track_to_playlist(
    playlist_id: i64,
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::add_to_playlist(&db, playlist_id, track_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_track_from_playlist(
    playlist_id: i64,
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::remove_from_playlist(&db, playlist_id, track_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tracks_in_playlist(
    playlist_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<TrackRecord>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::get_playlist_tracks(&db, playlist_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_selected_playlist(
    playlist_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::delete_playlist(&db, playlist_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_setting(key: String, value: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::set_setting(&db, &key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_setting(key: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::get_setting(&db, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_presence(
    title: String,
    artist: String,
    album: String,
    year: Option<u32>,
    duration: f64,
    position: f64,
    cover_url: Option<String>,
    is_playing: bool,
    state: State<'_, AppState>,
) {
    state.discord.update_presence(
        &title,
        &artist,
        &album,
        year,
        duration,
        position,
        cover_url.as_deref(),
        is_playing,
    );
}

#[tauri::command]
pub fn clear_presence(state: State<'_, AppState>) {
    state.discord.clear();
}

#[tauri::command]
pub fn toggle_discord_rpc(enabled: bool, state: State<'_, AppState>) {
    state.discord.set_enabled(enabled);
}

#[tauri::command]
pub fn minimize_app(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn maximize_app(window: Window) -> Result<(), String> {
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn close_app(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_app_maximized(window: Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}
