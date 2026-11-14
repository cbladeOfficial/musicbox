use crate::scanner::TrackMetadata;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackRecord {
    pub id: i64,
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
    pub play_count: u32,
    pub is_favorite: bool,
    pub date_added: i64,
    pub last_played: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistRecord {
    pub id: i64,
    pub name: String,
    pub track_count: u32,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RadioStation {
    pub id: i64,
    pub name: String,
    pub url: String,
    pub homepage: Option<String>,
    pub favicon: Option<String>,
    pub tags: Option<String>,
    pub country: Option<String>,
    pub is_favorite: bool,
    pub created_at: i64,
}

pub fn now_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub fn init_db(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    // Performance optimizations for minimal memory and lightning speed
    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = -2000; -- 2MB max memory cache
        PRAGMA temp_store = MEMORY;

        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT NOT NULL,
            album_artist TEXT,
            track_number INTEGER,
            disc_number INTEGER,
            year INTEGER,
            genre TEXT,
            duration REAL NOT NULL,
            bitrate INTEGER,
            sample_rate INTEGER,
            format TEXT NOT NULL,
            cover_path TEXT,
            file_size INTEGER NOT NULL,
            play_count INTEGER NOT NULL DEFAULT 0,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            date_added INTEGER NOT NULL,
            last_played INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
        CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
        CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
        CREATE INDEX IF NOT EXISTS idx_tracks_favorite ON tracks(is_favorite);

        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS playlist_tracks (
            playlist_id INTEGER NOT NULL,
            track_id INTEGER NOT NULL,
            position INTEGER NOT NULL,
            PRIMARY KEY (playlist_id, track_id),
            FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
            FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS metadata_cache (
            cache_key TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS radio_stations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL,
            homepage TEXT,
            favicon TEXT,
            tags TEXT,
            country TEXT,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        );
        ",
    )?;

    // Seed curated popular default stations if table is fresh
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM radio_stations",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    if count == 0 {
        let now = now_timestamp();
        let default_stations = [
            ("Lofi Girl", "https://stream.zeno.fm/f3wvbbqmdg8uv", "https://play-lh.googleusercontent.com/9v4e5qH4P4fWbT9yNl59s4X1z7p6-J38N_o5M03sWJ5gB4F9rA3xXz", "Lofi, Chillhop, Beats", "France"),
            ("Nightwave Plaza", "https://radio.plaza.one/mp3", "https://plaza.one/apple-touch-icon.png", "Vaporwave, Future Funk, Synth", "United States"),
            ("SomaFM: Groove Salad", "https://ice1.somafm.com/groovesalad-128-mp3", "https://somafm.com/img/groovesalad120.png", "Ambient, Downtempo, Chill", "United States"),
            ("SomaFM: DEF CON Radio", "https://ice1.somafm.com/defcon-128-mp3", "https://somafm.com/img/defcon120.png", "Cyberpunk, Electronic, Hacking", "United States"),
            ("KEXP 90.3 FM Seattle", "https://kexp-mp3-128.streamguys1.com/kexp128.mp3", "https://kexp.org/static/assets/img/kexp-logo-square.png", "Indie, Alternative, Rock", "United States"),
            ("Ibiza Global Radio", "https://listenssl.ibizaglobalradio.com:8024/ibizaglobalradio.mp3", "https://ibizaglobalradio.com/wp-content/uploads/2021/04/cropped-favicon-192x192.png", "House, Deep House, Electronic", "Spain"),
            ("Classic FM UK", "https://media-ice.musicradio.com/ClassicFMMP3", "https://www.classicfm.com/assets_v5/classic/images/favicons/favicon-196x196.png", "Classical, Symphony, Relax", "United Kingdom"),
            ("BBC Radio 1", "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one", "https://sounds.files.bbci.co.uk/2.4.0/networks/bbc_radio_one/colour_default.svg", "Top 40, Pop, Dance", "United Kingdom"),
        ];

        for (name, url, favicon, tags, country) in default_stations {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO radio_stations (name, url, favicon, tags, country, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![name, url, favicon, tags, country, now],
            );
        }
    }

    Ok(conn)
}

pub fn insert_or_update_tracks(conn: &mut Connection, tracks: &[TrackMetadata]) -> Result<usize> {
    let now = now_timestamp();
    let tx = conn.transaction()?;
    let mut count = 0;

    {
        let mut stmt = tx.prepare_cached(
            "INSERT INTO tracks (
                path, title, artist, album, album_artist, track_number, disc_number,
                year, genre, duration, bitrate, sample_rate, format, cover_path,
                file_size, date_added
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
            ON CONFLICT(path) DO UPDATE SET
                title = excluded.title,
                artist = excluded.artist,
                album = excluded.album,
                album_artist = excluded.album_artist,
                track_number = excluded.track_number,
                disc_number = excluded.disc_number,
                year = excluded.year,
                genre = excluded.genre,
                duration = excluded.duration,
                bitrate = excluded.bitrate,
                sample_rate = excluded.sample_rate,
                format = excluded.format,
                cover_path = COALESCE(excluded.cover_path, tracks.cover_path),
                file_size = excluded.file_size
            ",
        )?;

        for t in tracks {
            stmt.execute(params![
                t.path,
                t.title,
                t.artist,
                t.album,
                t.album_artist,
                t.track_number,
                t.disc_number,
                t.year,
                t.genre,
                t.duration,
                t.bitrate,
                t.sample_rate,
                t.format,
                t.cover_path,
                t.file_size as i64,
                now,
            ])?;
            count += 1;
        }
    }

    tx.commit()?;
    Ok(count)
}

pub fn get_all_tracks(conn: &Connection) -> Result<Vec<TrackRecord>> {
    let mut stmt = conn.prepare(
        "SELECT id, path, title, artist, album, album_artist, track_number, disc_number,
                year, genre, duration, bitrate, sample_rate, format, cover_path,
                file_size, play_count, is_favorite, date_added, last_played
         FROM tracks ORDER BY artist COLLATE NOCASE, album COLLATE NOCASE, track_number, title COLLATE NOCASE",
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(TrackRecord {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            album_artist: row.get(5)?,
            track_number: row.get(6)?,
            disc_number: row.get(7)?,
            year: row.get(8)?,
            genre: row.get(9)?,
            duration: row.get(10)?,
            bitrate: row.get(11)?,
            sample_rate: row.get(12)?,
            format: row.get(13)?,
            cover_path: row.get(14)?,
            file_size: row.get::<_, i64>(15)? as u64,
            play_count: row.get(16)?,
            is_favorite: row.get::<_, i64>(17)? != 0,
            date_added: row.get(18)?,
            last_played: row.get(19)?,
        })
    })?;

    let mut res = Vec::new();
    for t in iter {
        res.push(t?);
    }
    Ok(res)
}

