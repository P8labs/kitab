use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};
use shared::Vault;
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

use crate::config::ConfigStore;

pub struct VaultService;

#[derive(Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

impl VaultService {
    pub fn add(app: &AppHandle, name: String, path: String) {
        let mut config = ConfigStore::load(app);

        config.recent_vaults.retain(|v| v.path != path);
        config.recent_vaults.insert(
            0,
            Vault {
                name,
                path: path.clone(),
            },
        );
        config.recent_vaults.truncate(10);

        config.last_opened = Some(path);

        ConfigStore::save(app, &config);
    }

    pub fn remove(app: &AppHandle, path: String) {
        let mut config = ConfigStore::load(app);

        config.recent_vaults.retain(|v| v.path != path);

        if config.last_opened == Some(path.clone()) {
            config.last_opened = None;
        }

        ConfigStore::save(app, &config);
    }

    pub fn set_active(app: &AppHandle, path: String) {
        let mut config = ConfigStore::load(app);

        config.last_opened = Some(path);

        ConfigStore::save(app, &config);
    }

    fn build(path: &Path) -> Vec<FileNode> {
        let mut nodes = vec![];

        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let path = entry.path();
                let is_dir = path.is_dir();

                // skip dot folders
                if let Some(name) = path.file_name() {
                    let name = name.to_string_lossy();
                    if name == ".git" || name == "node_modules" {
                        continue;
                    }
                }

                let node = FileNode {
                    name: path.file_name().unwrap().to_string_lossy().to_string(),
                    path: path.to_string_lossy().to_string(),
                    is_dir,
                    children: if is_dir {
                        Some(Self::build(&path))
                    } else {
                        None
                    },
                };

                nodes.push(node);
            }
        }

        nodes
    }

    pub fn read_dir(path: &str) -> Vec<FileNode> {
        Self::build(Path::new(path))
    }
    pub fn read_file(path: &str) -> String {
        fs::read_to_string(path).unwrap_or_default()
    }

    pub fn write_file(path: &str, content: String) {
        if let Err(e) = fs::write(path, content) {
            eprintln!("Failed to write file: {}", e);
        }
    }
}

#[tauri::command]
pub fn add_vault(app: AppHandle, name: String, path: String) {
    VaultService::add(&app, name, path);
}

#[tauri::command]
pub fn remove_vault(app: AppHandle, path: String) {
    VaultService::remove(&app, path);
}

#[tauri::command]
pub fn set_active_vault(app: AppHandle, path: String) {
    VaultService::set_active(&app, path);
}

#[tauri::command]
pub fn read_dir(path: String) -> Vec<FileNode> {
    VaultService::read_dir(&path)
}

#[tauri::command]
pub fn read_file(path: String) -> String {
    VaultService::read_file(&path)
}

#[tauri::command]
pub fn write_file(path: String, content: String) {
    VaultService::write_file(&path, content);
}

#[tauri::command]
pub fn pick_folder(app: AppHandle) -> Option<String> {
    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog()
        .file()
        .set_title("Select Folder for Vault")
        .pick_folder(move |res| {
            let _ = tx.send(res);
        });

    let res: Option<FilePath> = rx.recv().ok().flatten();

    res.map(|p| match p {
        FilePath::Path(path) => path.to_string_lossy().to_string(),
        FilePath::Url(url) => url.to_string(),
    })
}
