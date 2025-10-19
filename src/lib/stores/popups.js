
import { writable, derived } from "svelte/store";


// Local toasts (frontend-only)
const toasts = writable([]);
let nextId = 0;

export function addToast({
    type = "info",
    variant = "banner",
    text = "",
    autoHideMs = 5000,
    component = null,
    props = {},
    data = {},
    onAction = null
} = {}) {
    const id = `toast-${++nextId}`;
    const toast = { id, type, variant, text, autoHideMs, component, props, data, onAction };
    toasts.update((list) => [toast, ...list]);
}

export function dismissToast(id) {
    toasts.update((list) => list.filter((t) => t.id !== id));
}


// Unified popup stream (starts with toasts only)
const basePopups = derived(toasts, ($t) =>
    $t.map((t) => ({
        ...t,
        onDismiss: () => dismissToast(t.id),
        onAction: t.onAction ?? null,
    }))
);

// Exported store that the UI listens to
export const allPopups = writable([]);
basePopups.subscribe((v) => allPopups.set(v));


// Notifications integration on app data load
let notificationsSub;

export function initPopupsWithNotifications({ notifications }) {
    if (!notifications) return;

    if (notificationsSub) notificationsSub();

    const combined = derived([notifications, toasts], ([$n, $t]) => {
        const toastPopups = $t.map((t) => ({
            ...t,
            onDismiss: () => dismissToast(t.id),
            onAction: t.onAction ?? null,
        }));

        const notificationPopups = $n
            .filter((n) => n.showPopup)
            .map((n) => {
                const hasValidProps =
                    !n.component ||
                    (n.props && Object.keys(n.props).length > 0);

                return {
                    ...n,
                    component: hasValidProps ? n.component : null,
                    props: hasValidProps ? n.props : {},
                    onDismiss: n.onDismiss,
                    onAction: n.onAction,
                };
            });

        return [...toastPopups, ...notificationPopups];
    });

    notificationsSub = combined.subscribe((v) => allPopups.set(v));
}