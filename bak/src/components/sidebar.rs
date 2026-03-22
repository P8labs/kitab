use icons::{FilePlus, FolderPlus};
use leptos::prelude::*;

use crate::components::ui::{
    button::{Button, ButtonSize, ButtonVariant},
    separator::Separator,
    sheet::SheetContext,
    sidenav::*,
    theme_toggle::ThemeToggle,
};

#[component(transparent)]
pub fn SideBar() -> impl IntoView {
    let sheet_ctx = use_context::<SheetContext>();
    view! {
        <Sidenav>
            <SidenavHeader class="flex justify-between flex-row h-9">
                <h1 class="font-bold">kitab</h1>
                <ThemeToggle />
            </SidenavHeader>
            <Separator />
            <div class="flex justify-between items-center px-2 py-1">
                <h6>EXPLORE</h6>
                <div class="flex space-x-1 items-center">
                    <Button
                        class="p-0 size-6 rounded-2xl"
                        variant=ButtonVariant::Accent
                        size=ButtonSize::Icon
                    >
                        <FilePlus class="w-4" />
                    </Button>
                    <Button
                        class="p-0 size-6 rounded-2xl"
                        variant=ButtonVariant::Accent
                        size=ButtonSize::Icon
                    >
                        <FolderPlus />
                    </Button>
                </div>
            </div>
            <SidenavContent>
                <SidenavMenu>
                    {move || {
                        let sheet_target_id = sheet_ctx.as_ref().map(|ctx| ctx.target_id.clone());
                        const FILES: &[(&str, &str)] = &[
                            ("/accordion.md", "File One"),
                            ("/alert.md", "File Two"),
                            ("/dialog.md", "File Three"),
                        ];
                        FILES
                            .iter()
                            .map(|(href, title)| {
                                if let Some(ref target_id) = sheet_target_id {

                                    view! {
                                        <div
                                            class="bg-accent px-2 py-1"
                                            data-sheet-close=target_id.clone()
                                        >
                                            <div>{*title}</div>
                                        </div>
                                    }
                                        .into_any()
                                } else {
                                    view! {
                                        <div class="hover:bg-accent bg-secondary/50 px-2 py-1 mx-2 h-7 text-sm rounded">
                                            {*title}
                                        </div>
                                    }
                                        .into_any()
                                }
                            })
                            .collect_view()
                    }}
                </SidenavMenu>
            </SidenavContent>
        </Sidenav>
    }
}
