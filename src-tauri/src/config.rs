use std::path::PathBuf;

use shared::AppConfig;
use tauri::{AppHandle, Manager};

pub struct ConfigStore;

impl ConfigStore {
    fn path(app: &AppHandle) -> PathBuf {
        let mut path = app.path().app_config_dir().unwrap();
        path.push("kitab.json");
        path
    }

    pub fn load(app: &AppHandle) -> AppConfig {
        let path = Self::path(app);

        if let Ok(data) = std::fs::read_to_string(path) {
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            AppConfig::default()
        }
    }

    pub fn save(app: &AppHandle, config: &AppConfig) {
        let path = Self::path(app);

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let data = serde_json::to_string_pretty(config).unwrap();

        if let Err(e) = std::fs::write(path, data) {
            eprintln!("Failed to save config: {}", e);
        }
    }
}

#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> AppConfig {
    ConfigStore::load(&app)
}

#[tauri::command]
pub fn clear_config(app: tauri::AppHandle) {
    let config = AppConfig::default();
    ConfigStore::save(&app, &config);
}

#[tauri::command]
pub fn get_last_opened(app: tauri::AppHandle) -> Option<String> {
    let config = ConfigStore::load(&app);
    config.last_opened
}

#[tauri::command]
pub fn set_last_opened(app: tauri::AppHandle, path: String) {
    let mut config = ConfigStore::load(&app);
    config.last_opened = Some(path);
    ConfigStore::save(&app, &config);
}
