<script>
    import { onMount } from "svelte";

    // Props (works for both notifications and toasts)
    export let id;
    export let type = "info";        // "loop" | "message" | "system" | "error" | "success" | etc.
    export let variant = null;       // "banner" | "popup" | null (store sets it; fallback stays safe)
    export let text = null;          // message override
    export let autoHideMs = null;    // ms to auto-hide (usually for banners)
    export let onDismiss = null;     // required: parent wires to dismissToast or markAsRead
    export let onAction = null;      // optional click/action for the popup itself
    export let component = null;     // optional Svelte component
    export let props = {};           // props for component
    export let data = {};            // raw payload

    const inferredVariant = variant ?? "banner";

    const inferredText =
        text ??
        data?.message ??
        (type === "loop" ? "You have a new loop!" : "You have a new notification");

    let timer;
    let interval;
    let progress = 1; // 1..0 radial countdown

    onMount(() => {
        // Auto-hide is owned by the component (no store timers)
        if (autoHideMs && inferredVariant === "banner") {
            const start = Date.now();
            timer = setTimeout(() => dismiss(), autoHideMs);
            interval = setInterval(() => {
                const elapsed = Date.now() - start;
                progress = Math.max(0, 1 - elapsed / autoHideMs);
            }, 100);
        }
        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    });

    function dismiss() {
        if (onDismiss) onDismiss(id);
    }

    function action() {
        if (onAction) onAction(id);
    }
</script>

<!-- Banner -->
{#if inferredVariant === "banner"}
    <div class="banner {type}" role="group">
        <button
            type="button"
            class="banner-text"
            on:click={action}
        >
            {inferredText}
        </button>
        <button class="dismiss" on:click={dismiss} aria-label="Dismiss banner">
            <svg viewBox="0 0 36 36" class="progress">
                <path
                    class="circle"
                    d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    stroke-dasharray="{progress * 100}, 100"
                />
            </svg>
            ✕
        </button>
    </div>

<!-- Popup -->
{:else}
    <div class="popup" role="group">
        <div class="popup-header">
            <button
                type="button"
                class="popup-title"
                on:click={action}
            >
                {inferredText}
            </button>
            <button class="dismiss" on:click={dismiss} aria-label="Dismiss popup">
                <svg viewBox="0 0 36 36" class="progress">
                    <path
                        class="circle"
                        d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        stroke-dasharray="{progress * 100}, 100"
                    />
                </svg>
                ✕
            </button>
        </div>

        <div class="popup-body">
            {#if component}
                <svelte:component
                    this={component}
                    {...props}
                    on:expand={() => onAction?.(id)}
                    on:click={() => onAction?.(id)}
                />
            {:else}
                <button type="button" class="popup-text" on:click={action}>
                    {inferredText}
                </button>
            {/if}
        </div>
    </div>
{/if}

<style>
    .dismiss {
        position: relative;
        width: 32px;
        height: 32px;
        border: none;
        background: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .dismiss svg.progress {
        position: absolute;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
    }
    .dismiss .circle {
        fill: none;
        stroke: rgba(0,0,0,0.2);
        stroke-width: 2.5;
        stroke-linecap: round;
        transition: stroke-dasharray 0.1s linear;
    }

    .banner {
        width: 300px;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-weight: 500;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .banner-text {
        all: unset;
        flex: 1;
        margin-right: 0.75rem;
        cursor: pointer;
        color: inherit;
        font: inherit;
    }
    .banner.success { background: #eef9f0; color: #0b5e2b; }
    .banner.error   { background: #fdecea; color: #811d1d; }
    .banner.info    { background: #eef3ff; color: #1c3c86; }

    .popup {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        background: white;
        border: 1px solid #ddd;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        padding: 0.75rem 0.75rem 0.9rem;
        animation: slideDown 0.3s ease;
        width: fit-content;
        max-width: 480px;
    }

    .popup-header {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 0.75rem;
    }

    .popup-title {
        all: unset;
        cursor: pointer;
        font-weight: 600;
        line-height: 1.2;
    }

    .popup-body {
        display: block;
    }

    .popup-text {
        all: unset;
        cursor: pointer;
        color: inherit;
        font: inherit;
    }
</style>
