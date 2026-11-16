use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const DEFAULT_DISCORD_APP_ID: &str = "1176718791388975124";

fn url_encode(s: &str) -> String {
    let mut encoded = String::with_capacity(s.len() * 2);
    for b in s.bytes() {
        match b {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(b as char);
            }
            b' ' => encoded.push('+'),
            _ => {
                encoded.push_str(&format!("%{:02X}", b));
            }
        }
    }
    encoded
}

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
            let state_str = if !album.is_empty() {
                if let Some(y) = year {
                    if y > 0 {
                        format!("{} • {} ({})", artist, album, y)
                    } else {
                        format!("{} • {}", artist, album)
                    }
                } else {
                    format!("{} • {}", artist, album)
                }
            } else {
                artist.to_string()
            };

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let safe_title: String = if title.chars().count() > 128 {
                let mut s: String = title.chars().take(125).collect();
                s.push_str("...");
                s
            } else {
                title.to_string()
            };

            let safe_state: String = if state_str.chars().count() > 128 {
                let mut s: String = state_str.chars().take(125).collect();
                s.push_str("...");
                s
            } else {
                state_str
            };

            let primary_artist = artist.split(',').next().unwrap_or(artist).trim();
            let safe_primary_artist = if primary_artist.is_empty() || primary_artist == "Unknown Artist" {
                ""
            } else {
                primary_artist
            };

            let search_query = if !safe_primary_artist.is_empty() {
                format!("{} {}", title, safe_primary_artist)
            } else {
                title.to_string()
            };

            // 1. Song Title Link (Last.fm track page with JioSaavn fallback)
            let track_url = if !safe_primary_artist.is_empty() {
                format!(
                    "https://www.last.fm/music/{}/_/{}",
                    url_encode(safe_primary_artist),
                    url_encode(title)
                )
            } else {
                format!(
                    "https://www.jiosaavn.com/search/{}",
                    url_encode(&search_query)
                )
            };

            // 2. Artist Link (Last.fm artist page with JioSaavn fallback)
            let artist_url = if !safe_primary_artist.is_empty() {
                format!(
                    "https://www.last.fm/music/{}",
                    url_encode(safe_primary_artist)
                )
            } else {
                format!(
                    "https://www.jiosaavn.com/search/{}",
                    url_encode(artist)
                )
            };

            // 3. Album Link (Last.fm album page with JioSaavn fallback)
            let album_url = if !album.is_empty() && album != "Unknown Album" && !safe_primary_artist.is_empty() {
                format!(
                    "https://www.last.fm/music/{}/{}",
                    url_encode(safe_primary_artist),
                    url_encode(album)
                )
            } else {
                format!(
                    "https://www.jiosaavn.com/search/{}",
                    url_encode(&format!("{} album", if !album.is_empty() && album != "Unknown Album" { album } else { &search_query }))
                )
            };

            let jiosaavn_url = format!(
                "https://www.jiosaavn.com/search/{}",
                url_encode(&search_query)
            );

            let mut act = activity::Activity::new()
                .name("MusicBox")
                .activity_type(activity::ActivityType::Listening)
                .details(&safe_title)
                .details_url(&track_url)
                .state(&safe_state)
                .state_url(&artist_url);

            let buttons = vec![
                activity::Button::new("Play on Last.fm", &track_url),
                activity::Button::new("Find on JioSaavn", &jiosaavn_url),
            ];
            act = act.buttons(buttons);

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
                    assets = assets.large_image(url).large_text(album).large_url(&album_url);
                } else if self.is_default_app() {
                    assets = assets.large_image("spotube-logo-foreground").large_text(album).large_url(&album_url);
                } else {
                    assets = assets.large_image(default_icon_url).large_text(album).large_url(&album_url);
                }
            } else if self.is_default_app() {
                assets = assets.large_image("spotube-logo-foreground").large_text(album).large_url(&album_url);
            } else {
                assets = assets.large_image(default_icon_url).large_text(album).large_url(&album_url);
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

            let safe_song = if song.chars().count() > 128 {
                let mut s: String = song.chars().take(125).collect();
                s.push_str("...");
                s
            } else {
                song.to_string()
            };

            let state_str = match artist {
                Some(a) if !a.trim().is_empty() && a != "Live Radio" => {
                    format!("{} • Radio: {}", a.trim(), station_name)
                }
                _ => format!("Radio: {}", station_name),
            };

            let safe_state: String = if state_str.chars().count() > 128 {
                let mut s: String = state_str.chars().take(125).collect();
                s.push_str("...");
                s
            } else {
                state_str
            };

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let radio_query = match artist {
                Some(a) if !a.trim().is_empty() && a != "Live Radio" => {
                    format!("{} {}", song, a.trim())
                }
                _ => song.to_string(),
            };

            let jiosaavn_radio_url = format!(
                "https://www.jiosaavn.com/search/{}",
                url_encode(&radio_query)
            );
            let lastfm_radio_url = format!(
                "https://www.last.fm/search?q={}",
                url_encode(&radio_query)
            );

            let mut act = activity::Activity::new()
                .name("MusicBox")
                .activity_type(activity::ActivityType::Listening)
                .details(&safe_song)
                .details_url(&jiosaavn_radio_url)
                .state(&safe_state)
                .state_url(&lastfm_radio_url);

            let buttons = vec![
                activity::Button::new("Find on JioSaavn", &jiosaavn_radio_url),
                activity::Button::new("Search on Last.fm", &lastfm_radio_url),
            ];
            act = act.buttons(buttons);

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
