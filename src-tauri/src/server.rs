use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use std::sync::atomic::{AtomicU16, Ordering};
use std::sync::Arc;
use std::thread;
use tiny_http::{Header, Response, Server, StatusCode};

pub static SERVER_PORT: AtomicU16 = AtomicU16::new(0);

fn get_mime_type(path: &str) -> &'static str {
    let lower = path.to_lowercase();
    if lower.ends_with(".mp3") {
        "audio/mpeg"
    } else if lower.ends_with(".flac") {
        "audio/flac"
    } else if lower.ends_with(".m4a") || lower.ends_with(".mp4") || lower.ends_with(".aac") {
        "audio/mp4"
    } else if lower.ends_with(".ogg") || lower.ends_with(".opus") {
        "audio/ogg"
    } else if lower.ends_with(".wav") {
        "audio/wav"
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else {
        "application/octet-stream"
    }
}

fn stream_audio(
    request: tiny_http::Request,
    decoded_path: String,
    file_len: u64,
    mime: &'static str,
    range_header: Option<String>,
) {
    let file_path = Path::new(&decoded_path);
    let mut file = match File::open(file_path) {
        Ok(f) => f,
        Err(_) => {
            let _ = request.respond(Response::empty(500));
            return;
        }
    };

    if let Some(range_str) = range_header {
        // Parse range: bytes=start-end
        if let Some(range_val) = range_str.strip_prefix("bytes=") {
            let parts: Vec<&str> = range_val.split('-').collect();
            let start: u64 = parts[0].parse().unwrap_or(0);
            let end: u64 = if parts.len() > 1 && !parts[1].is_empty() {
                parts[1].parse().unwrap_or(file_len - 1)
            } else {
                file_len - 1
            };

            let end = end.min(file_len - 1);
            if start > end {
                let mut resp = Response::empty(416);
                resp.add_header(Header::from_bytes(&b"Content-Range"[..], format!("bytes */{}", file_len).as_bytes()).unwrap());
                resp.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
                let _ = request.respond(resp);
                return;
            }

            let content_len = end - start + 1;
            if file.seek(SeekFrom::Start(start)).is_err() {
                let _ = request.respond(Response::empty(500));
                return;
            }

            let reader = file.take(content_len);
            let resp = Response::new(
                StatusCode(206),
                vec![
                    Header::from_bytes(&b"Content-Type"[..], mime.as_bytes()).unwrap(),
                    Header::from_bytes(&b"Content-Range"[..], format!("bytes {}-{}/{}", start, end, file_len).as_bytes()).unwrap(),
                    Header::from_bytes(&b"Content-Length"[..], content_len.to_string().as_bytes()).unwrap(),
                    Header::from_bytes(&b"Accept-Ranges"[..], &b"bytes"[..]).unwrap(),
                    Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
                ],
                reader,
                Some(content_len as usize),
                None,
            );
            let _ = request.respond(resp);
            return;
        }
    }

    // Normal full response
    let resp = Response::new(
        StatusCode(200),
        vec![
            Header::from_bytes(&b"Content-Type"[..], mime.as_bytes()).unwrap(),
            Header::from_bytes(&b"Content-Length"[..], file_len.to_string().as_bytes()).unwrap(),
            Header::from_bytes(&b"Accept-Ranges"[..], &b"bytes"[..]).unwrap(),
            Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
        ],
        file,
        Some(file_len as usize),
        None,
    );
    let _ = request.respond(resp);
}

