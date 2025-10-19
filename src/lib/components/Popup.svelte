
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
                <span class="popup-title">{text}</span>
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
            {/if}

            {#if description || text}
                <div class="popup-textblock">
                    {#if text && component}<p class="popup-text">{text}</p>{/if}
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
        transition: background 0.15s ease;
    }
    .dismiss:hover { background: rgba(0, 0, 0, 0.05); }

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

    /* --- Banner --- */
    .banner {
        width: 300px;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .banner-text {
        all: unset;
        flex: 1;
        text-align: left;
        cursor: pointer;
    }

    .banner-title { font-weight: 600; display: block; }
    .banner-detail {
        display: block;
        font-size: 0.85em;
        color: #555;
        margin-top: 0.25rem;
    }

    /* --- Popup --- */
    .popup {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: white;
        border: 1px solid #ddd;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        padding: 0.75rem 0.75rem 0.9rem;
        width: fit-content;
        max-width: 480px;
        cursor: pointer;
        transition: background 0.15s ease, box-shadow 0.15s ease;
    }

    .popup:hover:not(:has(.dismiss:hover)) {
        background: #f7f9ff;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .popup:focus-visible {
        outline: 2px solid #0070f3;
        outline-offset: 2px;
    }

    .popup-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .popup-title { font-weight: 600; margin: 0; }

    .popup-body {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .popup-textblock {
        margin-top: 0.25rem;
    }

    .popup-text {
        margin: 0;
        font-weight: 500;
    }

    .popup-detail {
        color: #555;
        font-size: 0.9em;
        margin-top: 0.2rem;
    }
</style>
