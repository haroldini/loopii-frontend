
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

    let suppressNextHash = false;

    export function lockScroll() {
        document.documentElement.classList.add("overlay-open");
        document.body.classList.add("overlay-open");
    }

    export function unlockScroll() {
        document.documentElement.classList.remove("overlay-open");
        document.body.classList.remove("overlay-open");
    }

    export function openOverlayHash() {
        if (!hash) return;
        if (window.location.hash === hash) return;
        suppressNextHash = true;
        window.location.hash = hash;
    }

    export function closeOverlayHash() {
        if (!hash) return;
        if (window.location.hash !== hash) return;
        suppressNextHash = true;
        history.back();
    }

    export function openOverlay() {
        lockScroll();
        openOverlayHash();
    }

    export function closeOverlay(options = {}) {
        const { fromHash = false } = options;

        if (!fromHash) {
            closeOverlayHash();
        }

        unlockScroll();
    }

    function onHashChange() {
        if (!hash) return;

        if (suppressNextHash) {
            suppressNextHash = false;
            return;
        }

        if (open && window.location.hash !== hash) {
            unlockScroll();
            dispatch("requestClose");
        }
    }

    onMount(() => {
        if (typeof window === "undefined") return;
        window.addEventListener("hashchange", onHashChange);
    });

    onDestroy(() => {
        if (typeof window !== "undefined") {
            window.removeEventListener("hashchange", onHashChange);
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
