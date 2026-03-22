use std::fs;

use tauri::{AppHandle, State};

use super::app_state::SharedState;
use super::config::{ConfigStore, Vault};

#[derive(serde::Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

#[tauri::command]
pub fn add_vault(app: AppHandle, name: String, path: String) {
    let mut config = ConfigStore::load(&app);

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

    ConfigStore::save(&app, &config);
}

#[tauri::command]
pub fn read_file(state: State<SharedState>, path: String) -> String {
    let mut s = state.lock().unwrap();

    if let Some(cached) = s.file_cache.get(&path) {
        return cached.clone();
    }

    let content = fs::read_to_string(&path).unwrap_or_else(|_| "".to_string());

    s.file_cache.insert(path.clone(), content.clone());

    content
}

#[tauri::command]
pub fn write_file(state: State<SharedState>, path: String, content: String) {
    {
        let mut s = state.lock().unwrap();
        s.file_cache.insert(path.clone(), content.clone());
    }

    if let Err(e) = fs::write(&path, content) {
        eprintln!("write failed: {}", e);
    }
}

#[tauri::command]
pub fn invalidate_cache(state: State<SharedState>, path: String) {
    let mut s = state.lock().unwrap();
    s.file_cache.remove(&path);
}

#[tauri::command]
pub fn create_file(path: String) {
    if let Err(e) = fs::write(&path, "") {
        eprintln!("create file failed: {}", e);
    }
}

#[tauri::command]
pub fn delete_file(state: State<SharedState>, path: String) {
    {
        let mut s = state.lock().unwrap();
        s.file_cache.remove(&path);
    }

    if let Err(e) = fs::remove_file(&path) {
        eprintln!("delete failed: {}", e);
    }
}

#[tauri::command]
pub fn rename_file(state: State<SharedState>, old_path: String, new_path: String) {
    {
        let mut s = state.lock().unwrap();

        if let Some(content) = s.file_cache.remove(&old_path) {
            s.file_cache.insert(new_path.clone(), content);
        }
    }

    if let Err(e) = fs::rename(old_path, new_path) {
        eprintln!("rename failed: {}", e);
    }
}

#[tauri::command]
pub fn read_dir(path: String) -> Vec<FileNode> {
    let mut nodes = vec![];

    if let Ok(entries) = fs::read_dir(&path) {
        for e in entries.flatten() {
            let p = e.path();

            let name = p.file_name().unwrap().to_string_lossy();

            if name.starts_with('.') {
                continue;
            }

            let is_dir = p.is_dir();

            nodes.push(FileNode {
                name: name.to_string(),
                path: p.to_string_lossy().to_string(),
                is_dir,
                children: None, // 🔥 no recursion
            });
        }
    }

    nodes
}
