use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct DiscordManager {
    client: Mutex<Option<DiscordIpcClient>>,
    enabled: Mutex<bool>,
}

impl DiscordManager {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
            enabled: Mutex::new(true),
        }
    }

    pub fn set_enabled(&self, enable: bool) {
        let mut en = self.enabled.lock().unwrap();
        *en = enable;
        if !enable {
            self.clear();
        }
    }

    fn ensure_connected(&self) -> bool {
        let mut client_lock = self.client.lock().unwrap();
        if client_lock.is_some() {
            return true;
        }

        // MusicBox Discord Client ID
        let app_id = "1306646875971485777";
        let mut client = DiscordIpcClient::new(app_id);
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
    ) {
        let en = *self.enabled.lock().unwrap();
        if !en {
            return;
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
                // If set_activity fails, disconnect to retry on next cycle
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
