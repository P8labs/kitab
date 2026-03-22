use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone)]
pub struct Vault {
    pub name: String,
    pub path: String,
}

#[derive(Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub recent_vaults: Vec<Vault>,
    pub last_opened: Option<String>,
}

pub struct ConfigStore;

impl ConfigStore {
    fn path(app: &AppHandle) -> PathBuf {
        let mut path = app.path().app_config_dir().unwrap();
        path.push("kitab.json");
        path
    }

    pub fn load(app: &AppHandle) -> AppConfig {
        let path = Self::path(app);

        std::fs::read_to_string(path)
            .ok()
            .and_then(|d| serde_json::from_str(&d).ok())
            .unwrap_or_default()
    }

    pub fn save(app: &AppHandle, config: &AppConfig) {
        let path = Self::path(app);

        if let Some(p) = path.parent() {
            std::fs::create_dir_all(p).ok();
        }

        let data = serde_json::to_string_pretty(config).unwrap();
        std::fs::write(path, data).ok();
    }
}

#[tauri::command]
pub fn get_config(app: AppHandle) -> AppConfig {
    ConfigStore::load(&app)
}
