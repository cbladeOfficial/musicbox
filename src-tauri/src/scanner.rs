use lofty::file::AudioFile;
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::tag::ItemKey;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackMetadata {
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub track_number: Option<u32>,
    pub disc_number: Option<u32>,
    pub year: Option<u32>,
    pub genre: Option<String>,
    pub duration: f64,
    pub bitrate: Option<u32>,
    pub sample_rate: Option<u32>,
    pub format: String,
    pub cover_path: Option<String>,
    pub file_size: u64,
}

fn is_supported_audio(ext: &str) -> bool {
    matches!(
        ext.to_lowercase().as_str(),
        "mp3" | "flac" | "m4a" | "aac" | "ogg" | "opus" | "wav" | "alac" | "aiff" | "wma"
    )
}

fn hash_bytes(bytes: &[u8]) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn extract_all_artists(tag: &lofty::tag::Tag) -> Option<String> {
    let mut artists: Vec<String> = Vec::new();

    for item in tag.items() {
        if item.key() == ItemKey::TrackArtist {
            if let Some(text) = item.value().text() {
                for part in text.split('\0') {
                    let trimmed = part.trim();
                    if !trimmed.is_empty() && !artists.contains(&trimmed.to_string()) {
                        artists.push(trimmed.to_string());
                    }
                }
            }
        }
    }

    if artists.is_empty() {
        if let Some(a) = tag.artist() {
            for part in a.split('\0') {
                let trimmed = part.trim();
                if !trimmed.is_empty() && !artists.contains(&trimmed.to_string()) {
                    artists.push(trimmed.to_string());
                }
            }
        }
    }

    if artists.is_empty() {
        None
    } else {
        Some(artists.join(", "))
    }
}

fn extract_all_album_artists(tag: &lofty::tag::Tag) -> Option<String> {
    let mut artists: Vec<String> = Vec::new();

    for item in tag.items() {
        if item.key() == ItemKey::AlbumArtist {
            if let Some(text) = item.value().text() {
                for part in text.split('\0') {
                    let trimmed = part.trim();
                    if !trimmed.is_empty() && !artists.contains(&trimmed.to_string()) {
                        artists.push(trimmed.to_string());
                    }
                }
            }
        }
    }

    if artists.is_empty() {
        if let Some(aa) = tag.get_string(ItemKey::AlbumArtist) {
            for part in aa.split('\0') {
                let trimmed = part.trim();
                if !trimmed.is_empty() && !artists.contains(&trimmed.to_string()) {
                    artists.push(trimmed.to_string());
                }
            }
        }
    }

    if artists.is_empty() {
        None
    } else {
        Some(artists.join(", "))
    }
}

fn parse_filename_artist_title(stem: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = stem.split(" - ").map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
    if parts.len() == 2 {
        let p0 = parts[0];
        let p1 = parts[1];
        let is_number = p0.chars().all(|c| c.is_ascii_digit() || c == '.');
        if is_number {
            return None;
        }
        return Some((p0.to_string(), p1.to_string()));
    } else if parts.len() >= 3 {
        let p0 = parts[0];
        let is_number = p0.chars().all(|c| c.is_ascii_digit() || c == '.');
        if is_number {
            let artist = parts[1].to_string();
            let title = parts[2..].join(" - ");
            return Some((artist, title));
        } else {
            let artist = parts[0].to_string();
            let title = parts[1..].join(" - ");
            return Some((artist, title));
        }
    }
    None
}