pub fn toggle_favorite(conn: &Connection, track_id: i64) -> Result<bool> {
    let mut stmt = conn.prepare("SELECT is_favorite FROM tracks WHERE id = ?1")?;
    let current: i64 = stmt.query_row(params![track_id], |row| row.get(0))?;
    let new_val = if current == 0 { 1 } else { 0 };
    conn.execute(
        "UPDATE tracks SET is_favorite = ?1 WHERE id = ?2",
        params![new_val, track_id],
    )?;
    Ok(new_val == 1)
}

pub fn increment_play_count(conn: &Connection, track_id: i64) -> Result<()> {
    let now = now_timestamp();
    conn.execute(
        "UPDATE tracks SET play_count = play_count + 1, last_played = ?1 WHERE id = ?2",
        params![now, track_id],
    )?;
    Ok(())
}

pub fn create_playlist(conn: &Connection, name: &str) -> Result<i64> {
    let now = now_timestamp();
    conn.execute(
        "INSERT INTO playlists (name, created_at) VALUES (?1, ?2)",
        params![name, now],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_playlists(conn: &Connection) -> Result<Vec<PlaylistRecord>> {
    let mut stmt = conn.prepare(
        "SELECT p.id, p.name, p.created_at, COUNT(pt.track_id) as track_count
         FROM playlists p
         LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
         GROUP BY p.id
         ORDER BY p.name COLLATE NOCASE",
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(PlaylistRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
            track_count: row.get(3)?,
        })
    })?;

    let mut res = Vec::new();
    for p in iter {
        res.push(p?);
    }
    Ok(res)
}

pub fn add_to_playlist(conn: &Connection, playlist_id: i64, track_id: i64) -> Result<()> {
    let mut stmt = conn.prepare(
        "SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_tracks WHERE playlist_id = ?1",
    )?;
    let pos: i64 = stmt.query_row(params![playlist_id], |row| row.get(0))?;
    conn.execute(
        "INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?1, ?2, ?3)",
        params![playlist_id, track_id, pos],
    )?;
    Ok(())
}