fn handle_request(request: tiny_http::Request) {
    let url = request.url().to_string();

    // Handle CORS preflight
    if request.method() == &tiny_http::Method::Options {
        let mut response = Response::empty(204);
        response.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
        response.add_header(Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, OPTIONS"[..]).unwrap());
        response.add_header(Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Range, Content-Type"[..]).unwrap());
        let _ = request.respond(response);
        return;
    }

    if url == "/icon" || url.starts_with("/icon?") {
        let icon_bytes = include_bytes!("../icons/icon.png");
        let resp = Response::new(
            StatusCode(200),
            vec![
                Header::from_bytes(&b"Content-Type"[..], &b"image/png"[..]).unwrap(),
                Header::from_bytes(&b"Content-Length"[..], icon_bytes.len().to_string().as_bytes()).unwrap(),
                Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
                Header::from_bytes(&b"Cache-Control"[..], &b"public, max-age=604800, immutable"[..]).unwrap(),
            ],
            &icon_bytes[..],
            Some(icon_bytes.len()),
            None,
        );
        let _ = request.respond(resp);
        return;
    }

    if url.starts_with("/stream?path=") {
        let encoded_path = &url["/stream?path=".len()..];
        let decoded_path = match urlencoding_decode(encoded_path) {
            Some(p) => p,
            None => {
                let _ = request.respond(Response::empty(400));
                return;
            }
        };

        let file_path = Path::new(&decoded_path);
        if !file_path.exists() {
            let mut resp = Response::empty(404);
            resp.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
            let _ = request.respond(resp);
            return;
        }

        let file_len = match file_path.metadata() {
            Ok(meta) => meta.len(),
            Err(_) => {
                let _ = request.respond(Response::empty(500));
                return;
            }
        };

        let mime = get_mime_type(&decoded_path);

        // Fast path for images (album art / thumbnails):
        // Read into memory and send with HTTP Cache-Control and CORS headers.
        // Handled directly on the worker thread pool to preserve HTTP/1.1 pipelined
        // socket ordering and prevent concurrent write socket corruption in WebView2.
        if mime.starts_with("image/") {
            let mut file = match File::open(file_path) {
                Ok(f) => f,
                Err(_) => {
                    let mut resp = Response::empty(404);
                    resp.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
                    let _ = request.respond(resp);
                    return;
                }
            };

            let mut buffer = Vec::with_capacity(file_len as usize);
            if file.read_to_end(&mut buffer).is_ok() {
                let resp = Response::new(
                    StatusCode(200),
                    vec![
                        Header::from_bytes(&b"Content-Type"[..], mime.as_bytes()).unwrap(),
                        Header::from_bytes(&b"Content-Length"[..], buffer.len().to_string().as_bytes()).unwrap(),
                        Header::from_bytes(&b"Accept-Ranges"[..], &b"bytes"[..]).unwrap(),
                        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
                        Header::from_bytes(&b"Cache-Control"[..], &b"public, max-age=604800, immutable"[..]).unwrap(),
                    ],
                    &buffer[..],
                    Some(buffer.len()),
                    None,
                );
                let _ = request.respond(resp);
            } else {
                let _ = request.respond(Response::empty(500));
            }
            return;
        }

        // For audio streams, extract range header and stream in a dedicated thread
        // so it never blocks image loading or other HTTP requests.
        let mut range_header = None;
        for h in request.headers() {
            if h.field.equiv("Range") {
                range_header = Some(h.value.as_str().to_string());
                break;
            }
        }

        thread::spawn(move || {
            stream_audio(request, decoded_path, file_len, mime, range_header);
        });
    } else {
        let _ = request.respond(Response::empty(404));
    }
}

pub fn start_stream_server() -> u16 {
    let server = Server::http("127.0.0.1:45321")
        .or_else(|_| Server::http("127.0.0.1:0"))
        .expect("Failed to start local audio streaming server");
    let port = server.server_addr().to_ip().unwrap().port();
    SERVER_PORT.store(port, Ordering::SeqCst);

    let server = Arc::new(server);
    for _ in 0..16 {
        let server_clone = Arc::clone(&server);
        thread::spawn(move || {
            for request in server_clone.incoming_requests() {
                handle_request(request);
            }
        });
    }

    port
}

fn urlencoding_decode(s: &str) -> Option<String> {
    let mut result = Vec::new();
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            if i + 2 < bytes.len() {
                if let Ok(byte) = u8::from_str_radix(std::str::from_utf8(&bytes[i + 1..i + 3]).ok()?, 16) {
                    result.push(byte);
                    i += 3;
                    continue;
                }
            }
            return None;
        } else if bytes[i] == b'+' {
            result.push(b' ');
            i += 1;
        } else {
            result.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(result).ok()
}
