
use std::collections::HashMap;

use leptos::prelude::*;
use leptos_darkmode::Darkmode;
use leptos_meta::{provide_meta_context, Html};
use leptos_router::{components::{Route, Router, Routes}, path};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use crate::{components::actionbar::TopActionBar, pages::{gate_keeper::Gatekeeper, home::Home, onboard::Onboard}};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = ["window", "__TAURI__", "core"])]
    pub async fn invoke(cmd: &str, args: JsValue) -> JsValue;
}

// I should move it to a separate file but still keeping it for now.
#[derive(Clone)]
pub struct AppState {
    pub vault_path: Option<String>,
    pub file_tree: Vec<FileNode>,
    pub active_file: Option<String>,
    pub cache: HashMap<String, String>,
}

#[derive(Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}



pub fn use_app_state() -> RwSignal<AppState> {
    use_context::<RwSignal<AppState>>().unwrap()
}

#[component]
pub fn App() -> impl IntoView {
    provide_meta_context();
    let darkmode = Darkmode::init();
    let app_state = RwSignal::new(AppState {
        vault_path: None,
        file_tree: vec![],
        active_file: None,
        cache: HashMap::new(),
    });

    provide_context(app_state);

    view! {
        <Html {..} lang="en" class=move || if darkmode.is_dark() { "dark" } else { "" } />
        <Router>
            <Gatekeeper>
                <div class="h-9">
                    <TopActionBar />
                </div>
                <Routes fallback=|| view! { <></> }>
                    <Route path=path!("/") view=Home />
                    <Route path=path!("/onboard") view=Onboard />
                </Routes>
            </Gatekeeper>
        </Router>
    }
}
