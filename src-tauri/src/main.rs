// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(windows)]
    {
        unsafe {
            use windows::core::PCWSTR;
            use windows::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID;
            let aumid: Vec<u16> = "com.cblade.musicbox\0".encode_utf16().collect();
            let _ = SetCurrentProcessExplicitAppUserModelID(PCWSTR(aumid.as_ptr()));
        }

        // Disable WebView2 HardwareMediaKeyHandling and MediaSessionService so WebView2 child processes
        // (msedgewebview2.exe) do not register an "Unknown app" media card in Windows Action Center.
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
    }

    app_lib::run();
}