pub fn scan_file(path: &Path, cache_dir: &Path) -> Option<TrackMetadata> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    if !is_supported_audio(&ext) {
        return None;
    }

    let file_size = path.metadata().map(|m| m.len()).unwrap_or(0);
    let path_str = path.to_string_lossy().to_string();
    let file_stem = path.file_stem()?.to_string_lossy().to_string();

    let mut title = file_stem.clone();
    let mut artist = "Unknown Artist".to_string();
    let mut album = "Unknown Album".to_string();
    let mut album_artist = None;
    let mut track_number = None;
    let mut disc_number = None;
    let mut year = None;
    let mut genre = None;
    let mut duration = 0.0;
    let mut bitrate = None;
    let mut sample_rate = None;
    let mut cover_path = None;

    let parse_options = lofty::config::ParseOptions::new()
        .parsing_mode(lofty::config::ParsingMode::Relaxed);

    if let Ok(tagged_file) = Probe::open(path)
        .map(|p| p.options(parse_options))
        .and_then(|p| p.read())
    {
        let properties = tagged_file.properties();
        duration = properties.duration().as_secs_f64();
        bitrate = properties.audio_bitrate();
        sample_rate = properties.sample_rate();

        // Check primary tag first, then check all tags to fill in any missing fields
        let mut tags_to_check: Vec<&lofty::tag::Tag> = Vec::new();
        if let Some(primary) = tagged_file.primary_tag() {
            tags_to_check.push(primary);
        }
        for t in tagged_file.tags() {
            if !tags_to_check.iter().any(|existing| std::ptr::eq(*existing, t)) {
                tags_to_check.push(t);
            }
        }

        for tag in tags_to_check {
            if title == file_stem {
                if let Some(t) = tag.title() {
                    let trimmed = t.trim();
                    if !trimmed.is_empty() {
                        title = trimmed.to_string();
                    }
                }
            }
            if artist == "Unknown Artist" {
                if let Some(all_artists) = extract_all_artists(tag) {
                    artist = all_artists;
                } else if let Some(a) = tag.artist() {
                    let trimmed = a.trim();
                    if !trimmed.is_empty() {
                        artist = trimmed.to_string();
                    }
                }
            }
            if album == "Unknown Album" {
                if let Some(al) = tag.album() {
                    let trimmed = al.trim();
                    if !trimmed.is_empty() {
                        album = trimmed.to_string();
                    }
                }
            }
            if genre.is_none() {
                if let Some(g) = tag.genre() {
                    let trimmed = g.trim();
                    if !trimmed.is_empty() {
                        genre = Some(trimmed.to_string());
                    }
                }
            }
            if album_artist.is_none() {
                if let Some(all_aa) = extract_all_album_artists(tag) {
                    album_artist = Some(all_aa);
                } else if let Some(aa) = tag.get_string(ItemKey::AlbumArtist) {
                    let trimmed = aa.trim();
                    if !trimmed.is_empty() {
                        album_artist = Some(trimmed.to_string());
                    }
                }
            }
            if track_number.is_none() {
                track_number = tag.track();
            }
            if disc_number.is_none() {
                disc_number = tag.disk();
            }
            if year.is_none() {
                year = tag
                    .get_string(ItemKey::Year)
                    .or_else(|| tag.get_string(ItemKey::RecordingDate))
                    .and_then(|s| {
                        let digits: String = s.chars().filter(|c| c.is_ascii_digit()).take(4).collect();
                        digits.parse::<u32>().ok()
                    });
            }

            // Check embedded pictures (hash by actual image bytes to prevent cross-song collision)
            if cover_path.is_none() {
                if let Some(pic) = tag.pictures().first() {
                    let pic_hash = hash_bytes(pic.data());
                    let covers_dir = cache_dir.join("covers");
                    let _ = fs::create_dir_all(&covers_dir);
                    let ext_name = match pic.mime_type() {
                        Some(lofty::picture::MimeType::Png) => "png",
                        _ => "jpg",
                    };
                    let target_cover = covers_dir.join(format!("{}.{}", pic_hash, ext_name));
                    if !target_cover.exists() {
                        let _ = fs::write(&target_cover, pic.data());
                    }
                    cover_path = Some(target_cover.to_string_lossy().to_string());
                }
            }
        }
    }

    // Fallback: check parent directory for local cover art file
    if cover_path.is_none() {
        if let Some(parent) = path.parent() {
            for name in &[
                "cover.jpg", "cover.png", "cover.jpeg",
                "folder.jpg", "folder.png", "folder.jpeg",
                "album.jpg", "album.png", "album.jpeg",
                "front.jpg", "front.png", "front.jpeg",
            ] {
                let candidate = parent.join(name);
                if candidate.is_file() {
                    cover_path = Some(candidate.to_string_lossy().to_string());
                    break;
                }
            }
        }
    }

    // Intelligent fallback from filename if artist is still Unknown Artist
    if artist == "Unknown Artist" {
        if let Some((art, tit)) = parse_filename_artist_title(&file_stem) {
            artist = art;
            if title == file_stem {
                title = tit;
            }
        }
    }

    Some(TrackMetadata {
        path: path_str,
        title,
        artist,
        album,
        album_artist,
        track_number,
        disc_number,
        year,
        genre,
        duration,
        bitrate,
        sample_rate,
        format: ext.to_uppercase(),
        cover_path,
        file_size,
    })
}

pub fn scan_directory(dir: &Path, cache_dir: &Path) -> Vec<TrackMetadata> {
    let mut tracks = Vec::new();
    for entry in WalkDir::new(dir).into_iter().filter_map(|e| e.ok()) {
        let p = entry.path();
        if p.is_file() {
            if let Some(meta) = scan_file(p, cache_dir) {
                tracks.push(meta);
            }
        }
    }
    tracks
}
