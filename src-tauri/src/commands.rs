use crate::db::{self, PlaylistRecord, RadioStation, TrackRecord};
use crate::discord::DiscordManager;
use crate::radio::{self, RadioMetadata};
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
pub fn rename_selected_playlist(
    playlist_id: i64,
    new_name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::rename_playlist(&db, playlist_id, &new_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_track_info(
    track_id: i64,
    title: String,
    artist: String,
    album: String,
    genre: Option<String>,
    year: Option<u32>,
    track_number: Option<u32>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::update_track_metadata(
        &db,
        track_id,
        &title,
        &artist,
        &album,
        genre.as_deref(),
        year,
        track_number,
    )
    .map_err(|e| e.to_string())
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
    client_id: Option<String>,
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
        client_id.as_deref(),
    );
}

#[tauri::command]
pub fn set_discord_client_id(client_id: String, state: State<'_, AppState>) {
    state.discord.set_client_id(&client_id);
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
pub fn maximize_app(window: Window) -> Result<bool, String> {
    let is_max = window.is_maximized().map_err(|e| e.to_string())?;
    if is_max {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
pub fn close_app(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn center_app(window: Window) -> Result<(), String> {
    window.center().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_app_maximized(window: Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn show_in_file_manager(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let norm = path.replace('/', "\\");
        let _ = Command::new("explorer")
            .arg(format!("/select,{}", norm))
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        Ok(())
    }
}

#[tauri::command]
pub fn update_taskbar_playback_state(is_playing: bool) {
    crate::taskbar::win::update_playback_state(is_playing);
}

#[tauri::command]
pub fn get_radio_stations(state: State<'_, AppState>) -> Result<Vec<RadioStation>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::get_radio_stations(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_radio_station(
    name: String,
    url: String,
    favicon: Option<String>,
    tags: Option<String>,
    country: Option<String>,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::add_radio_station(
        &db,
        &name,
        &url,
        favicon.as_deref(),
        tags.as_deref(),
        country.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_radio_station(
    id: i64,
    name: String,
    url: String,
    favicon: Option<String>,
    tags: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::update_radio_station(&db, id, &name, &url, favicon.as_deref(), tags.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_radio_station(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::delete_radio_station(&db, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_radio_favorite(id: i64, state: State<'_, AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db::toggle_radio_favorite(&db, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_radio_metadata(stream_url: String) -> Result<Option<RadioMetadata>, String> {
    let res = tauri::async_runtime::spawn_blocking(move || {
        radio::fetch_icy_metadata(&stream_url)
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(res)
}

#[tauri::command]
pub fn update_radio_presence(
    station_name: String,
    song_title: Option<String>,
    artist: Option<String>,
    icon_url: Option<String>,
    is_playing: bool,
    client_id: Option<String>,
    state: State<'_, AppState>,
) {
    state.discord.update_radio_presence(
        &station_name,
        song_title.as_deref(),
        artist.as_deref(),
        icon_url.as_deref(),
        is_playing,
        client_id.as_deref(),
    );
}
