use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const DEFAULT_DISCORD_APP_ID: &str = "1176718791388975124";

fn url_encode(s: &str) -> String {
    let mut encoded = String::with_capacity(s.len() * 2);
    for b in s.bytes() {
        match b {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' | b',' => {
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

// Upload local embedded cover to temporary online storage (1 day retention)
// so Discord RPC displays the exact local cover without API mismatch.
fn upload_cover_to_temp_storage(file_path: &Path) -> Option<String> {
    let mut file = File::open(file_path).ok()?;
    let mut file_bytes = Vec::new();
    file.read_to_end(&mut file_bytes).ok()?;
    if file_bytes.is_empty() {
        return None;
    }

    let mut config = ureq::config::Config::builder();
    config = config.timeout_global(Some(Duration::from_secs(8)));
    let agent: ureq::Agent = config.build().into();

    let boundary = "----MusicBoxBoundary123456789";
    let content_type = format!("multipart/form-data; boundary={}", boundary);

    // 1. Primary: Uguu.se (auto-deletes after 24 hours, zero registration, public image CDN)
    let mut uguu_body = Vec::with_capacity(file_bytes.len() + 512);
    uguu_body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    uguu_body.extend_from_slice(b"Content-Disposition: form-data; name=\"files[]\"; filename=\"cover.jpg\"\r\n");
    uguu_body.extend_from_slice(b"Content-Type: image/jpeg\r\n\r\n");
    uguu_body.extend_from_slice(&file_bytes);
    uguu_body.extend_from_slice(format!("\r\n--{}--\r\n", boundary).as_bytes());

    if let Ok(mut resp) = agent
        .post("https://uguu.se/upload")
        .header("Content-Type", &content_type)
        .header("User-Agent", "MusicBox/1.0")
        .send(&uguu_body)
    {
        if let Ok(json_str) = resp.body_mut().read_to_string() {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                if let Some(url) = val["files"][0]["url"].as_str() {
                    return Some(url.to_string());
                }
            }
        }
    }

    // 2. Fallback: Freeimage.host (instant public direct image CDN)
    let mut fbody = Vec::with_capacity(file_bytes.len() + 1024);
    fbody.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    fbody.extend_from_slice(b"Content-Disposition: form-data; name=\"key\"\r\n\r\n6d207e02198a847aa98d0a2a901485a5\r\n");
    fbody.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    fbody.extend_from_slice(b"Content-Disposition: form-data; name=\"action\"\r\n\r\nupload\r\n");
    fbody.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    fbody.extend_from_slice(b"Content-Disposition: form-data; name=\"format\"\r\n\r\njson\r\n");
    fbody.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    fbody.extend_from_slice(b"Content-Disposition: form-data; name=\"source\"; filename=\"cover.jpg\"\r\n");
    fbody.extend_from_slice(b"Content-Type: image/jpeg\r\n\r\n");
    fbody.extend_from_slice(&file_bytes);
    fbody.extend_from_slice(format!("\r\n--{}--\r\n", boundary).as_bytes());

    if let Ok(mut resp) = agent
        .post("https://freeimage.host/api/1/upload")
        .header("Content-Type", &content_type)
        .header("User-Agent", "MusicBox/1.0")
        .send(&fbody)
    {
        if let Ok(json_str) = resp.body_mut().read_to_string() {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                if let Some(url) = val["image"]["url"].as_str() {
                    return Some(url.to_string());
                }
            }
        }
    }

    None
}

pub struct DiscordManager {
    client: Mutex<Option<DiscordIpcClient>>,
    enabled: Mutex<bool>,
    current_app_id: Mutex<String>,
    // cover_path -> (online_url, upload_timestamp_secs)
    temp_cover_cache: Mutex<HashMap<String, (String, u64)>>,
    active_cover_path: Mutex<Option<String>>,
}

impl DiscordManager {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
            enabled: Mutex::new(true),
            current_app_id: Mutex::new(DEFAULT_DISCORD_APP_ID.to_string()),
            temp_cover_cache: Mutex::new(HashMap::new()),
            active_cover_path: Mutex::new(None),
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
        cover_path: Option<&str>,
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

        // Segment 1 in Discord RPC: artist only (album removed per user request)
            let state_str = if artist.is_empty() {
                "Unknown Artist".to_string()
            } else {
                artist.to_string()
            };

            // Segment 2 in Discord RPC: album with year in brackets if present in metadata
            let album_display = if let Some(y) = year {
                if y > 0 && !album.is_empty() {
                    format!("{} ({})", album, y)
                } else {
                    album.to_string()
                }
            } else {
                album.to_string()
            };

            let safe_album_display: String = if album_display.chars().count() > 128 {
                let mut s: String = album_display.chars().take(125).collect();
                s.push_str("...");
                s
            } else {
                album_display
            };

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            // Resolve 100% accurate album art from local embedded cover if available:
            // Upload to temporary storage (24h retention), reuse on loop, re-upload if looping > 24h,
            // and clean up active song reference on song change.
            let mut effective_cover_url: Option<String> = None;

            if let Some(cpath) = cover_path {
                let trimmed = cpath.trim();
                if !trimmed.is_empty() {
                    let p = Path::new(trimmed);
                    if p.is_file() {
                        let mut active = self.active_cover_path.lock().unwrap();
                        let cache = self.temp_cover_cache.lock().unwrap();
                        let now_secs = now as u64;

                        // Song changed: update active track reference
                        if active.as_deref() != Some(trimmed) {
                            *active = Some(trimmed.to_string());
                        }

                        let mut needs_upload = true;
                        if let Some((url, timestamp)) = cache.get(trimmed) {
                            // If on loop within 24 hours (86400s), reuse existing temporary URL
                            if now_secs.saturating_sub(*timestamp) < 86400 {
                                effective_cover_url = Some(url.clone());
                                needs_upload = false;
                            }
                        }

                        if needs_upload {
                            drop(active);
                            drop(cache);
                            if let Some(uploaded_url) = upload_cover_to_temp_storage(p) {
                                let mut cache = self.temp_cover_cache.lock().unwrap();
                                cache.insert(trimmed.to_string(), (uploaded_url.clone(), now_secs));
                                effective_cover_url = Some(uploaded_url);
                            }
                        }
                    }
                }
            }

            // Fallback to online cover_url if local artwork is not embedded or upload failed
            if effective_cover_url.is_none() {
                effective_cover_url = cover_url.map(|s| s.to_string());
            }

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

            let clean_artist = artist
                .split(',')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty() && *s != "Unknown Artist")
                .collect::<Vec<_>>()
                .join(", ");
            let safe_artist = clean_artist.as_str();

            let search_query = if !safe_artist.is_empty() {
                format!("{} {}", title, safe_artist)
            } else {
                title.to_string()
            };

            // 1. Song Title Link (Last.fm track page with JioSaavn fallback)
            let track_url = if !safe_artist.is_empty() {
                format!(
                    "https://www.last.fm/music/{}/_/{}",
                    url_encode(safe_artist),
                    url_encode(title)
                )
            } else {
                format!(
                    "https://www.jiosaavn.com/search/{}",
                    url_encode(&search_query)
                )
            };

            // 2. Artist Link (Last.fm artist page with JioSaavn fallback)
            let artist_url = if !safe_artist.is_empty() {
                format!(
                    "https://www.last.fm/music/{}",
                    url_encode(safe_artist)
                )
            } else {
                format!(
                    "https://www.jiosaavn.com/search/{}",
                    url_encode(artist)
                )
            };

            // 3. Album Link (Last.fm album page with JioSaavn fallback)
            let album_url = if !album.is_empty() && album != "Unknown Album" && !safe_artist.is_empty() {
                format!(
                    "https://www.last.fm/music/{}/{}",
                    url_encode(safe_artist),
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

            let (small_image_url, small_text) = if is_playing {
                (
                    "https://raw.githubusercontent.com/cbladeOfficial/MusicBox/main/public/play.png",
                    "Playing",
                )
            } else {
                (
                    "https://raw.githubusercontent.com/cbladeOfficial/MusicBox/main/public/pause.png",
                    "Paused",
                )
            };
            assets = assets.small_image(small_image_url).small_text(small_text);

            if let Some(ref url) = effective_cover_url {
                if url.starts_with("http://") || url.starts_with("https://") {
                    assets = assets.large_image(url.as_str()).large_text(&safe_album_display).large_url(&album_url);
                } else if self.is_default_app() {
                    assets = assets.large_image("spotube-logo-foreground").large_text(&safe_album_display).large_url(&album_url);
                } else {
                    assets = assets.large_image(default_icon_url).large_text(&safe_album_display).large_url(&album_url);
                }
            } else if self.is_default_app() {
                assets = assets.large_image("spotube-logo-foreground").large_text(&safe_album_display).large_url(&album_url);
            } else {
                assets = assets.large_image(default_icon_url).large_text(&safe_album_display).large_url(&album_url);
            }

        act = act.assets(assets);

        // Only acquire client_lock for the fast IPC set_activity call
        let mut client_lock = self.client.lock().unwrap();
        if let Some(client) = client_lock.as_mut() {
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

            let (small_image_url, small_text) = if is_playing {
                (
                    "https://raw.githubusercontent.com/cbladeOfficial/MusicBox/main/public/play.png",
                    "Playing",
                )
            } else {
                (
                    "https://raw.githubusercontent.com/cbladeOfficial/MusicBox/main/public/pause.png",
                    "Paused",
                )
            };
            assets = assets.small_image(small_image_url).small_text(small_text);

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
            None,
            true,
            None,
        );
        let client_lock = dm.client.lock().unwrap();
        println!("Client connected? {}", client_lock.is_some());
        assert!(client_lock.is_some());
    }
}
