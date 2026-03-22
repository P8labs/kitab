use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Vault {
    pub name: String,
    pub path: String,
}

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct AppConfig {
    pub recent_vaults: Vec<Vault>,
    pub last_opened: Option<String>,
}
