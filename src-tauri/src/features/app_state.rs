use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Clone, Default)]
pub struct BacklinkScanCacheEntry {
    pub mtime_unix_ms: u128,
    pub targets: Vec<String>,
}

pub struct RuntimeState {
    pub active_vault: Option<String>,
    pub file_cache: HashMap<String, String>,
    pub backlink_scan_cache: HashMap<String, BacklinkScanCacheEntry>,
}

impl Default for RuntimeState {
    fn default() -> Self {
        Self {
            active_vault: None,
            file_cache: HashMap::new(),
            backlink_scan_cache: HashMap::new(),
        }
    }
}

pub type SharedState = Mutex<RuntimeState>;
