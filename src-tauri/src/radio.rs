use serde::{Deserialize, Serialize};
use std::io::Read;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RadioMetadata {
    pub title: String,
    pub artist: String,
    pub raw: String,
    pub station_name: Option<String>,
}

pub fn fetch_icy_metadata(stream_url: &str) -> Option<RadioMetadata> {
    // 1. Build ureq request with Icy-MetaData header and short timeout
    let mut config = ureq::config::Config::builder();
    config = config.timeout_global(Some(Duration::from_secs(5)));
    let agent: ureq::Agent = config.build().into();

    let resp = agent
        .get(stream_url)
        .header("Icy-MetaData", "1")
        .header("User-Agent", "MusicBox/1.0")
        .call()
        .ok()?;

    let station_name = resp
        .headers()
        .get("icy-name")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let metaint: usize = resp
        .headers()
        .get("icy-metaint")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    let mut body = resp.into_body().into_reader();

    if metaint > 0 && metaint <= 65536 {
        // Discard first `metaint` audio bytes
        let mut discard = vec![0u8; metaint];
        if body.read_exact(&mut discard).is_ok() {
            // Read length byte
            let mut len_byte = [0u8; 1];
            if body.read_exact(&mut len_byte).is_ok() {
                let meta_len = (len_byte[0] as usize) * 16;
                if meta_len > 0 && meta_len <= 4096 {
                    let mut meta_bytes = vec![0u8; meta_len];
                    if body.read_exact(&mut meta_bytes).is_ok() {
                        let meta_str = String::from_utf8_lossy(&meta_bytes);
                        // Search for StreamTitle='...';
                        if let Some(start) = meta_str.find("StreamTitle='") {
                            let after = &meta_str[start + 13..];
                            if let Some(end) = after.find("';") {
                                let stream_title = after[..end].trim();
                                if !stream_title.is_empty() {
                                    return Some(parse_stream_title(stream_title, station_name));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if let Some(st_name) = station_name {
        Some(RadioMetadata {
            title: st_name.clone(),
            artist: "Live Radio".to_string(),
            raw: st_name,
            station_name: None,
        })
    } else {
        None
    }
}

fn parse_stream_title(stream_title: &str, station_name: Option<String>) -> RadioMetadata {
    let clean = stream_title.trim();
    // Split by " - " or " – "
    let parts: Vec<&str> = if clean.contains(" - ") {
        clean.splitn(2, " - ").collect()
    } else if clean.contains(" – ") {
        clean.splitn(2, " – ").collect()
    } else {
        vec![clean]
    };

    if parts.len() == 2 {
        let artist = parts[0].trim().to_string();
        let title = parts[1].trim().to_string();
        RadioMetadata {
            title,
            artist,
            raw: clean.to_string(),
            station_name,
        }
    } else {
        RadioMetadata {
            title: clean.to_string(),
            artist: station_name.clone().unwrap_or_else(|| "Live Radio".to_string()),
            raw: clean.to_string(),
            station_name,
        }
    }
}
