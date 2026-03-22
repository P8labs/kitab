use leptos::html;
use leptos::prelude::*;
use tw_merge::tw_merge;

#[component]
pub fn Textarea(
    // Styling
    #[prop(into, optional)] class: String,

    // Common HTML attributes
    #[prop(into, optional)] placeholder: Option<String>,
    #[prop(into, optional)] name: Option<String>,
    #[prop(into, optional)] id: Option<String>,
    #[prop(optional)] disabled: bool,
    #[prop(optional)] readonly: bool,
    #[prop(optional)] required: bool,
    #[prop(optional)] autofocus: bool,
    #[prop(into, optional)] rows: Option<u32>,

    // Two-way binding (like bind:value)
    #[prop(into, optional)] bind_value: Option<RwSignal<String>>,

    // Ref for direct DOM access
    #[prop(optional)] node_ref: NodeRef<html::Textarea>,
) -> impl IntoView {
    let merged_class = tw_merge!(
        "placeholder:text-muted-foreground dark:bg-input/30 flex field-sizing-content min-h-16 w-full bg-transparent px-8 py-6 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        class
    );

    match bind_value {
        Some(signal) => view! {
            <textarea
                data-name="Textarea"
                class=merged_class
                placeholder=placeholder
                name=name
                id=id
                disabled=disabled
                readonly=readonly
                required=required
                autofocus=autofocus
                rows=rows
                prop:value=signal.get()
                on:input=move |ev| {
                    signal.set(event_target_value(&ev));
                }
                node_ref=node_ref
            />
        }
        .into_any(),
        None => view! {
            <textarea
                data-name="Textarea"
                class=merged_class
                placeholder=placeholder
                name=name
                id=id
                disabled=disabled
                readonly=readonly
                required=required
                autofocus=autofocus
                rows=rows
                node_ref=node_ref
            />
        }
        .into_any(),
    }
}
