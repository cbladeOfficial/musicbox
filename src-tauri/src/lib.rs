mod commands;
mod db;
mod discord;
mod radio;
mod scanner;
mod server;
mod taskbar;

use commands::*;
use discord::DiscordManager;
use std::fs;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    taskbar::win::set_app_user_model_id();

    let _port = server::start_stream_server();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
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

            // Automatically migrate and refresh multi-artist track tags in database
            if db::get_setting(&conn, "all_artists_migrated_v2").ok().flatten().is_none() {
                db::refresh_all_track_artists(&conn, &app_data_dir);
                let _ = db::set_setting(&conn, "all_artists_migrated_v2", "true");
            }

            // Check if user configured startMaximized (defaults to true)
            let start_maximized = db::get_setting(&conn, "user_settings")
                .ok()
                .flatten()
                .and_then(|json_str| {
                    serde_json::from_str::<serde_json::Value>(&json_str).ok()
                })
                .and_then(|val| val.get("startMaximized").and_then(|b| b.as_bool()))
                .unwrap_or(true);

            let app_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png")).ok();

            if let Some(window) = app.get_webview_window("main") {
                if let Some(ref icon) = app_icon {
                    let _ = window.set_icon(icon.clone());
                }
                let _ = window.center();
                if start_maximized {
                    let _ = window.maximize();
                }

                #[cfg(windows)]
                {
                    if let Ok(hwnd) = window.hwnd() {
                        taskbar::win::init_taskbar(&app.handle(), hwnd);
                    }
                }
            }

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
            rename_selected_playlist,
            update_track_info,
            save_setting,
            load_setting,
            update_presence,
            set_discord_client_id,
            clear_presence,
            toggle_discord_rpc,
            minimize_app,
            maximize_app,
            center_app,
            close_app,
            is_app_maximized,
            get_radio_stations,
            add_radio_station,
            update_radio_station,
            delete_radio_station,
            toggle_radio_favorite,
            fetch_radio_metadata,
            update_radio_presence,
            update_taskbar_playback_state,
            show_in_file_manager,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
