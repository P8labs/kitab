use tauri::Runtime;

#[tauri::command]
async fn handle_window_action<R: Runtime>(
    _app: tauri::AppHandle<R>,
    window: tauri::Window<R>,
    action: &str,
) -> Result<(), String> {
    let rs = match action {
        "close" => window.close(),
        "hide" => window.hide(),
        "min" => window.minimize(),
        "max" => {
            if window.is_maximized().unwrap() {
                window.unmaximize().unwrap()
            } else {
                window.maximize().unwrap()
            }
            Ok(())
        }

        _ => Ok(()),
    };

    if rs.is_err() {
        return Err("Failed to execute the action".to_string());
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![handle_window_action])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
