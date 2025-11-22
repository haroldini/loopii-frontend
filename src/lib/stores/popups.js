
import { writable, derived } from "svelte/store";


// Local toasts
const toasts = writable([]);
let nextId = 0;

export function addToast({
    variant = "banner",
    text = "",
    autoHideMs = 5000,
    component = null,
    props = {},
    data = {},
    onAction = null,
    onDismiss = null,
} = {}) {
    const id = `toast-${++nextId}`;
    const toast = { id, variant, text, autoHideMs, component, props, data, onAction, onDismiss };
    toasts.update((list) => [toast, ...list]);
}

export function dismissToast(id) {
    toasts.update((list) => list.filter((t) => t.id !== id));
}


// Unified popup stream
export const allPopups = derived(toasts, ($t) =>
    $t.map((t) => ({
        ...t,
        // Close the toast and call onDismiss if provided
        onDismiss: () => {
            try {
                if (typeof t.onDismiss === "function") t.onDismiss();
            } catch (err) {
                console.error("Toast onDismiss handler threw:", err);
            }
            dismissToast(t.id);
        },
        // Close the toast and call onAction if provided
        onAction: t.onAction
            ? () => {
                  try {
                      t.onAction(t.id);
                  } catch (err) {
                      console.error("Toast onAction handler threw:", err);
                  }
                  dismissToast(t.id); 
              }
            : null,
    }))
);
