mod commands;
mod db;
mod discord;
mod scanner;
mod server;

use commands::*;
use discord::DiscordManager;
use std::fs;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _port = server::start_stream_server();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle();
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap().join(".musicbox"));

            let _ = fs::create_dir_all(&app_data_dir);
            let db_path = app_data_dir.join("musicbox.db");
            let conn = db::init_db(&db_path).expect("Failed to initialize database");

            let state = AppState {
                db: Mutex::new(conn),
                discord: DiscordManager::new(),
                cache_dir: app_data_dir,
            };

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_stream_port,
            scan_music_directory,
            get_tracks,
            toggle_track_favorite,
            record_track_played,
            create_new_playlist,
            get_all_playlists,
            add_track_to_playlist,
            remove_track_from_playlist,
            get_tracks_in_playlist,
            delete_selected_playlist,
            save_setting,
            load_setting,
            update_presence,
            clear_presence,
            toggle_discord_rpc,
            minimize_app,
            maximize_app,
            close_app,
            is_app_maximized,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
