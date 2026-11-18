#[cfg(windows)]
pub mod win {
    use std::os::windows::ffi::OsStrExt;
    use std::sync::Mutex;
    use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig, SeekDirection};
    use tauri::{AppHandle, Emitter};
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM, PROPERTYKEY};
    use windows::Win32::Graphics::Gdi::{CreateBitmap, DeleteObject, HBITMAP};
    use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER, IPersistFile};
    use windows::Win32::System::Com::StructuredStorage::{PROPVARIANT, PROPVARIANT_0_0, PropVariantClear};
    use windows::Win32::System::Variant::VT_LPWSTR;
    use windows::Win32::UI::Shell::{
        DefSubclassProc, ITaskbarList3, SetCurrentProcessExplicitAppUserModelID,
        SetWindowSubclass, TaskbarList, THBF_ENABLED, THB_FLAGS, THB_ICON, THB_TOOLTIP,
        THUMBBUTTON, IShellLinkW, ShellLink,
    };
    use windows::Win32::UI::Shell::PropertiesSystem::{
        IPropertyStore, SHGetPropertyStoreForWindow,
    };
    use windows::core::Interface;
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateIconIndirect, HICON, ICONINFO, WM_COMMAND, RegisterWindowMessageW,
    };
    use windows::Win32::System::Registry::{
        RegCreateKeyW, RegSetValueExW, RegCloseKey,
        HKEY_CURRENT_USER, REG_SZ, REG_DWORD, HKEY,
    };
    use windows::core::{w, PCWSTR};

    const THBN_CLICKED: u32 = 0x1800;
    const SUBCLASS_ID: usize = 9991;

    static MSG_TASKBAR_CREATED: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);

    const BTN_PREV: u32 = 101;
    const BTN_PLAY_PAUSE: u32 = 102;
    const BTN_STOP: u32 = 103;
    const BTN_NEXT: u32 = 104;

    struct TaskbarState {
        hwnd: HWND,
        taskbar_list: ITaskbarList3,
        icon_prev: HICON,
        icon_play: HICON,
        icon_pause: HICON,
        icon_stop: HICON,
        icon_next: HICON,
        buttons_added: bool,
        is_playing: bool,
    }

    unsafe impl Send for TaskbarState {}
    unsafe impl Sync for TaskbarState {}

    static TASKBAR_STATE: Mutex<Option<TaskbarState>> = Mutex::new(None);
    pub static MEDIA_CONTROLS: Mutex<Option<MediaControls>> = Mutex::new(None);

    fn create_rgba_icon(draw: impl Fn(u32, u32) -> bool) -> HICON {
        let width = 16u32;
        let height = 16u32;
        let mut pixels = vec![0u8; (width * height * 4) as usize];
        let mut mask_pixels = vec![0u8; ((width * height) / 8) as usize];

        for y in 0..height {
            for x in 0..width {
                let idx = ((y * width + x) * 4) as usize;
                if draw(x, y) {
                    // Crisp white with full opacity
                    pixels[idx] = 245;     // B
                    pixels[idx + 1] = 245; // G
                    pixels[idx + 2] = 245; // R
                    pixels[idx + 3] = 255; // A
                } else {
                    // Transparent
                    let mask_idx = ((y * width + x) / 8) as usize;
                    let bit = 7 - ((y * width + x) % 8);
                    mask_pixels[mask_idx] |= 1 << bit;
                }
            }
        }

        unsafe {
            let hbm_color: HBITMAP = CreateBitmap(width as i32, height as i32, 1, 32, Some(pixels.as_ptr() as *const _));
            let hbm_mask: HBITMAP = CreateBitmap(width as i32, height as i32, 1, 1, Some(mask_pixels.as_ptr() as *const _));

            let mut icon_info = ICONINFO {
                fIcon: true.into(),
                xHotspot: 0,
                yHotspot: 0,
                hbmMask: hbm_mask,
                hbmColor: hbm_color,
            };

            let icon = CreateIconIndirect(&mut icon_info).unwrap_or(HICON(std::ptr::null_mut()));

            let _ = DeleteObject(hbm_color.into());
            let _ = DeleteObject(hbm_mask.into());

            icon
        }
    }

    fn to_wide_buf(s: &str, buf: &mut [u16; 260]) {
        let mut i = 0;
        for c in s.encode_utf16() {
            if i < 259 {
                buf[i] = c;
                i += 1;
            }
        }
        buf[i] = 0;
    }

    unsafe extern "system" fn subclass_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _id: usize,
        ref_data: usize,
    ) -> LRESULT {
        let tb_msg = MSG_TASKBAR_CREATED.load(std::sync::atomic::Ordering::Relaxed);
        if tb_msg != 0 && msg == tb_msg {
            let mut lock = TASKBAR_STATE.lock().unwrap();
            if let Some(state) = lock.as_mut() {
                state.buttons_added = false;
                try_add_buttons(state);
            }
        }

        if msg == WM_COMMAND {
            let hi = (wparam.0 >> 16) as u32;
            let lo = (wparam.0 & 0xffff) as u32;
            if hi == THBN_CLICKED && ref_data != 0 {
                let app = unsafe { &*(ref_data as *const AppHandle) };
                match lo {
                    BTN_PREV => {
                        let _ = app.emit("media-previous", ());
                    }
                    BTN_PLAY_PAUSE => {
                        let _ = app.emit("media-toggle-play", ());
                    }
                    BTN_STOP => {
                        let _ = app.emit("media-stop", ());
                    }
                    BTN_NEXT => {
                        let _ = app.emit("media-next", ());
                    }
                    _ => {}
                }
                return LRESULT(0);
            }
        }
        unsafe { DefSubclassProc(hwnd, msg, wparam, lparam) }
    }

    fn create_or_update_shortcut(lnk_path: &std::path::Path, exe_path: &std::path::Path, aumid: &str) {
        unsafe {
            if let Some(parent) = lnk_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }

            let wide_lnk: Vec<u16> = lnk_path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();

            // Try to remove previous shortcut in user folder so it is recreated cleanly
            let _ = std::fs::remove_file(lnk_path);

            if let Ok(shell_link) = CoCreateInstance::<_, IShellLinkW>(&ShellLink, None, CLSCTX_INPROC_SERVER) {
                let wide_exe: Vec<u16> = exe_path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
                let _ = shell_link.SetPath(PCWSTR(wide_exe.as_ptr()));
                if let Some(dir) = exe_path.parent() {
                    let wide_dir: Vec<u16> = dir.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
                    let _ = shell_link.SetWorkingDirectory(PCWSTR(wide_dir.as_ptr()));
                }
                let _ = shell_link.SetIconLocation(PCWSTR(wide_exe.as_ptr()), 0);

                let desc: Vec<u16> = std::ffi::OsStr::new("MusicBox").encode_wide().chain(std::iter::once(0)).collect();
                let _ = shell_link.SetDescription(PCWSTR(desc.as_ptr()));

                // Set PKEY_AppUserModel_ID directly on the IShellLink property store BEFORE saving
                if let Ok(prop_store) = shell_link.cast::<IPropertyStore>() {
                    let app_id_key = PROPERTYKEY {
                        fmtid: windows::core::GUID::from_values(
                            0x9F4C2855,
                            0x9F79,
                            0x4B39,
                            [0xA8, 0xD0, 0xE1, 0xD4, 0x2D, 0xE1, 0xD5, 0xF3],
                        ),
                        pid: 5,
                    };

                    let wide_val: Vec<u16> = aumid.encode_utf16().chain(std::iter::once(0)).collect();
                    let bytes_len = wide_val.len() * 2;
                    let mem = windows::Win32::System::Com::CoTaskMemAlloc(bytes_len);
                    if !mem.is_null() {
                        std::ptr::copy_nonoverlapping(wide_val.as_ptr() as *const u8, mem as *mut u8, bytes_len);
                        let mut inner = PROPVARIANT_0_0::default();
                        inner.vt = VT_LPWSTR;
                        inner.Anonymous.pwszVal = windows::core::PWSTR(mem as *mut u16);

                        let mut pv = PROPVARIANT::default();
                        pv.Anonymous.Anonymous = std::mem::ManuallyDrop::new(inner);

                        if prop_store.SetValue(&app_id_key, &pv).is_ok() {
                            let _ = prop_store.Commit();
                        }
                        let _ = PropVariantClear(&mut pv);
                    }
                }

                if let Ok(persist_file) = shell_link.cast::<IPersistFile>() {
                    let _ = persist_file.Save(PCWSTR(wide_lnk.as_ptr()), true);
                }
            }
        }
    }

    pub fn set_app_user_model_id() {
        // Ensure COM is initialized on this thread (STA mode)
        unsafe {
            let _ = windows::Win32::System::Com::CoInitializeEx(
                None,
                windows::Win32::System::Com::COINIT_APARTMENTTHREADED,
            );
        }

        // Disable WebView2's internal media key handling and SMTC service so WebView2 child processes
        // (msedgewebview2.exe) do not register a duplicate/unknown media card with Windows Action Center.
        // All SMTC media controls are handled natively by MusicBox.exe via souvlaki.
        let cur_args = std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").unwrap_or_default();
        let mut final_args = cur_args;
        if !final_args.contains("HardwareMediaKeyHandling") {
            if !final_args.is_empty() {
                final_args.push(' ');
            }
            final_args.push_str("--disable-features=HardwareMediaKeyHandling,MediaSessionService");
        }
        unsafe {
            std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", final_args.trim());
        }

        // Extract and write pristine icon.png and icon.ico to disk for Windows Action Center (SMTC)
        let icon_png_bytes = include_bytes!("../icons/icon.png");
        let icon_ico_bytes = include_bytes!("../icons/icon.ico");
        let (icon_png_path, icon_ico_path) = if let Ok(appdata) = std::env::var("APPDATA") {
            let dir = std::path::Path::new(&appdata).join("com.cblade.musicbox");
            let _ = std::fs::create_dir_all(&dir);
            let p_png = dir.join("app_icon.png");
            let p_ico = dir.join("app_icon.ico");
            let _ = std::fs::write(&p_png, icon_png_bytes);
            let _ = std::fs::write(&p_ico, icon_ico_bytes);

            // Also save to %APPDATA%\MusicBox\ for redundancy
            let dir2 = std::path::Path::new(&appdata).join("MusicBox");
            let _ = std::fs::create_dir_all(&dir2);
            let _ = std::fs::write(dir2.join("app_icon.png"), icon_png_bytes);
            let _ = std::fs::write(dir2.join("app_icon.ico"), icon_ico_bytes);

            (
                Some(p_png.to_string_lossy().to_string()),
                Some(p_ico.to_string_lossy().to_string()),
            )
        } else {
            (None, None)
        };

        // Explicitly set this process's AppUserModelId to com.cblade.musicbox
        let app_id = "com.cblade.musicbox";
        let aumid: Vec<u16> = std::ffi::OsStr::new(app_id)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        unsafe {
            let _ = SetCurrentProcessExplicitAppUserModelID(PCWSTR(aumid.as_ptr()));
        }

        // Registry helper functions
        fn set_reg_str(root: HKEY, subkey_str: &str, name_str: Option<&str>, val_str: &str) {
            let subkey: Vec<u16> = std::ffi::OsStr::new(subkey_str).encode_wide().chain(std::iter::once(0)).collect();
            let mut hkey = HKEY::default();
            if unsafe { RegCreateKeyW(root, PCWSTR(subkey.as_ptr()), &mut hkey) }.is_ok() {
                let name_wide: Option<Vec<u16>> = name_str.map(|s| {
                    std::ffi::OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
                });
                let val_wide: Vec<u16> = std::ffi::OsStr::new(val_str).encode_wide().chain(std::iter::once(0)).collect();
                let bytes = unsafe { std::slice::from_raw_parts(val_wide.as_ptr() as *const u8, val_wide.len() * 2) };
                let name_ptr = name_wide.as_ref().map(|v| PCWSTR(v.as_ptr())).unwrap_or(PCWSTR(std::ptr::null()));
                let _ = unsafe { RegSetValueExW(hkey, name_ptr, None, REG_SZ, Some(bytes)) };
                let _ = unsafe { RegCloseKey(hkey) };
            }
        }

        fn set_reg_dword(root: HKEY, subkey_str: &str, name_str: &str, val: u32) {
            let subkey: Vec<u16> = std::ffi::OsStr::new(subkey_str).encode_wide().chain(std::iter::once(0)).collect();
            let mut hkey = HKEY::default();
            if unsafe { RegCreateKeyW(root, PCWSTR(subkey.as_ptr()), &mut hkey) }.is_ok() {
                let name_wide: Vec<u16> = std::ffi::OsStr::new(name_str).encode_wide().chain(std::iter::once(0)).collect();
                let bytes = unsafe { std::slice::from_raw_parts(&val as *const u32 as *const u8, 4) };
                let _ = unsafe { RegSetValueExW(hkey, PCWSTR(name_wide.as_ptr()), None, REG_DWORD, Some(bytes)) };
                let _ = unsafe { RegCloseKey(hkey) };
            }
        }

        let exe_path_buf = std::env::current_exe().ok();
        let exe_path_str = exe_path_buf.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or_else(|| "MusicBox.exe".to_string());
        let icon_primary = icon_png_path.as_deref().unwrap_or(&exe_path_str);
        let icon_default = icon_ico_path.as_deref().unwrap_or(&exe_path_str);

        // Register AUMID entries in HKCU\Software\Classes\AppUserModelId\<id>
        for id in ["com.cblade.musicbox", "MusicBox"] {
            let key = format!("Software\\Classes\\AppUserModelId\\{}", id);
            set_reg_str(HKEY_CURRENT_USER, &key, Some("DisplayName"), "MusicBox");
            set_reg_str(HKEY_CURRENT_USER, &key, Some("IconUri"), icon_primary);
            set_reg_str(HKEY_CURRENT_USER, &key, Some("IconBackgroundColor"), "00000000");
            set_reg_dword(HKEY_CURRENT_USER, &key, "ShowInSettings", 1);
        }

        // Register in HKCU\Software\Classes\Applications\MusicBox.exe
        {
            let key = "Software\\Classes\\Applications\\MusicBox.exe";
            set_reg_str(HKEY_CURRENT_USER, key, Some("FriendlyAppName"), "MusicBox");
            set_reg_str(HKEY_CURRENT_USER, key, Some("ApplicationCompany"), "BladeWorks");
            set_reg_str(HKEY_CURRENT_USER, key, Some("Icon"), icon_primary);

            let def_icon_key = "Software\\Classes\\Applications\\MusicBox.exe\\DefaultIcon";
            set_reg_str(HKEY_CURRENT_USER, def_icon_key, None, icon_default);
        }

        // Register in HKCU\Software\Classes\MusicBox
        {
            let key = "Software\\Classes\\MusicBox";
            set_reg_str(HKEY_CURRENT_USER, key, None, "MusicBox");
            set_reg_str(HKEY_CURRENT_USER, key, Some("FriendlyTypeName"), "MusicBox");

            let def_icon_key = "Software\\Classes\\MusicBox\\DefaultIcon";
            set_reg_str(HKEY_CURRENT_USER, def_icon_key, None, icon_default);
        }

        // Register in HKCU\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\<id>
        for id in ["com.cblade.musicbox", "MusicBox"] {
            let key = format!("Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\{}", id);
            set_reg_dword(HKEY_CURRENT_USER, &key, "ShowInActionCenter", 1);
        }

        // Create or update Start Menu shortcuts with PKEY_AppUserModel_ID = "com.cblade.musicbox"
        if let Some(ref exe_path) = exe_path_buf {
            if let Ok(appdata) = std::env::var("APPDATA") {
                let lnk_path = std::path::Path::new(&appdata).join(r"Microsoft\Windows\Start Menu\Programs\MusicBox.lnk");
                create_or_update_shortcut(&lnk_path, exe_path, "com.cblade.musicbox");
            }

            if let Ok(progdata) = std::env::var("ProgramData") {
                let lnk_path = std::path::Path::new(&progdata).join(r"Microsoft\Windows\Start Menu\Programs\MusicBox.lnk");
                if lnk_path.exists() {
                    create_or_update_shortcut(&lnk_path, exe_path, "com.cblade.musicbox");
                }
            }
        }
    }

    fn try_add_buttons(state: &mut TaskbarState) {
        if state.buttons_added {
            return;
        }

        let mut tip_prev = [0u16; 260];
        to_wide_buf("Previous Track", &mut tip_prev);
        let mut tip_play = [0u16; 260];
        to_wide_buf(if state.is_playing { "Pause" } else { "Play" }, &mut tip_play);
        let mut tip_stop = [0u16; 260];
        to_wide_buf("Stop", &mut tip_stop);
        let mut tip_next = [0u16; 260];
        to_wide_buf("Next Track", &mut tip_next);

        let buttons = [
            THUMBBUTTON {
                dwMask: THB_FLAGS | THB_ICON | THB_TOOLTIP,
                iId: BTN_PREV,
                iBitmap: 0,
                hIcon: state.icon_prev,
                szTip: tip_prev,
                dwFlags: THBF_ENABLED,
            },
            THUMBBUTTON {
                dwMask: THB_FLAGS | THB_ICON | THB_TOOLTIP,
                iId: BTN_PLAY_PAUSE,
                iBitmap: 0,
                hIcon: if state.is_playing { state.icon_pause } else { state.icon_play },
                szTip: tip_play,
                dwFlags: THBF_ENABLED,
            },
            THUMBBUTTON {
                dwMask: THB_FLAGS | THB_ICON | THB_TOOLTIP,
                iId: BTN_STOP,
                iBitmap: 0,
                hIcon: state.icon_stop,
                szTip: tip_stop,
                dwFlags: THBF_ENABLED,
            },
            THUMBBUTTON {
                dwMask: THB_FLAGS | THB_ICON | THB_TOOLTIP,
                iId: BTN_NEXT,
                iBitmap: 0,
                hIcon: state.icon_next,
                szTip: tip_next,
                dwFlags: THBF_ENABLED,
            },
        ];

        unsafe {
            if state.taskbar_list.ThumbBarAddButtons(state.hwnd, &buttons).is_ok() {
                state.buttons_added = true;
            }
        }
    }

    pub fn set_window_app_user_model_id(hwnd: HWND, aumid: &str) {
        unsafe {
            if let Ok(store) = SHGetPropertyStoreForWindow::<IPropertyStore>(hwnd) {
                let app_id_key = PROPERTYKEY {
                    fmtid: windows::core::GUID::from_values(
                        0x9F4C2855,
                        0x9F79,
                        0x4B39,
                        [0xA8, 0xD0, 0xE1, 0xD4, 0x2D, 0xE1, 0xD5, 0xF3],
                    ),
                    pid: 5,
                };
                let wide_val: Vec<u16> = aumid.encode_utf16().chain(std::iter::once(0)).collect();
                let bytes_len = wide_val.len() * 2;
                let mem = windows::Win32::System::Com::CoTaskMemAlloc(bytes_len);
                if !mem.is_null() {
                    std::ptr::copy_nonoverlapping(wide_val.as_ptr() as *const u8, mem as *mut u8, bytes_len);
                    let mut inner = PROPVARIANT_0_0::default();
                    inner.vt = VT_LPWSTR;
                    inner.Anonymous.pwszVal = windows::core::PWSTR(mem as *mut u16);

                    let mut pv = PROPVARIANT::default();
                    pv.Anonymous.Anonymous = std::mem::ManuallyDrop::new(inner);

                    let _ = store.SetValue(&app_id_key, &pv);
                    let _ = PropVariantClear(&mut pv);
                }
            }
        }
    }

    pub fn init_taskbar(app_handle: &AppHandle, hwnd_raw: HWND) {
        set_app_user_model_id();
        set_window_app_user_model_id(hwnd_raw, "com.cblade.musicbox");

        // Initialize native Windows SMTC controls via souvlaki
        let config = PlatformConfig {
            dbus_name: "com.cblade.musicbox",
            display_name: "MusicBox",
            hwnd: Some(hwnd_raw.0 as *mut std::ffi::c_void),
        };

        if let Ok(mut controls) = MediaControls::new(config) {
            let app_handle_clone = app_handle.clone();
            let _ = controls.attach(move |event| {
                match event {
                    MediaControlEvent::Play | MediaControlEvent::Pause | MediaControlEvent::Toggle => {
                        let _ = app_handle_clone.emit("media-toggle-play", ());
                    }
                    MediaControlEvent::Next => {
                        let _ = app_handle_clone.emit("media-next", ());
                    }
                    MediaControlEvent::Previous => {
                        let _ = app_handle_clone.emit("media-previous", ());
                    }
                    MediaControlEvent::Stop => {
                        let _ = app_handle_clone.emit("media-stop", ());
                    }
                    MediaControlEvent::SetPosition(pos) => {
                        let _ = app_handle_clone.emit("media-seek", pos.0.as_secs_f64());
                    }
                    MediaControlEvent::SeekBy(dir, dur) => {
                        let delta = match dir {
                            SeekDirection::Forward => dur.as_secs_f64(),
                            SeekDirection::Backward => -(dur.as_secs_f64()),
                        };
                        let _ = app_handle_clone.emit("media-seek-delta", delta);
                    }
                    _ => {}
                }
            });

            let _ = controls.set_playback(MediaPlayback::Stopped);
            *MEDIA_CONTROLS.lock().unwrap() = Some(controls);
        }

        unsafe {
            let msg = RegisterWindowMessageW(w!("TaskbarButtonCreated"));
            MSG_TASKBAR_CREATED.store(msg, std::sync::atomic::Ordering::SeqCst);

            let taskbar_list: ITaskbarList3 = match CoCreateInstance(&TaskbarList, None, CLSCTX_INPROC_SERVER) {
                Ok(tb) => tb,
                Err(e) => {
                    log::warn!("Failed to create ITaskbarList3: {:?}", e);
                    return;
                }
            };

            if let Err(e) = taskbar_list.HrInit() {
                log::warn!("Failed to HrInit ITaskbarList3: {:?}", e);
                return;
            }

            // Create crisp 16x16 icons
            let icon_prev = create_rgba_icon(|x, y| {
                (x >= 2 && x <= 4 && y >= 3 && y <= 12) ||
                (x >= 5 && x <= 13 && y >= 3 && y <= 12 && (13 - x) <= (if y <= 7 { (y - 3) * 2 + 1 } else { (12 - y) * 2 + 1 }))
            });

            let icon_play = create_rgba_icon(|x, y| {
                x >= 4 && x <= 12 && y >= 3 && y <= 12 && (x - 4) <= (if y <= 7 { (y - 3) * 2 + 1 } else { (12 - y) * 2 + 1 })
            });

            let icon_pause = create_rgba_icon(|x, y| {
                ((x >= 4 && x <= 6) || (x >= 9 && x <= 11)) && y >= 3 && y <= 12
            });

            let icon_stop = create_rgba_icon(|x, y| {
                x >= 3 && x <= 12 && y >= 3 && y <= 12
            });

            let icon_next = create_rgba_icon(|x, y| {
                (x >= 11 && x <= 13 && y >= 3 && y <= 12) ||
                (x >= 2 && x <= 10 && y >= 3 && y <= 12 && (x - 2) <= (if y <= 7 { (y - 3) * 2 + 1 } else { (12 - y) * 2 + 1 }))
            });

            let mut state = TaskbarState {
                hwnd: hwnd_raw,
                taskbar_list,
                icon_prev,
                icon_play,
                icon_pause,
                icon_stop,
                icon_next,
                buttons_added: false,
                is_playing: false,
            };

            try_add_buttons(&mut state);

            let boxed_handle = Box::into_raw(Box::new(app_handle.clone())) as usize;
            let _ = SetWindowSubclass(hwnd_raw, Some(subclass_proc), SUBCLASS_ID, boxed_handle);

            *TASKBAR_STATE.lock().unwrap() = Some(state);
        }
    }

    pub fn update_playback_state(is_playing: bool) {
        let mut lock = TASKBAR_STATE.lock().unwrap();
        if let Some(state) = lock.as_mut() {
            state.is_playing = is_playing;
            if !state.buttons_added {
                try_add_buttons(state);
            } else {
                let mut tip_play_pause = [0u16; 260];
                to_wide_buf(if is_playing { "Pause" } else { "Play" }, &mut tip_play_pause);

                let btn = THUMBBUTTON {
                    dwMask: THB_FLAGS | THB_ICON | THB_TOOLTIP,
                    iId: BTN_PLAY_PAUSE,
                    iBitmap: 0,
                    hIcon: if is_playing { state.icon_pause } else { state.icon_play },
                    szTip: tip_play_pause,
                    dwFlags: THBF_ENABLED,
                };

                unsafe {
                    let _ = state.taskbar_list.ThumbBarUpdateButtons(state.hwnd, &[btn]);
                }
            }
        }

        // Also sync native SMTC playback state
        let mut smtc_lock = match MEDIA_CONTROLS.lock() {
            Ok(l) => l,
            Err(_) => return,
        };
        if let Some(controls) = smtc_lock.as_mut() {
            let playback = if is_playing {
                MediaPlayback::Playing { progress: None }
            } else {
                MediaPlayback::Paused { progress: None }
            };
            let _ = controls.set_playback(playback);
        }
    }

    pub fn update_smtc_metadata(
        title: &str,
        artist: Option<&str>,
        album: Option<&str>,
        cover_url: Option<&str>,
        duration_secs: Option<f64>,
    ) {
        let mut lock = match MEDIA_CONTROLS.lock() {
            Ok(l) => l,
            Err(_) => return,
        };
        if let Some(controls) = lock.as_mut() {
            let dur = duration_secs.and_then(|d| if d > 0.0 { Some(std::time::Duration::from_secs_f64(d)) } else { None });
            let _ = controls.set_metadata(MediaMetadata {
                title: Some(title),
                artist,
                album,
                cover_url,
                duration: dur,
            });
        }
    }

    pub fn update_smtc_playback(is_playing: bool, position_secs: Option<f64>) {
        let mut lock = match MEDIA_CONTROLS.lock() {
            Ok(l) => l,
            Err(_) => return,
        };
        if let Some(controls) = lock.as_mut() {
            let pos = position_secs.and_then(|s| if s >= 0.0 { Some(MediaPosition(std::time::Duration::from_secs_f64(s))) } else { None });
            let playback = if is_playing {
                MediaPlayback::Playing { progress: pos }
            } else {
                MediaPlayback::Paused { progress: pos }
            };
            let _ = controls.set_playback(playback);
        }
    }
}

#[cfg(not(windows))]
pub mod win {
    use tauri::AppHandle;
    pub fn init_taskbar(_app_handle: &AppHandle, _hwnd: ()) {}
    pub fn update_playback_state(_is_playing: bool) {}
    pub fn update_smtc_metadata(
        _title: &str,
        _artist: Option<&str>,
        _album: Option<&str>,
        _cover_url: Option<&str>,
        _duration_secs: Option<f64>,
    ) {}
    pub fn update_smtc_playback(_is_playing: bool, _position_secs: Option<f64>) {}
}
