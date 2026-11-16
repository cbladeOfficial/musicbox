use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const DEFAULT_DISCORD_APP_ID: &str = "1176718791388975124";

pub struct DiscordManager {
    client: Mutex<Option<DiscordIpcClient>>,
    enabled: Mutex<bool>,
    current_app_id: Mutex<String>,
}

impl DiscordManager {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
            enabled: Mutex::new(true),
            current_app_id: Mutex::new(DEFAULT_DISCORD_APP_ID.to_string()),
        }
    }

    pub fn set_enabled(&self, enable: bool) {
        let mut en = self.enabled.lock().unwrap();
        *en = enable;
        if !enable {
            self.clear();
        }
    }

    pub fn set_client_id(&self, app_id: &str) {
        let trimmed = app_id.trim();
        let target_id = if trimmed.is_empty() || trimmed == "1306646875971485777" {
            DEFAULT_DISCORD_APP_ID
        } else {
            trimmed
        };

        let mut current = self.current_app_id.lock().unwrap();
        if *current != target_id {
            *current = target_id.to_string();
            // Disconnect old client so next update connects to the new app id
            let mut client_lock = self.client.lock().unwrap();
            if let Some(mut old_client) = client_lock.take() {
                let _ = old_client.close();
            }
        }
    }

    fn ensure_connected(&self) -> bool {
        let mut client_lock = self.client.lock().unwrap();
        if client_lock.is_some() {
            return true;
        }

        let app_id = self.current_app_id.lock().unwrap().clone();
        let mut client = DiscordIpcClient::new(&app_id);
        if client.connect().is_ok() {
            *client_lock = Some(client);
            return true;
        }
        false
    }

    fn is_default_app(&self) -> bool {
        self.current_app_id.lock().unwrap().as_str() == DEFAULT_DISCORD_APP_ID
    }

    pub fn update_presence(
        &self,
        title: &str,
        artist: &str,
        album: &str,
        year: Option<u32>,
        duration_secs: f64,
        position_secs: f64,
        cover_url: Option<&str>,
        is_playing: bool,
        custom_app_id: Option<&str>,
    ) {
        let en = *self.enabled.lock().unwrap();
        if !en {
            return;
        }

        if let Some(id) = custom_app_id {
            if !id.trim().is_empty() {
                self.set_client_id(id);
            }
        }

        if !self.ensure_connected() {
            return;
        }

        let mut client_lock = self.client.lock().unwrap();
        if let Some(client) = client_lock.as_mut() {
            let state_str = if let Some(y) = year {
                if y > 0 {
                    format!("{} - {} ({})", title, artist, y)
                } else {
                    format!("{} - {}", title, artist)
                }
            } else if !album.is_empty() {
                format!("{} - {} • {}", title, artist, album)
            } else {
                format!("{} - {}", title, artist)
            };

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let safe_state: String = if state_str.chars().count() > 128 {
                let mut s: String = state_str.chars().take(125).collect();
                s.push_str("...");
                s
            } else {
                state_str
            };

            // In Discord IPC, ActivityType::Listening and status_display_type cause
            // Discord to reject/close the IPC pipe for 3rd-party client IDs.
            // We set details to "Listening to MusicBox" so Discord shows it prominently.
            let mut act = activity::Activity::new()
                .details("Listening to MusicBox")
                .state(&safe_state);

            if is_playing && duration_secs > 0.0 {
                let start_time = now - position_secs as i64;
                let end_time = start_time + duration_secs as i64;
                act = act.timestamps(activity::Timestamps::new().start(start_time).end(end_time));
            }

            let default_icon_url =
                "https://raw.githubusercontent.com/cbladeOfficial/MusicBox/main/public/app-icon.png";
            let mut assets = activity::Assets::new();

            if let Some(url) = cover_url {
                if url.starts_with("http://") || url.starts_with("https://") {
                    assets = assets.large_image(url).large_text(album);
                } else if self.is_default_app() {
                    assets = assets.large_image("spotube-logo-foreground").large_text(album);
                } else {
                    assets = assets.large_image(default_icon_url).large_text(album);
                }
            } else if self.is_default_app() {
                assets = assets.large_image("spotube-logo-foreground").large_text(album);
            } else {
                assets = assets.large_image(default_icon_url).large_text(album);
            }

            act = act.assets(assets);

            if client.set_activity(act).is_err() {
                // If set_activity fails, reset connection so it reconnects on next update
                *client_lock = None;
            }
        }
    }

    pub fn update_radio_presence(
        &self,
        station_name: &str,
        song_title: Option<&str>,
        artist: Option<&str>,
        icon_url: Option<&str>,
        is_playing: bool,
        custom_app_id: Option<&str>,
    ) {
        let en = *self.enabled.lock().unwrap();
        if !en {
            return;
        }

        if let Some(id) = custom_app_id {
            if !id.trim().is_empty() {
                self.set_client_id(id);
            }
        }

        if !self.ensure_connected() {
            return;
        }

        let mut client_lock = self.client.lock().unwrap();
        if let Some(client) = client_lock.as_mut() {
            let song = match song_title {
                Some(t) if !t.trim().is_empty() => t.trim(),
                _ => station_name,
            };

            let state_str = match artist {
                Some(a) if !a.trim().is_empty() && a != "Live Radio" => {
                    format!("{} - {} • Radio: {}", song, a.trim(), station_name)
                }
                _ => format!("{} • Radio: {}", song, station_name),
            };

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let mut act = activity::Activity::new()
                .details("Listening to MusicBox (Radio)")
                .state(&state_str);

            if is_playing {
                act = act.timestamps(activity::Timestamps::new().start(now));
            }

            let default_icon_url =
                "https://raw.githubusercontent.com/cbladeOfficial/MusicBox/main/public/app-icon.png";
            let mut assets = activity::Assets::new();

            if let Some(url) = icon_url {
                if url.starts_with("http://") || url.starts_with("https://") {
                    assets = assets.large_image(url).large_text(station_name);
                } else if self.is_default_app() {
                    assets = assets
                        .large_image("spotube-logo-foreground")
                        .large_text(station_name);
                } else {
                    assets = assets.large_image(default_icon_url).large_text(station_name);
                }
            } else if self.is_default_app() {
                assets = assets
                    .large_image("spotube-logo-foreground")
                    .large_text(station_name);
            } else {
                assets = assets.large_image(default_icon_url).large_text(station_name);
            }

            act = act.assets(assets);

            if client.set_activity(act).is_err() {
                *client_lock = None;
            }
        }
    }

    pub fn clear(&self) {
        let mut client_lock = self.client.lock().unwrap();
        if let Some(client) = client_lock.as_mut() {
            let _ = client.clear_activity();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_presence() {
        let dm = DiscordManager::new();
        dm.update_presence(
            "Test Song",
            "Test Artist",
            "Test Album",
            Some(2024),
            180.0,
            10.0,
            Some("https://raw.githubusercontent.com/cbladeOfficial/MusicBox/main/public/app-icon.png"),
            true,
            None,
        );
        let client_lock = dm.client.lock().unwrap();
        println!("Client connected? {}", client_lock.is_some());
        assert!(client_lock.is_some());
    }
}
