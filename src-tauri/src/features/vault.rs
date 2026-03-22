use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

use rayon::prelude::*;
use tauri::{AppHandle, State};

use super::app_state::{BacklinkScanCacheEntry, SharedState};
use super::config::{ConfigStore, Vault};

#[derive(serde::Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

#[derive(serde::Serialize, Clone)]
pub struct NoteEntry {
    pub title: String,
    pub path: String,
}

#[derive(serde::Serialize, Clone)]
pub struct HeadingEntry {
    pub level: usize,
    pub text: String,
}

fn collect_notes_recursive(dir: &Path, output: &mut Vec<NoteEntry>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name_os) = path.file_name() else {
            continue;
        };

        let name = name_os.to_string_lossy();
        if name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            collect_notes_recursive(&path, output);
            continue;
        }

        let is_markdown = path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("md"))
            .unwrap_or(false);

        if !is_markdown {
            continue;
        }

        let title = path
            .file_stem()
            .map(|stem| stem.to_string_lossy().to_string())
            .unwrap_or_else(|| name.to_string());

        output.push(NoteEntry {
            title,
            path: path.to_string_lossy().to_string(),
        });
    }
}

fn extract_wikilink_targets(content: &str) -> Vec<String> {
    let bytes = content.as_bytes();
    let mut idx = 0usize;
    let mut targets = Vec::new();

    while idx + 1 < bytes.len() {
        if bytes[idx] == b'[' && bytes[idx + 1] == b'[' {
            let start = idx + 2;
            let mut end = start;

            while end + 1 < bytes.len() {
                if bytes[end] == b']' && bytes[end + 1] == b']' {
                    break;
                }
                end += 1;
            }

            if end + 1 < bytes.len() {
                let raw = &content[start..end];
                let target = raw.split('|').next().unwrap_or_default().trim();
                if !target.is_empty() {
                    targets.push(target.to_lowercase());
                }
                idx = end + 2;
                continue;
            }
        }

        idx += 1;
    }

    targets
}

fn mtime_unix_ms(path: &Path) -> Option<u128> {
    let meta = fs::metadata(path).ok()?;
    let modified = meta.modified().ok()?;
    let dur = modified.duration_since(UNIX_EPOCH).ok()?;
    Some(dur.as_millis())
}

pub fn compute_backlinks_with_cache(
    vault_path: &Path,
    note_title: &str,
    active_file: Option<&str>,
    cache: &mut HashMap<String, BacklinkScanCacheEntry>,
) -> Vec<String> {
    if note_title.trim().is_empty() {
        return Vec::new();
    }

    let mut notes = Vec::new();
    collect_notes_recursive(vault_path, &mut notes);

    let mut backlinks = Vec::new();
    let mut to_parse = Vec::new();
    let active_file_lower = active_file.map(|v| v.to_lowercase());
    let target_lower = note_title.trim().to_lowercase();

    for note in notes {
        if let Some(active) = &active_file_lower {
            if note.path.to_lowercase() == *active {
                continue;
            }
        }

        let path = Path::new(&note.path);
        let Some(mtime) = mtime_unix_ms(path) else {
            continue;
        };

        if let Some(entry) = cache.get(&note.path) {
            if entry.mtime_unix_ms == mtime {
                if entry.targets.iter().any(|target| target == &target_lower) {
                    backlinks.push(note.title);
                }
                continue;
            }
        }

        {
            to_parse.push((note.path.clone(), note.title.clone(), mtime));
        }
    }

    let parsed_results: Vec<(String, String, u128, Vec<String>)> = to_parse
        .par_iter()
        .filter_map(|(path, title, mtime)| {
            let content = fs::read_to_string(path).ok()?;
            let targets = extract_wikilink_targets(&content);
            Some((path.clone(), title.clone(), *mtime, targets))
        })
        .collect();

    for (path, title, mtime, targets) in parsed_results {
        if targets.iter().any(|target| target == &target_lower) {
            backlinks.push(title);
        }

        cache.insert(
            path,
            BacklinkScanCacheEntry {
                mtime_unix_ms: mtime,
                targets,
            },
        );
    }

    backlinks.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    backlinks.dedup_by(|a, b| a.eq_ignore_ascii_case(b));
    backlinks
}

