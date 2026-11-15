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
        let target_id = if trimmed.is_empty() {
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
                    format!("{} • {} ({})", artist, album, y)
                } else {
                    format!("{} • {}", artist, album)
                }
            } else {
                format!("{} • {}", artist, album)
            };

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let mut act = activity::Activity::new()
                .name("MusicBox")
                .activity_type(activity::ActivityType::Listening)
                .status_display_type(activity::StatusDisplayType::Name)
                .details(title)
                .state(&state_str);

            if is_playing && duration_secs > 0.0 {
                let start_time = now - position_secs as i64;
                let end_time = start_time + duration_secs as i64;
                act = act.timestamps(activity::Timestamps::new().start(start_time).end(end_time));
            }

            let mut assets = activity::Assets::new();
            if let Some(url) = cover_url {
                if !url.is_empty() {
                    assets = assets.large_image(url).large_text(album);
                } else {
                    assets = assets.large_image("app_icon").large_text(album);
                }
            } else {
                assets = assets.large_image("app_icon").large_text(album);
            }

            if is_playing {
                assets = assets.small_image("play").small_text("Playing");
            } else {
                assets = assets.small_image("pause").small_text("Paused");
            }

            act = act.assets(assets);

            if client.set_activity(act).is_err() {
                // If set_activity fails (e.g. Discord restarted), clear client to reconnect next turn
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
            let details_str = match song_title {
                Some(t) if !t.trim().is_empty() => t.trim().to_string(),
                _ => station_name.to_string(),
            };

            let state_str = match artist {
                Some(a) if !a.trim().is_empty() && a != "Live Radio" => {
                    format!("by {} • Radio: {}", a.trim(), station_name)
                }
                _ => format!("Radio: {}", station_name),
            };

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let mut act = activity::Activity::new()
                .name("MusicBox")
                .activity_type(activity::ActivityType::Listening)
                .status_display_type(activity::StatusDisplayType::Name)
                .details(&details_str)
                .state(&state_str);

            if is_playing {
                act = act.timestamps(activity::Timestamps::new().start(now));
            }

            let mut assets = activity::Assets::new();
            if let Some(url) = icon_url {
                if !url.is_empty() {
                    assets = assets.large_image(url).large_text(station_name);
                } else {
                    assets = assets.large_image("app_icon").large_text(station_name);
                }
            } else {
                assets = assets.large_image("app_icon").large_text(station_name);
            }

            if is_playing {
                assets = assets.small_image("play").small_text("Live Radio");
            } else {
                assets = assets.small_image("pause").small_text("Radio Paused");
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
