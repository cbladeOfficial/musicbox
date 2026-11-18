use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use crate::commands::AppState;
use crate::db;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UpdateCheckResult {
    pub update_available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_name: Option<String>,
    pub release_notes: Option<String>,
    pub published_at: Option<String>,
    pub download_url: Option<String>,
    pub file_size: Option<u64>,
    pub file_name: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PendingUpdateInfo {
    pub version: String,
    pub file_name: String,
    pub file_size: u64,
    pub ready_to_install: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DownloadProgress {
    pub percent: f64,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

#[derive(Deserialize, Debug)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
    size: Option<u64>,
}

#[derive(Deserialize, Debug)]
struct GitHubRelease {
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    published_at: Option<String>,
    assets: Vec<GitHubAsset>,
}

fn get_updates_dir() -> PathBuf {
    if let Some(app_data) = std::env::var_os("APPDATA") {
        PathBuf::from(app_data).join("com.cblade.musicbox").join("updates")
    } else {
        std::env::temp_dir().join("musicbox_updates")
    }
}

pub fn is_newer_version(current: &str, latest: &str) -> bool {
    let clean_current = current.trim().trim_start_matches(|c| c == 'v' || c == 'V');
    let clean_latest = latest.trim().trim_start_matches(|c| c == 'v' || c == 'V');

    let current_parts: Vec<u32> = clean_current
        .split(|c: char| !c.is_ascii_digit())
        .filter_map(|s| s.parse().ok())
        .collect();

    let latest_parts: Vec<u32> = clean_latest
        .split(|c: char| !c.is_ascii_digit())
        .filter_map(|s| s.parse().ok())
        .collect();

    for i in 0..std::cmp::max(current_parts.len(), latest_parts.len()) {
        let cur = current_parts.get(i).copied().unwrap_or(0);
        let lat = latest_parts.get(i).copied().unwrap_or(0);
        if lat > cur {
            return true;
        } else if lat < cur {
            return false;
        }
    }

    false
}

#[tauri::command]
pub fn check_for_updates() -> Result<UpdateCheckResult, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let url = "https://api.github.com/repos/cbladeOfficial/musicbox/releases/latest";

    let mut response = match ureq::get(url)
        .header("User-Agent", "MusicBox-App")
        .call()
    {
        Ok(resp) => resp,
        Err(_e) => {
            return Ok(UpdateCheckResult {
                update_available: false,
                current_version: current_version.clone(),
                latest_version: current_version,
                release_name: None,
                release_notes: None,
                published_at: None,
                download_url: None,
                file_size: None,
                file_name: None,
            });
        }
    };

    let body_str = match response.body_mut().read_to_string() {
        Ok(s) => s,
        Err(_) => {
            return Ok(UpdateCheckResult {
                update_available: false,
                current_version: current_version.clone(),
                latest_version: current_version,
                release_name: None,
                release_notes: None,
                published_at: None,
                download_url: None,
                file_size: None,
                file_name: None,
            });
        }
    };

    let release: GitHubRelease = match serde_json::from_str(&body_str) {
        Ok(rel) => rel,
        Err(_) => {
            return Ok(UpdateCheckResult {
                update_available: false,
                current_version: current_version.clone(),
                latest_version: current_version,
                release_name: None,
                release_notes: None,
                published_at: None,
                download_url: None,
                file_size: None,
                file_name: None,
            });
        }
    };

    let latest_version = release.tag_name.trim_start_matches(|c| c == 'v' || c == 'V').to_string();
    let update_available = is_newer_version(&current_version, &latest_version);

    // Find the Windows installer asset (.exe)
    let asset = release
        .assets
        .iter()
        .find(|a| a.name.ends_with(".exe") && (a.name.contains("setup") || a.name.contains("MusicBox")))
        .or_else(|| release.assets.iter().find(|a| a.name.ends_with(".exe")));

    Ok(UpdateCheckResult {
        update_available: update_available && asset.is_some(),
        current_version,
        latest_version: release.tag_name,
        release_name: release.name,
        release_notes: release.body,
        published_at: release.published_at,
        download_url: asset.map(|a| a.browser_download_url.clone()),
        file_size: asset.and_then(|a| a.size),
        file_name: asset.map(|a| a.name.clone()),
    })
}

#[tauri::command]
pub fn get_pending_update_status() -> Result<Option<PendingUpdateInfo>, String> {
    let updates_dir = get_updates_dir();
    let pending_exe = updates_dir.join("pending_update.exe");
    let pending_ver = updates_dir.join("pending_version.txt");

    if pending_exe.is_file() {
        let size = fs::metadata(&pending_exe).map(|m| m.len()).unwrap_or(0);
        let version = fs::read_to_string(&pending_ver)
            .unwrap_or_else(|_| "Unknown".to_string())
            .trim()
            .to_string();

        let current_version = env!("CARGO_PKG_VERSION");
        // If the pending version is still newer than current version, it's ready to install
        if is_newer_version(current_version, &version) {
            return Ok(Some(PendingUpdateInfo {
                version,
                file_name: "pending_update.exe".to_string(),
                file_size: size,
                ready_to_install: true,
            }));
        } else {
            // Outdated pending update, clean it up
            let _ = fs::remove_file(&pending_exe);
            let _ = fs::remove_file(&pending_ver);
        }
    }

    Ok(None)
}

#[tauri::command]
pub fn download_update(
    download_url: String,
    target_version: String,
    app_handle: AppHandle,
) -> Result<String, String> {
    let updates_dir = get_updates_dir();
    let _ = fs::create_dir_all(&updates_dir);

    let pending_exe = updates_dir.join("pending_update.exe");
    let pending_ver = updates_dir.join("pending_version.txt");
    let temp_exe = updates_dir.join("downloading_update.tmp");

    let mut response = ureq::get(&download_url)
        .header("User-Agent", "MusicBox-App")
        .call()
        .map_err(|e| format!("Failed to connect to update server: {}", e))?;

    let total_bytes: u64 = response
        .headers()
        .get("Content-Length")
        .and_then(|val| val.to_str().ok())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    let mut file = File::create(&temp_exe).map_err(|e| format!("Failed to create temp file: {}", e))?;
    let mut reader = response.body_mut().as_reader();
    let mut buffer = [0u8; 65536]; // 64 KB chunk
    let mut downloaded_bytes: u64 = 0;
    let mut last_percent_reported = -1;

    loop {
        let bytes_read = reader.read(&mut buffer).map_err(|e| format!("Download read error: {}", e))?;
        if bytes_read == 0 {
            break;
        }

        file.write_all(&buffer[..bytes_read])
            .map_err(|e| format!("Disk write error: {}", e))?;
        downloaded_bytes += bytes_read as u64;

        if total_bytes > 0 {
            let percent = ((downloaded_bytes as f64 / total_bytes as f64) * 100.0).round() as i32;
            if percent != last_percent_reported {
                last_percent_reported = percent;
                let _ = app_handle.emit(
                    "update-download-progress",
                    DownloadProgress {
                        percent: percent as f64,
                        downloaded_bytes,
                        total_bytes,
                    },
                );
            }
        }
    }

    file.flush().map_err(|e| e.to_string())?;
    drop(file);

    // Atomically rename tmp file to pending_update.exe
    let _ = fs::remove_file(&pending_exe);
    fs::rename(&temp_exe, &pending_exe).map_err(|e| format!("Failed to finalize update file: {}", e))?;
    let _ = fs::write(&pending_ver, target_version.trim().as_bytes());

    let _ = app_handle.emit("update-downloaded", target_version.clone());

    Ok(pending_exe.to_string_lossy().to_string())
}

#[tauri::command]
pub fn install_pending_update(app_handle: AppHandle) -> Result<(), String> {
    let updates_dir = get_updates_dir();
    let pending_exe = updates_dir.join("pending_update.exe");

    if !pending_exe.is_file() {
        return Err("No pending update file found".to_string());
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;

        // Launch detached batch sequence that waits 1.5 seconds for MusicBox to exit,
        // runs the NSIS installer silently (/S), and relaunches MusicBox.
        let cmd_str = format!(
            "timeout /t 2 /nobreak > nul & \"{}\" /S & timeout /t 1 /nobreak > nul & start \"\" \"{}\"",
            pending_exe.to_string_lossy(),
            current_exe.to_string_lossy()
        );

        std::process::Command::new("cmd")
            .args(&["/c", &cmd_str])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to spawn updater: {}", e))?;

        app_handle.exit(0);
        Ok(())
    }

    #[cfg(not(windows))]
    {
        Err("Auto-update is currently supported on Windows".to_string())
    }
}

pub fn try_apply_update_on_exit_silent(app_handle: &AppHandle) {
    let updates_dir = get_updates_dir();
    let pending_exe = updates_dir.join("pending_update.exe");
    let pending_ver = updates_dir.join("pending_version.txt");

    if !pending_exe.is_file() {
        return;
    }

    // Check user setting autoInstallOnNextStart (defaults to true)
    if let Some(state) = app_handle.try_state::<AppState>() {
        if let Ok(db_guard) = state.db.lock() {
            if let Ok(Some(settings_str)) = db::get_setting(&db_guard, "user_settings") {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&settings_str) {
                    if val.get("autoInstallOnNextStart").and_then(|v| v.as_bool()) == Some(false) {
                        return;
                    }
                }
            }
        }
    }

    let current_version = env!("CARGO_PKG_VERSION");
    let target_version = fs::read_to_string(&pending_ver).unwrap_or_default();
    if !is_newer_version(current_version, &target_version) {
        let _ = fs::remove_file(&pending_exe);
        let _ = fs::remove_file(&pending_ver);
        return;
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // When the user closes the app, run the silent installer so next start is updated
        let cmd_str = format!(
            "timeout /t 2 /nobreak > nul & \"{}\" /S",
            pending_exe.to_string_lossy()
        );

        let _ = std::process::Command::new("cmd")
            .args(&["/c", &cmd_str])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }
}
