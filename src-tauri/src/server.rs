use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use std::sync::atomic::{AtomicU16, Ordering};
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

pub fn start_stream_server() -> u16 {
    let server = Server::http("127.0.0.1:45321")
        .or_else(|_| Server::http("127.0.0.1:0"))
        .expect("Failed to start local audio streaming server");
    let port = server.server_addr().to_ip().unwrap().port();
    SERVER_PORT.store(port, Ordering::SeqCst);

    thread::spawn(move || {
        for request in server.incoming_requests() {
            let url = request.url().to_string();
            
            // Handle CORS preflight
            if request.method() == &tiny_http::Method::Options {
                let mut response = Response::empty(204);
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, OPTIONS"[..]).unwrap());
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Range, Content-Type"[..]).unwrap());
                let _ = request.respond(response);
                continue;
            }

            if url == "/icon" || url.starts_with("/icon?") {
                let icon_bytes = include_bytes!("../icons/icon.png");
                let resp = Response::new(
                    StatusCode(200),
                    vec![
                        Header::from_bytes(&b"Content-Type"[..], &b"image/png"[..]).unwrap(),
                        Header::from_bytes(&b"Content-Length"[..], icon_bytes.len().to_string().as_bytes()).unwrap(),
                        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
                    ],
                    &icon_bytes[..],
                    Some(icon_bytes.len()),
                    None,
                );
                let _ = request.respond(resp);
                continue;
            }

            if url.starts_with("/stream?path=") {
                let encoded_path = &url["/stream?path=".len()..];
                let decoded_path = match urlencoding_decode(encoded_path) {
                    Some(p) => p,
                    None => {
                        let _ = request.respond(Response::empty(400));
                        continue;
                    }
                };

                let file_path = Path::new(&decoded_path);
                if !file_path.exists() {
                    let mut resp = Response::empty(404);
                    resp.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
                    let _ = request.respond(resp);
                    continue;
                }

                let file_len = match file_path.metadata() {
                    Ok(meta) => meta.len(),
                    Err(_) => {
                        let _ = request.respond(Response::empty(500));
                        continue;
                    }
                };

                let mime = get_mime_type(&decoded_path);
                let mut range_header = None;
                for h in request.headers() {
                    if h.field.equiv("Range") {
                        range_header = Some(h.value.as_str().to_string());
                        break;
                    }
                }

                let mut file = match File::open(file_path) {
                    Ok(f) => f,
                    Err(_) => {
                        let _ = request.respond(Response::empty(500));
                        continue;
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
                            continue;
                        }

                        let content_len = end - start + 1;
                        if file.seek(SeekFrom::Start(start)).is_err() {
                            let _ = request.respond(Response::empty(500));
                            continue;
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
                        continue;
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
            } else {
                let _ = request.respond(Response::empty(404));
            }
        }
    });

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
