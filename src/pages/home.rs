use crate::components::{
    actionbar::TopActionBar,
    sidebar::SideBar,
    ui::{sidenav::SidenavWrapper, textarea::Textarea},
};
use leptos::prelude::*;
use leptos::{component, view, IntoView};
use leptos_ui::clx::RwSignal;

#[component]
pub fn Home() -> impl IntoView {
    let content = RwSignal::new(String::new());

    view! {
        <main class="flex flex-col h-screen w-screen">
            <div class="flex-1">
                <SidenavWrapper attr:style="--sidenav-width:16rem;" class="flex justify-between">
                    <SideBar />
                    <div class="h-full w-full">
                        <div class="h-9">
                            <TopActionBar />
                        </div>
                        <Textarea
                            class="h-full w-full resize-none"
                            bind_value=content
                            attr:placeholder="Type your message here."
                        ></Textarea>
                    </div>
                </SidenavWrapper>
            </div>
        </main>
    }
}
