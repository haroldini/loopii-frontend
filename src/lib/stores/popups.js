
import { writable, derived } from "svelte/store";
import { ENVIRONMENT } from "$lib/utils/env.js";


const isDev = ENVIRONMENT === "dev";


// Local toasts
const toasts = writable([]);
let nextId = 0;

export function addToast({
    variant = "banner",
    text = "",
    description = null,
    autoHideMs = 5000,
    component = null,
    props = {},
    data = {},
    onAction = null,
    onDismiss = null,
    actions = null,
} = {}) {
    const id = `toast-${++nextId}`;
    const toast = {
        id,
        variant,
        text,
        description,
        autoHideMs,
        component,
        props,
        data,
        onAction,
        onDismiss,
        actions,
    };
    toasts.update((list) => [toast, ...list]);
}

export function dismissToast(id) {
    toasts.update((list) => list.filter((t) => t.id !== id));
}


// Unified popup stream
export const allPopups = derived(toasts, ($t) =>
    $t.map((t) => ({
        ...t,

        onDismiss: (id) => {
            try {
                if (typeof t.onDismiss === "function") t.onDismiss(id);
            } catch (err) {
                if (isDev) console.error("Toast onDismiss handler threw:", err);
            }
            dismissToast(id);
        },

        onAction: t.onAction
            ? (id) => {
                  try {
                      t.onAction(id);
                  } catch (err) {
                      if (isDev) console.error("Toast onAction handler threw:", err);
                  }
                  dismissToast(id);
              }
            : null,

        actions: Array.isArray(t.actions)
            ? t.actions.map((a) => ({
                  ...a,
                  onClick: (id) => {
                      try {
                          if (typeof a.onClick === "function") a.onClick(id);
                      } catch (err) {
                          if (isDev) console.error("Toast action handler threw:", err);
                      }
                      dismissToast(id);
                  },
              }))
            : null,
    }))
);