pub fn index_all_notes(vault_path: &Path) -> Vec<NoteEntry> {
    let mut notes = Vec::new();
    collect_notes_recursive(vault_path, &mut notes);

    notes.sort_by(|a, b| {
        let title_cmp = a.title.to_lowercase().cmp(&b.title.to_lowercase());
        if title_cmp == std::cmp::Ordering::Equal {
            a.path.to_lowercase().cmp(&b.path.to_lowercase())
        } else {
            title_cmp
        }
    });

    notes
}

pub fn search_notes_content(vault_path: &Path, query: &str) -> Vec<NoteEntry> {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return Vec::new();
    }

    let notes = index_all_notes(vault_path);
    let mut hits: Vec<NoteEntry> = notes
        .into_par_iter()
        .filter_map(|note| {
            let content = fs::read_to_string(&note.path).ok()?;
            if content.to_lowercase().contains(&query) {
                Some(note)
            } else {
                None
            }
        })
        .collect();

    hits.sort_by(|a, b| {
        let title_cmp = a.title.to_lowercase().cmp(&b.title.to_lowercase());
        if title_cmp == std::cmp::Ordering::Equal {
            a.path.to_lowercase().cmp(&b.path.to_lowercase())
        } else {
            title_cmp
        }
    });

    hits
}

#[tauri::command]
pub fn search_notes(path: String, query: String) -> Vec<NoteEntry> {
    search_notes_content(Path::new(&path), &query)
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

        let backlink_cached_paths: Vec<String> = s
            .backlink_scan_cache
            .keys()
            .filter(|cached| cached.starts_with(&path))
            .cloned()
            .collect();

        for cached in backlink_cached_paths {
            s.backlink_scan_cache.remove(&cached);
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

        let backlink_cached_paths: Vec<String> = s
            .backlink_scan_cache
            .keys()
            .filter(|cached| cached.starts_with(&old_path))
            .cloned()
            .collect();

        for old_cached in backlink_cached_paths {
            if let Some(entry) = s.backlink_scan_cache.remove(&old_cached) {
                let replacement = old_cached.replacen(&old_path, &new_path, 1);
                s.backlink_scan_cache.insert(replacement, entry);
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

#[tauri::command]
pub fn list_all_notes(path: String) -> Vec<NoteEntry> {
    index_all_notes(Path::new(&path))
}

#[tauri::command]
pub fn parse_markdown_headings(content: String) -> Vec<HeadingEntry> {
    let mut headings = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim_start();
        if !trimmed.starts_with('#') {
            continue;
        }

        let level = trimmed.chars().take_while(|c| *c == '#').count();
        if level == 0 || level > 6 {
            continue;
        }

        let rest = trimmed[level..].trim_start();
        if rest.is_empty() {
            continue;
        }

        headings.push(HeadingEntry {
            level,
            text: rest.to_string(),
        });
    }

    headings
}

#[tauri::command]
pub fn find_backlinks(
    state: State<SharedState>,
    path: String,
    note_title: String,
    active_file: Option<String>,
) -> Vec<String> {
    let mut backlink_cache = {
        let mut runtime = state.lock().unwrap();
        std::mem::take(&mut runtime.backlink_scan_cache)
    };

    let backlinks = compute_backlinks_with_cache(
        Path::new(&path),
        &note_title,
        active_file.as_deref(),
        &mut backlink_cache,
    );

    {
        let mut runtime = state.lock().unwrap();
        runtime.backlink_scan_cache = backlink_cache;
    }

    backlinks
}
