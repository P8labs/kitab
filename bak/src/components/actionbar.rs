use crate::{
    components::ui::button::{ButtonSize, ButtonVariant},
    invoke,
};
use icons::{ListCollapse, Maximize, Minus, X};
use leptos::prelude::*;
use leptos::task::spawn_local;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::to_value;

use crate::components::ui::{button::Button, menubar::Menubar, sidenav::SidenavTrigger};

#[derive(Serialize, Deserialize)]
struct ActionArgs<'a> {
    action: &'a str,
}

#[component]
pub fn TopActionBar() -> impl IntoView {
    fn handle_action(a: String) {
        spawn_local(async move {
            let args = to_value(&ActionArgs { action: a.as_str() }).unwrap();
            let new_msg = invoke("handle_window_action", args).await;
            println!("{:?}", new_msg);
        });
    }

    view! {
        <Menubar attr:data-tauri-drag-region class="w-full flex justify-between">
            <div>// TODO: fix this
            // <SidenavTrigger>
            // <ListCollapse />
            // </SidenavTrigger>
            </div>

            <div>
                <Button
                    on:click=move |_| handle_action("min".to_string())
                    variant=ButtonVariant::Accent
                    size=ButtonSize::Icon
                >
                    <Minus />
                </Button>
                <Button
                    on:click=move |_| handle_action("max".to_string())
                    variant=ButtonVariant::Accent
                    size=ButtonSize::Icon
                >
                    <Maximize />
                </Button>
                <Button
                    on:click=move |_| handle_action("close".to_string())
                    variant=ButtonVariant::Accent
                    size=ButtonSize::Icon
                >
                    <X />
                </Button>
            </div>

        </Menubar>
    }
}
