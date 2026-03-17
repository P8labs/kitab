use crate::components::{
    actionbar::TopActionBar,
    sidebar::SideBar,
    ui::{sidenav::SidenavWrapper, textarea::Textarea},
};
use leptos::prelude::*;
use leptos_darkmode::Darkmode;
use leptos_meta::{provide_meta_context, Html};
use leptos_router::components::Router;
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = ["window", "__TAURI__", "core"])]
    pub async fn invoke(cmd: &str, args: JsValue) -> JsValue;
}

#[component]
pub fn App() -> impl IntoView {
    provide_meta_context();
    let darkmode = Darkmode::init();
    let content = RwSignal::new(String::new());

    view! {
        <Html {..} lang="en" class=move || if darkmode.is_dark() { "dark" } else { "" }/>
        <Router>
            <main class="flex flex-col h-screen w-screen">
                <div class="flex-1">
                    <SidenavWrapper attr:style="--sidenav-width:16rem;" class="flex justify-between">
                        <SideBar />
                        <div class="h-full w-full">
                            <div class="h-9"><TopActionBar/></div>
                            <Textarea class="h-full w-full resize-none" bind_value=content attr:placeholder="Type your message here."></Textarea>
                        </div>
                    </SidenavWrapper>
                </div>

            </main>
        </Router>
    }
}
