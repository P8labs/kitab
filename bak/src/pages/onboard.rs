use crate::{app::{invoke, use_app_state}, components::ui::{
        button::{Button, ButtonVariant},
        input::Input,
    }};
use leptos::prelude::*;
use leptos::{component, view, IntoView};
use leptos_ui::clx::RwSignal;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use leptos_router::hooks::use_navigate;

#[component]
pub fn Onboard() -> impl IntoView {
    let vault_name = RwSignal::new(String::new());
    let vault_path = RwSignal::new(String::new());
    let app_state = use_app_state();
    let navigate = use_navigate();


    let pick_folder = move |_| {
        spawn_local(async move {
            let res = invoke("pick_folder", JsValue::NULL).await;

            if let Some(path) = res.as_string() {
                vault_path.set(path);
            }
        });
    };


     let create_vault = move |_| {
        let name = vault_name.get();
        let path = vault_path.get();

        if name.is_empty() || path.is_empty() {
            return;
        }
        let navigate = navigate.clone();
        spawn_local(async move {
            // call backend
            let args = serde_wasm_bindgen::to_value(&serde_json::json!({
                "name": name,
                "path": path
            }))
            .unwrap();

            invoke("add_vault", args).await;

            // update local state immediately (IMPORTANT)
            app_state.update(|s| {
                s.vault_path = Some(path.clone());
            });

            navigate("/", Default::default());
        });
    };

    view! {
        <main class="flex h-screen w-screen">

            <div class="flex flex-col w-1/3 px-8 gap-4 border-r">

                <h2 class="text-xl font-medium">"Recent Vaults"</h2>

                <div class="flex flex-col gap-2">

                    // Example vaultiss
                    <button class="flex flex-col items-start p-4 rounded bg-accent/70 hover:bg-accent">
                        <span class="font-medium">"My Notes"</span>
                        <span class="text-sm text-muted-foreground">"/Users/.../notes"</span>
                    </button>

                    <button class="flex flex-col items-start p-4 rounded bg-accent/70 hover:bg-accent">
                        <span class="font-medium">"Work"</span>
                        <span class="text-sm text-muted-foreground">"/Users/.../work"</span>
                    </button>

                </div>
            </div>

            <div class="flex flex-col justify-center w-full px-16 gap-6">

                <h1 class="text-3xl font-semibold">"Create Vault"</h1>

                <div class="flex flex-col gap-2">
                    <label class="text-sm text-muted-foreground">"Vault Name"</label>
                    <Input placeholder="My Notes" bind_value=vault_name />
                </div>

                <div class="flex flex-col gap-2">
                    <label class="text-sm text-zinc-400">"Location"</label>

                    <div class="flex gap-2">
                        <Input bind_value=vault_path readonly=true />

                        <Button variant=ButtonVariant::Outline on:click=pick_folder>
                            "Browse"
                        </Button>
                    </div>
                </div>

                <Button on:click=create_vault>"Create Vault"</Button>
            </div>

        </main>
    }
}
