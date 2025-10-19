
<script>
    import { onMount } from "svelte";

    export let id;
    export let type = "info";          // "loop" | "message" | "system" | "error" | etc.
    export let variant = "banner";     // "banner" | "popup"
    export let text = "";              // main title or headline
    export let description = null;     // secondary detail text
    export let autoHideMs = null;      // banner auto-dismiss timeout
    export let onDismiss = null;       // called when dismissed
    export let onAction = null;        // called on main click
    export let component = null;       // optional content component
    export let props = {};             // props for component

    let timer, interval;
    let progress = 1;

    onMount(() => {
        if (autoHideMs && variant === "banner") {
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
        onDismiss?.(id);
    }

    function action() {
        onAction?.(id);
    }
</script>


{#if variant === "banner"}
    <!-- Simple inline banner -->
    <div class="banner {type}" role="group">
        <button type="button" class="banner-text" on:click={action}>
            {#if text}<span class="banner-title">{text}</span>{/if}
            {#if description}<span class="banner-detail">{description}</span>{/if}
        </button>

        <button type="button" class="dismiss" on:click={dismiss} aria-label="Dismiss">
            {#if autoHideMs}
                <svg viewBox="0 0 36 36" class="progress">
                    <path
                        class="circle"
                        d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        stroke-dasharray="{progress * 100}, 100"
                    />
                </svg>
            {/if}
            ✕
        </button>
    </div>

{:else}
    <!-- Rich popup -->
    <div
        role="button"
        tabindex="0"
        class="popup"
        on:click={action}
        on:keydown={(e) => e.key === "Enter" && action()}
        aria-label="Open popup"
    >
        <div class="popup-header">
            {#if text}
                <p class="popup-title">{text}</p>
            {/if}

            <button
                type="button"
                class="dismiss"
                on:click={(e) => {
                    e.stopPropagation();
                    dismiss();
                }}
                aria-label="Dismiss popup"
            >
                {#if autoHideMs}
                    <svg viewBox="0 0 36 36" class="progress">
                        <path
                            class="circle"
                            d="M18 2.0845
                                a 15.9155 15.9155 0 0 1 0 31.831
                                a 15.9155 15.9155 0 0 1 0 -31.831"
                            stroke-dasharray="{progress * 100}, 100"
                        />
                    </svg>
                {/if}
                ✕
            </button>
        </div>

        <div class="popup-body">
            {#if component}
                <div class="popup-inner">
                    <svelte:component
                        this={component}
                        {...props}
                        on:expand={() => onAction?.(id)}
                        on:click={() => onAction?.(id)}
                    />
                </div>
            {/if}

            {#if description || text}
                <div class="popup-textblock">
                    {#if description}<p class="popup-detail">{description}</p>{/if}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    /* --- Shared --- */
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
        border-radius: 50%;
        transition: background 0.15s ease, transform 0.15s ease;
        flex-shrink: 0;
        z-index: 2;
    }

    .dismiss:hover {
        background: rgba(0, 0, 0, 0.07);
        transform: scale(1.05);
    }

    .dismiss svg.progress {
        position: absolute;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
    }

    .dismiss .circle {
        fill: none;
        stroke: rgba(0, 0, 0, 0.2);
        stroke-width: 2.5;
        stroke-linecap: round;
        transition: stroke-dasharray 0.1s linear;
    }

    /* --- Popup --- */
    .popup {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: white;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 0.75rem 0.75rem 0.9rem;
        width: fit-content;
        max-width: 480px;
        cursor: pointer;
        transition: background 0.15s ease;
        position: relative;
    }

    /* Main hover effect: light background + highlight */
    .popup:hover {
        background: #f7f9ff;
    }

    /* Focus accessibility */
    .popup:focus-visible {
        outline: 2px solid #0070f3;
        outline-offset: 2px;
    }

    .popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        text-align: center;
        gap: 0.5rem;
    }

    .popup-title {
        font-weight: 600;
        margin: 0;
    }

    .popup-body {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .popup-textblock {
        margin-top: 0.25rem;
    }

    .popup-detail {
        color: #555;
        font-size: 0.9em;
        margin-top: 0.2rem;
    }
</style>
