#[cfg(windows)]
pub mod win {
    use std::os::windows::ffi::OsStrExt;
    use std::sync::Mutex;
    use tauri::{AppHandle, Emitter};
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM, PROPERTYKEY};
    use windows::Win32::Graphics::Gdi::{CreateBitmap, DeleteObject, HBITMAP};
    use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER, IPersistFile, STGM};
    use windows::Win32::System::Com::StructuredStorage::{PROPVARIANT, PROPVARIANT_0_0, PropVariantClear};
    use windows::Win32::System::Variant::VT_LPWSTR;
    use windows::Win32::UI::Shell::{
        DefSubclassProc, ITaskbarList3, SetCurrentProcessExplicitAppUserModelID,
        SetWindowSubclass, TaskbarList, THBF_ENABLED, THB_FLAGS, THB_ICON, THB_TOOLTIP,
        THUMBBUTTON, IShellLinkW, ShellLink,
    };
    use windows::Win32::UI::Shell::PropertiesSystem::IPropertyStore;
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

            let shell_link: IShellLinkW = match CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER) {
                Ok(sl) => sl,
                Err(_) => return,
            };

            let persist_file: IPersistFile = match shell_link.cast() {
                Ok(pf) => pf,
                Err(_) => return,
            };

            let wide_lnk: Vec<u16> = lnk_path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();

            // Load existing shortcut if present
            if lnk_path.exists() {
                let _ = persist_file.Load(PCWSTR(wide_lnk.as_ptr()), STGM(0));
            }

            let wide_exe: Vec<u16> = exe_path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
            let _ = shell_link.SetPath(PCWSTR(wide_exe.as_ptr()));
            if let Some(dir) = exe_path.parent() {
                let wide_dir: Vec<u16> = dir.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
                let _ = shell_link.SetWorkingDirectory(PCWSTR(wide_dir.as_ptr()));
            }
            let _ = shell_link.SetIconLocation(PCWSTR(wide_exe.as_ptr()), 0);

            let desc: Vec<u16> = std::ffi::OsStr::new("MusicBox").encode_wide().chain(std::iter::once(0)).collect();
            let _ = shell_link.SetDescription(PCWSTR(desc.as_ptr()));

            // Set PKEY_AppUserModel_ID: {9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3}, 5
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

            let _ = persist_file.Save(PCWSTR(wide_lnk.as_ptr()), true);
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

        // Set WebView2 environment arguments so child webview processes inherit the AUMID
        let cur_args = std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").unwrap_or_default();
        if !cur_args.contains("--app-user-model-id=") {
            let new_args = if cur_args.is_empty() {
                "--app-user-model-id=com.cblade.musicbox --app-id=com.cblade.musicbox".to_string()
            } else {
                format!("{} --app-user-model-id=com.cblade.musicbox --app-id=com.cblade.musicbox", cur_args)
            };
            unsafe {
                std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", new_args);
            }
        }

        // Extract and write pristine icon.png to disk for Windows Action Center (SMTC)
        let icon_png_bytes = include_bytes!("../icons/icon.png");
        let icon_png_path = if let Ok(appdata) = std::env::var("APPDATA") {
            let dir = std::path::Path::new(&appdata).join("com.cblade.musicbox");
            let _ = std::fs::create_dir_all(&dir);
            let p = dir.join("app_icon.png");
            let needs_write = match std::fs::metadata(&p) {
                Ok(m) => m.len() != icon_png_bytes.len() as u64,
                Err(_) => true,
            };
            if needs_write {
                let _ = std::fs::write(&p, icon_png_bytes);
            }

            // Also save to %APPDATA%\MusicBox\app_icon.png for redundancy
            let dir2 = std::path::Path::new(&appdata).join("MusicBox");
            let _ = std::fs::create_dir_all(&dir2);
            let p2 = dir2.join("app_icon.png");
            if !p2.exists() {
                let _ = std::fs::write(&p2, icon_png_bytes);
            }

            Some(p.to_string_lossy().to_string())
        } else {
            None
        };

        // Explicitly set this process's AppUserModelId
        let aumid: Vec<u16> = std::ffi::OsStr::new("com.cblade.musicbox")
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        unsafe {
            let _ = SetCurrentProcessExplicitAppUserModelID(PCWSTR(aumid.as_ptr()));
        }

        // Helper to register AUMID in HKCU\Software\Classes\AppUserModelId\<id>
        fn register_aumid(aumid_str: &str, display_name: &str, icon_path: Option<&str>) {
            let subkey_str = format!("Software\\Classes\\AppUserModelId\\{}", aumid_str);
            let subkey: Vec<u16> = std::ffi::OsStr::new(&subkey_str)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let mut hkey = HKEY::default();
            if unsafe { RegCreateKeyW(HKEY_CURRENT_USER, PCWSTR(subkey.as_ptr()), &mut hkey) }.is_ok() {
                let name_disp: Vec<u16> = std::ffi::OsStr::new("DisplayName").encode_wide().chain(std::iter::once(0)).collect();
                let val_disp: Vec<u16> = std::ffi::OsStr::new(display_name).encode_wide().chain(std::iter::once(0)).collect();
                let bytes_disp = unsafe { std::slice::from_raw_parts(val_disp.as_ptr() as *const u8, val_disp.len() * 2) };
                let _ = unsafe { RegSetValueExW(hkey, PCWSTR(name_disp.as_ptr()), None, REG_SZ, Some(bytes_disp)) };

                if let Some(icon) = icon_path {
                    let name_icon: Vec<u16> = std::ffi::OsStr::new("IconUri").encode_wide().chain(std::iter::once(0)).collect();
                    let val_icon: Vec<u16> = std::ffi::OsStr::new(icon).encode_wide().chain(std::iter::once(0)).collect();
                    let bytes_icon = unsafe { std::slice::from_raw_parts(val_icon.as_ptr() as *const u8, val_icon.len() * 2) };
                    let _ = unsafe { RegSetValueExW(hkey, PCWSTR(name_icon.as_ptr()), None, REG_SZ, Some(bytes_icon)) };

                    let name_bg: Vec<u16> = std::ffi::OsStr::new("IconBackgroundColor").encode_wide().chain(std::iter::once(0)).collect();
                    let val_bg: Vec<u16> = std::ffi::OsStr::new("00000000").encode_wide().chain(std::iter::once(0)).collect();
                    let bytes_bg = unsafe { std::slice::from_raw_parts(val_bg.as_ptr() as *const u8, val_bg.len() * 2) };
                    let _ = unsafe { RegSetValueExW(hkey, PCWSTR(name_bg.as_ptr()), None, REG_SZ, Some(bytes_bg)) };
                }

                let name_show: Vec<u16> = std::ffi::OsStr::new("ShowInSettings").encode_wide().chain(std::iter::once(0)).collect();
                let val_show: u32 = 1;
                let bytes_show = unsafe { std::slice::from_raw_parts(&val_show as *const u32 as *const u8, 4) };
                let _ = unsafe { RegSetValueExW(hkey, PCWSTR(name_show.as_ptr()), None, REG_DWORD, Some(bytes_show)) };

                let _ = unsafe { RegCloseKey(hkey) };
            }
        }

        // Register both "com.cblade.musicbox" and "MusicBox" to catch both lookups
        register_aumid("com.cblade.musicbox", "MusicBox", icon_png_path.as_deref());
        register_aumid("MusicBox", "MusicBox", icon_png_path.as_deref());

        // Register in HKCU\Software\Classes\Applications\MusicBox.exe
        {
            let subkey: Vec<u16> = std::ffi::OsStr::new("Software\\Classes\\Applications\\MusicBox.exe")
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            let mut hkey = HKEY::default();
            if unsafe { RegCreateKeyW(HKEY_CURRENT_USER, PCWSTR(subkey.as_ptr()), &mut hkey) }.is_ok() {
                let name_friendly: Vec<u16> = std::ffi::OsStr::new("FriendlyAppName").encode_wide().chain(std::iter::once(0)).collect();
                let val_friendly: Vec<u16> = std::ffi::OsStr::new("MusicBox").encode_wide().chain(std::iter::once(0)).collect();
                let bytes_friendly = unsafe { std::slice::from_raw_parts(val_friendly.as_ptr() as *const u8, val_friendly.len() * 2) };
                let _ = unsafe { RegSetValueExW(hkey, PCWSTR(name_friendly.as_ptr()), None, REG_SZ, Some(bytes_friendly)) };

                let name_comp: Vec<u16> = std::ffi::OsStr::new("ApplicationCompany").encode_wide().chain(std::iter::once(0)).collect();
                let val_comp: Vec<u16> = std::ffi::OsStr::new("cblade").encode_wide().chain(std::iter::once(0)).collect();
                let bytes_comp = unsafe { std::slice::from_raw_parts(val_comp.as_ptr() as *const u8, val_comp.len() * 2) };
                let _ = unsafe { RegSetValueExW(hkey, PCWSTR(name_comp.as_ptr()), None, REG_SZ, Some(bytes_comp)) };

                if let Some(ref icon) = icon_png_path {
                    let name_ico: Vec<u16> = std::ffi::OsStr::new("Icon").encode_wide().chain(std::iter::once(0)).collect();
                    let val_ico: Vec<u16> = std::ffi::OsStr::new(icon).encode_wide().chain(std::iter::once(0)).collect();
                    let bytes_ico = unsafe { std::slice::from_raw_parts(val_ico.as_ptr() as *const u8, val_ico.len() * 2) };
                    let _ = unsafe { RegSetValueExW(hkey, PCWSTR(name_ico.as_ptr()), None, REG_SZ, Some(bytes_ico)) };
                }

                let _ = unsafe { RegCloseKey(hkey) };
            }
        }

        // Register in HKCU\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings
        for id in ["com.cblade.musicbox", "MusicBox"] {
            let subkey_str = format!("Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\{}", id);
            let subkey: Vec<u16> = std::ffi::OsStr::new(&subkey_str)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            let mut hkey = HKEY::default();
            if unsafe { RegCreateKeyW(HKEY_CURRENT_USER, PCWSTR(subkey.as_ptr()), &mut hkey) }.is_ok() {
                let name_show: Vec<u16> = std::ffi::OsStr::new("ShowInActionCenter").encode_wide().chain(std::iter::once(0)).collect();
                let val_show: u32 = 1;
                let bytes_show = unsafe { std::slice::from_raw_parts(&val_show as *const u32 as *const u8, 4) };
                let _ = unsafe { RegSetValueExW(hkey, PCWSTR(name_show.as_ptr()), None, REG_DWORD, Some(bytes_show)) };
                let _ = unsafe { RegCloseKey(hkey) };
            }
        }

        // Create or update Start Menu shortcut with PKEY_AppUserModel_ID
        if let Ok(appdata) = std::env::var("APPDATA") {
            let lnk_path = std::path::Path::new(&appdata).join(r"Microsoft\Windows\Start Menu\Programs\MusicBox.lnk");
            if let Ok(exe_path) = std::env::current_exe() {
                create_or_update_shortcut(&lnk_path, &exe_path, "com.cblade.musicbox");
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

    pub fn init_taskbar(app_handle: &AppHandle, hwnd_raw: HWND) {
        set_app_user_model_id();

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
    }
}

#[cfg(not(windows))]
pub mod win {
    use tauri::AppHandle;
    pub fn init_taskbar(_app_handle: &AppHandle, _hwnd: ()) {}
    pub fn update_playback_state(_is_playing: bool) {}
}
