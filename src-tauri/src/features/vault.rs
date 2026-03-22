use std::fs;
use std::path::Path;

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
    let full_path = Path::new(&path).join(&name);

    if let Err(e) = fs::create_dir_all(&full_path) {
        eprintln!("failed to create vault dir: {}", e);
        return;
    }

    let full_path_str = full_path.to_string_lossy().to_string();

    let mut config = ConfigStore::load(&app);

    config.recent_vaults.retain(|v| v.path != full_path_str);
    config.recent_vaults.insert(
        0,
        Vault {
            name,
            path: full_path_str.clone(),
        },
    );

    config.recent_vaults.truncate(10);
    config.last_opened = Some(full_path_str);

    ConfigStore::save(&app, &config);
}

#[tauri::command]
pub fn set_active_vault(app: AppHandle, path: String) {
    let mut config = ConfigStore::load(&app);

    let vault_name = Path::new(&path)
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "Vault".to_string());

    config.recent_vaults.retain(|v| v.path != path);
    config.recent_vaults.insert(
        0,
        Vault {
            name: vault_name,
            path: path.clone(),
        },
    );

    config.recent_vaults.truncate(10);
    config.last_opened = Some(path);
    ConfigStore::save(&app, &config);
}

#[tauri::command]
pub fn close_active_vault(app: AppHandle) {
    let mut config = ConfigStore::load(&app);
    config.last_opened = None;
    ConfigStore::save(&app, &config);
}

#[tauri::command]
pub fn remove_vault(app: AppHandle, path: String) {
    let mut config = ConfigStore::load(&app);

    config.recent_vaults.retain(|v| v.path != path);
    if config.last_opened.as_deref() == Some(path.as_str()) {
        config.last_opened = None;
    }

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
pub fn create_dir(path: String) {
    if let Err(e) = fs::create_dir_all(&path) {
        eprintln!("create dir failed: {}", e);
    }
}

#[tauri::command]
pub fn delete_path(state: State<SharedState>, path: String) {
    {
        let mut s = state.lock().unwrap();
        let cached_paths: Vec<String> = s
            .file_cache
            .keys()
            .filter(|cached| cached.starts_with(&path))
            .cloned()
            .collect();

        for cached in cached_paths {
            s.file_cache.remove(&cached);
        }
    }

    let target = Path::new(&path);
    let delete_result = if target.is_dir() {
        fs::remove_dir_all(target)
    } else {
        fs::remove_file(target)
    };

    if let Err(e) = delete_result {
        eprintln!("delete failed: {}", e);
    }
}

#[tauri::command]
pub fn rename_file(state: State<SharedState>, old_path: String, new_path: String) {
    {
        let mut s = state.lock().unwrap();

        let cached_paths: Vec<String> = s
            .file_cache
            .keys()
            .filter(|cached| cached.starts_with(&old_path))
            .cloned()
            .collect();

        for old_cached in cached_paths {
            if let Some(content) = s.file_cache.remove(&old_cached) {
                let replacement = old_cached.replacen(&old_path, &new_path, 1);
                s.file_cache.insert(replacement, content);
            }
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
                children: None,
            });
        }
    }

    nodes.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            return a.name.to_lowercase().cmp(&b.name.to_lowercase());
        }

        if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    nodes
}
