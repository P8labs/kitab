use crate::app::{invoke, use_app_state};
use leptos::children::ChildrenFn;
use leptos::prelude::*;
use leptos::{component, view, IntoView};
use leptos_router::hooks::{use_location, use_navigate};
use leptos_ui::clx::Effect;
use shared::AppConfig;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;

#[component]
pub fn Gatekeeper(children: ChildrenFn) -> impl IntoView {
    let app_state = use_app_state();
    let navigate = use_navigate();
    let location = use_location();

    let loading = RwSignal::new(true);


    spawn_local(async move {
        let result = invoke("get_config", JsValue::NULL).await;

        let config: AppConfig =
            serde_wasm_bindgen::from_value(result).unwrap_or_default();

        if let Some(path) = config.last_opened.clone() {
            app_state.update(|s| s.vault_path = Some(path));
        }

        loading.set(false);
    });

    Effect::new(move |_| {
        let has_vault = app_state.get().vault_path.is_some();
        let path = location.pathname.get();

        if !has_vault && path != "/onboard" {
            navigate("/onboard", Default::default());
        }

        if has_vault && path == "/onboard" {
            navigate("/", Default::default());
        }
    });

    view! {
        <Show
            when=move || !loading.get()
            fallback=|| view! { <div class="h-screen w-screen bg-black" /> }
        >
            {children()}
        </Show>
    }
}
