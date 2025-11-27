
<script>
    import { onMount } from "svelte";

    export let id;
    export let variant = "banner";     // "banner" | "popup" | "modal"
    export let text = "";              // main title or headline
    export let description = null;     // secondary detail text
    export let autoHideMs = null;      // auto-dismiss timeout (usually for banners)
    export let onDismiss = null;       // called when dismissed
    export let onAction = null;        // called on main click (banner/popup)
    export let component = null;       // optional content component (for rich popup / modal)
    export let props = {};             // props for component
    export let actions = [];           // for modals: [{ label, variant?, onClick? }, ...]

    let timer;
    let interval;
    let progress = 1;

    onMount(() => {
        if (autoHideMs && variant !== "modal") {
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

    function handleModalKeyActivate(e) {
        if (e.key === "Escape") {
            e.stopPropagation();
            dismiss();
        }
    }

    function handleActionClick(act) {
        act?.onClick?.(id);
    }
</script>

{#if variant === "banner"}
    <!-- Banner: title left, X+spinner right, description under -->
    <div class="popup popup--banner" role="group">
        <div class="popup-header">
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

{:else if variant === "popup"}
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

{:else}
    <!-- Modal -->
    <div
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={text || "Dialog"}
        tabindex="-1"
        on:click={(e) => {
            if (e.target === e.currentTarget) {
                dismiss();
            }
        }}
        on:keydown={handleModalKeyActivate}
    >
        <div class="popup popup--modal" role="document">
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
                    aria-label="Dismiss dialog"
                >
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

            {#if actions && actions.length}
                <div class="popup-actions">
                    {#each actions as act}
                        <button
                            type="button"
                            class={
                                act.variant === "primary"
                                    ? "primary"
                                    : act.variant === "danger"
                                    ? "danger"
                                    : ""
                            }
                            on:click={(e) => {
                                e.stopPropagation();
                                handleActionClick(act);
                            }}
                        >
                            {act.label}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    /* Shared popup container */
    .popup {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        background: var(--bg-2);
        border: 1px solid var(--border-1);
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
        transition: background 0.15s ease, border-color 0.15s ease;
    }

    .popup--rich:hover {
        background: var(--bg-hover);
        border-color: var(--border-2);
    }

    .popup--rich:focus-visible {
        outline: 2px solid var(--accent-blue);
        outline-offset: 2px;
    }

    /* Modal */
    .modal-backdrop {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.35);
        z-index: 1100;
    }

    .popup--modal {
        max-width: 480px;
        width: min(480px, 100% - 2rem);
        box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
        cursor: default;
    }

    .popup-actions {
        margin-top: 0.75rem;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.5rem;
    }

    /* Reuse global button styles.
       Only add a danger variant here. */
    button.danger {
        background: var(--red);
        border-color: var(--red);
        color: #fff;
    }

    /* Header row: title on left, dismiss button on right */
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
        color: var(--text-1);
        overflow-wrap: anywhere;
    }

    .popup-detail {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-2);
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
        background: transparent;
        color: var(--text-2);
    }

    .dismiss:hover {
        background: var(--bg-hover);
    }

    .dismiss-icon {
        font-size: 0.9rem;
        line-height: 1;
        color: var(--text-2);
    }

    .dismiss svg.progress {
        width: 18px;
        height: 18px;
        display: inline-block;
    }

    .dismiss .circle {
        fill: none;
        stroke: var(--text-3);
        stroke-width: 2.5;
        stroke-linecap: round;
        transition: stroke-dasharray 0.1s linear;
    }
</style>
