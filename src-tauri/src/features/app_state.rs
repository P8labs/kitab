use std::collections::HashMap;
use std::sync::Mutex;

pub struct RuntimeState {
    pub active_vault: Option<String>,
    pub file_cache: HashMap<String, String>,
}

impl Default for RuntimeState {
    fn default() -> Self {
        Self {
            active_vault: None,
            file_cache: HashMap::new(),
        }
    }
}

pub type SharedState = Mutex<RuntimeState>;
