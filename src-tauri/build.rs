fn main() {
  println!("cargo:rerun-if-changed=icons/icon.ico");
  println!("cargo:rerun-if-changed=icons/icon.png");
  println!("cargo:rerun-if-changed=icons/32x32.png");
  println!("cargo:rerun-if-changed=icons/128x128.png");
  println!("cargo:rerun-if-changed=tauri.conf.json");

  let windows_attrs = tauri_build::WindowsAttributes::new().window_icon_path("icons/icon.ico");
  let attrs = tauri_build::Attributes::new().windows_attributes(windows_attrs);

  tauri_build::try_build(attrs).expect("failed to run tauri-build");
}
