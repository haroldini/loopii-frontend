<script>
    import { onMount } from "svelte";

    export let id;
    export let variant = "banner";     // "banner" | "popup"
    export let text = "";              // main title or headline
    export let description = null;     // secondary detail text
    export let autoHideMs = null;      // auto-dismiss timeout (usually for banners)
    export let onDismiss = null;       // called when dismissed
    export let onAction = null;        // called on main click
    export let component = null;       // optional content component (for rich popup)
    export let props = {};             // props for component

    let timer;
    let interval;
    let progress = 1;

    onMount(() => {
        if (autoHideMs) {
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
        clearTimeout(timer);
        clearInterval(interval);
        onDismiss?.(id);
    }

    function action() {
        onAction?.(id);
    }

    function handleKeyActivate(e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            action();
        }
    }
</script>

{#if variant === "banner"}
    <!-- Banner: title left, X+spinner right, description under -->
    <div class="popup popup--banner" role="group">
        <div class="popup-header">
            <!-- Clickable area is a real button now -->
            <button
                type="button"
                class="popup-titleblock bare"
                on:click={action}
                on:keydown={handleKeyActivate}
            >
                {#if text}
                    <p class="popup-title">{text}</p>
                {/if}
                {#if description}
                    <p class="popup-detail">{description}</p>
                {/if}
            </button>

            <button
                type="button"
                class="dismiss bare"
                on:click={(e) => {
                    e.stopPropagation();
                    dismiss();
                }}
                aria-label="Dismiss banner"
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
                <span class="dismiss-icon" aria-hidden="true">✕</span>
            </button>
        </div>
    </div>
{:else}
    <!-- Rich popup: text at top, optional component below -->
    <div
        class="popup popup--rich"
        role="button"
        tabindex="0"
        on:click={action}
        on:keydown={handleKeyActivate}
        aria-label="Open popup"
    >
        <div class="popup-header">
            <div class="popup-titleblock">
                {#if text}
                    <p class="popup-title">{text}</p>
                {/if}
                {#if description}
                    <p class="popup-detail">{description}</p>
                {/if}
            </div>

            <button
                type="button"
                class="dismiss bare"
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
                <span class="dismiss-icon" aria-hidden="true">✕</span>
            </button>
        </div>

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
    </div>
{/if}

<style>
    /* Shared popup container */
    .popup {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 0.75rem 0.9rem;
        max-width: 500px;
        width: 100%;
    }

    .popup--banner {
        cursor: default;
    }

    .popup--rich {
        cursor: pointer;
        transition: background 0.15s ease;
    }

    .popup--rich:hover {
        background: #f5f5f5;
    }

    .popup--rich:focus-visible {
        outline: 2px solid #000;
        outline-offset: 2px;
    }

    /* Header row: text left, X+spinner right */
    .popup-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
    }

    .popup-titleblock {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
        flex: 1 1 auto;
        text-align: left;
    }

    .popup-title {
        font-weight: 600;
        margin: 0;
        color: #222;
        overflow-wrap: anywhere;
    }

    .popup-detail {
        margin: 0;
        font-size: 0.9rem;
        color: #444;
        overflow-wrap: anywhere;
    }

    .popup-inner {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    /* Dismiss button */
    .dismiss {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        min-width: 32px;
        height: 32px;
        padding: 0 0.4rem;
        border-radius: 999px;
        flex-shrink: 0;
    }

    .dismiss:hover {
        background: #e5e5e5;
    }

    .dismiss-icon {
        font-size: 0.9rem;
        line-height: 1;
    }

    .dismiss svg.progress {
        width: 18px;
        height: 18px;
        display: inline-block;
    }

    .dismiss .circle {
        fill: none;
        stroke: rgba(0, 0, 0, 0.25);
        stroke-width: 2.5;
        stroke-linecap: round;
        transition: stroke-dasharray 0.1s linear;
    }
</style>
