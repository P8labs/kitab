import type { ShortcutAction } from "@/state/app";

export const shortcutLabels: Record<ShortcutAction, string> = {
  closeTab: "Close tab",
  newFile: "New file",
  newFolder: "New folder",
};

export const defaultShortcuts: Record<ShortcutAction, string> = {
  closeTab: "Ctrl+W",
  newFile: "Ctrl+N",
  newFolder: "Ctrl+Shift+N",
};

const modifierOrder = ["Ctrl", "Meta", "Alt", "Shift"] as const;
const modifierSet = new Set(["Ctrl", "Meta", "Alt", "Shift"]);

const normalizeKeyName = (part: string) => {
  const value = part.trim();
  if (!value) return "";

  const lowered = value.toLowerCase();
  if (lowered === "control" || lowered === "ctrl") return "Ctrl";
  if (lowered === "cmd" || lowered === "command" || lowered === "meta") {
    return "Meta";
  }
  if (lowered === "option" || lowered === "alt") return "Alt";
  if (lowered === "shift") return "Shift";
  if (lowered === "esc") return "Escape";
  if (lowered === "space") return "Space";
  if (lowered === "plus") return "+";

  return value.length === 1
    ? value.toUpperCase()
    : value[0].toUpperCase() + value.slice(1);
};

export const normalizeShortcut = (combo: string) => {
  const parts = combo
    .split("+")
    .map((part) => normalizeKeyName(part))
    .filter(Boolean);

  if (!parts.length) return "";

  const modifiers = new Set<string>();
  let key = "";

  parts.forEach((part) => {
    if (modifierSet.has(part as (typeof modifierOrder)[number])) {
      modifiers.add(part);
    } else {
      key = part;
    }
  });

  const orderedModifiers = modifierOrder.filter((part) => modifiers.has(part));
  return key
    ? [...orderedModifiers, key].join("+")
    : orderedModifiers.join("+");
};

const mapKeyboardKey = (key: string) => {
  const lowered = key.toLowerCase();
  if (lowered === " ") return "Space";
  if (lowered === "escape") return "Escape";
  if (lowered === "arrowup") return "ArrowUp";
  if (lowered === "arrowdown") return "ArrowDown";
  if (lowered === "arrowleft") return "ArrowLeft";
  if (lowered === "arrowright") return "ArrowRight";
  if (lowered === "delete") return "Delete";
  if (lowered === "backspace") return "Backspace";
  if (lowered === "tab") return "Tab";
  if (lowered === "enter") return "Enter";

  return key.length === 1 ? key.toUpperCase() : key;
};

export const eventToShortcut = (event: KeyboardEvent) => {
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.metaKey) modifiers.push("Meta");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");

  const key = mapKeyboardKey(event.key);
  if (["Control", "Meta", "Alt", "Shift"].includes(key)) {
    return modifiers.join("+");
  }

  return normalizeShortcut([...modifiers, key].join("+"));
};

export const isModifierOnlyShortcut = (shortcut: string) => {
  if (!shortcut) return true;
  return shortcut
    .split("+")
    .every((part) => modifierSet.has(part as (typeof modifierOrder)[number]));
};

export const isEditableElement = (target: EventTarget | null) => {
  const node = target as HTMLElement | null;
  if (!node) return false;
  return Boolean(node.closest("input, textarea, [contenteditable='true']"));
};
