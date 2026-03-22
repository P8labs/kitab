use crate::features::app_state::SharedState;
use crate::features::config::*;
use crate::features::vault::*;
use tauri_plugin_prevent_default::PlatformOptions;

pub mod features;

#[tauri::command]
async fn handle_window_action(
    _app: tauri::AppHandle,
    window: tauri::Window,
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
        .plugin(tauri_plugin_dialog::init())
        .manage(SharedState::default())
        .plugin(
            tauri_plugin_prevent_default::Builder::new()
                .platform(
                    PlatformOptions::new()
                        .general_autofill(false)
                        .password_autosave(false)
                        .browser_accelerator_keys(false)
                        .default_context_menus(false)
                        .default_script_dialogs(false)
                        .built_in_error_page(false)
                        .pinch_zoom(false)
                        .swipe_navigation(false),
                )
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_config,
            add_vault,
            set_active_vault,
            close_active_vault,
            remove_vault,
            read_dir,
            create_file,
            create_dir,
            invalidate_cache,
            write_file,
            read_file,
            delete_path,
            rename_file,
            handle_window_action
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