pub fn remove_from_playlist(conn: &Connection, playlist_id: i64, track_id: i64) -> Result<()> {
    conn.execute(
        "DELETE FROM playlist_tracks WHERE playlist_id = ?1 AND track_id = ?2",
        params![playlist_id, track_id],
    )?;
    Ok(())
}

pub fn get_playlist_tracks(conn: &Connection, playlist_id: i64) -> Result<Vec<TrackRecord>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.path, t.title, t.artist, t.album, t.album_artist, t.track_number,
                t.disc_number, t.year, t.genre, t.duration, t.bitrate, t.sample_rate,
                t.format, t.cover_path, t.file_size, t.play_count, t.is_favorite,
                t.date_added, t.last_played
         FROM playlist_tracks pt
         JOIN tracks t ON pt.track_id = t.id
         WHERE pt.playlist_id = ?1
         ORDER BY pt.position",
    )?;

    let iter = stmt.query_map(params![playlist_id], |row| {
        Ok(TrackRecord {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            album_artist: row.get(5)?,
            track_number: row.get(6)?,
            disc_number: row.get(7)?,
            year: row.get(8)?,
            genre: row.get(9)?,
            duration: row.get(10)?,
            bitrate: row.get(11)?,
            sample_rate: row.get(12)?,
            format: row.get(13)?,
            cover_path: row.get(14)?,
            file_size: row.get::<_, i64>(15)? as u64,
            play_count: row.get(16)?,
            is_favorite: row.get::<_, i64>(17)? != 0,
            date_added: row.get(18)?,
            last_played: row.get(19)?,
        })
    })?;

    let mut res = Vec::new();
    for t in iter {
        res.push(t?);
    }
    Ok(res)
}

pub fn delete_playlist(conn: &Connection, playlist_id: i64) -> Result<()> {
    conn.execute(
        "DELETE FROM playlist_tracks WHERE playlist_id = ?1",
        params![playlist_id],
    )?;
    conn.execute(
        "DELETE FROM playlists WHERE id = ?1",
        params![playlist_id],
    )?;
    Ok(())
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query(params![key])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        Ok(None)
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

pub fn get_radio_stations(conn: &Connection) -> Result<Vec<RadioStation>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, url, homepage, favicon, tags, country, is_favorite, created_at
         FROM radio_stations
         ORDER BY is_favorite DESC, name COLLATE NOCASE ASC",
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(RadioStation {
            id: row.get(0)?,
            name: row.get(1)?,
            url: row.get(2)?,
            homepage: row.get(3)?,
            favicon: row.get(4)?,
            tags: row.get(5)?,
            country: row.get(6)?,
            is_favorite: row.get::<_, i64>(7)? != 0,
            created_at: row.get(8)?,
        })
    })?;

    let mut res = Vec::new();
    for s in iter {
        res.push(s?);
    }
    Ok(res)
}

pub fn add_radio_station(
    conn: &Connection,
    name: &str,
    url: &str,
    favicon: Option<&str>,
    tags: Option<&str>,
    country: Option<&str>,
) -> Result<i64> {
    let now = now_timestamp();
    conn.execute(
        "INSERT INTO radio_stations (name, url, favicon, tags, country, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![name, url, favicon, tags, country, now],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_radio_station(
    conn: &Connection,
    id: i64,
    name: &str,
    url: &str,
    favicon: Option<&str>,
    tags: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE radio_stations SET name = ?1, url = ?2, favicon = ?3, tags = ?4 WHERE id = ?5",
        params![name, url, favicon, tags, id],
    )?;
    Ok(())
}

pub fn delete_radio_station(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM radio_stations WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn toggle_radio_favorite(conn: &Connection, id: i64) -> Result<bool> {
    let mut stmt = conn.prepare("SELECT is_favorite FROM radio_stations WHERE id = ?1")?;
    let current: i64 = stmt.query_row(params![id], |row| row.get(0))?;
    let new_val = if current == 0 { 1 } else { 0 };
    conn.execute(
        "UPDATE radio_stations SET is_favorite = ?1 WHERE id = ?2",
        params![new_val, id],
    )?;
    Ok(new_val == 1)
}
