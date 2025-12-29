
<script>
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { browser } from "$app/environment";
    
    export let open = false;
    export let hash = null;

    export let openClass = "overlay";
    export let closedClass = "";
    export let renderOpenOnly = false;

    export let role = "dialog";
    export let ariaLabel = "";
    export let ariaModal = true;

    const dispatch = createEventDispatcher();

    // ===== Overlay Management =====

    export function lockScroll() {
        document.documentElement.classList.add("overlay-open");
        document.body.classList.add("overlay-open");
    }

    export function unlockScroll() {
        document.documentElement.classList.remove("overlay-open");
        document.body.classList.remove("overlay-open");
    }

    export function openOverlay() {
        if (typeof window === "undefined") return;

        lockScroll();

        if (hash && window.location.hash !== hash) {
            window.location.hash = hash;
        }
    }

    export function closeOverlay() {
        if (typeof window === "undefined") return;

        if (hash && window.location.hash === hash) {
            history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
            );
        }

        unlockScroll();
    }

    function onHashChange() {
        if (!hash) return;

        if (open && window.location.hash !== hash) {
            unlockScroll();
            dispatch("requestClose");
        }
    }

    function onKeydown(e) {
        if (!open) return;
        if (e.key === "Escape") {
            e.preventDefault();
            closeOverlay();
            dispatch("requestClose");
        }
    }

    onMount(() => {
        if (typeof window === "undefined") return;
        window.addEventListener("hashchange", onHashChange);
        window.addEventListener("keydown", onKeydown);
    });

    onDestroy(() => {
        if (typeof window !== "undefined") {
            window.removeEventListener("hashchange", onHashChange);
            window.removeEventListener("keydown", onKeydown);
        }
        unlockScroll();
    });
</script>


{#if !renderOpenOnly || open}
    <div
        class={open ? openClass : closedClass}
        role={open ? role : undefined}
        aria-modal={open ? String(ariaModal) : undefined}
        aria-label={open ? ariaLabel : undefined}
    >
        <slot />
    </div>
{/if}
