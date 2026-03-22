use crate::features::app_state::SharedState;
use crate::features::config::*;
use crate::features::vault::*;
use tauri_plugin_prevent_default::PlatformOptions;

pub mod features;

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
            read_dir,
            create_file,
            invalidate_cache,
            write_file,
            read_file,
            delete_file,
            rename_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
