
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
    <div class="popup popup--banner" role="group">
        <div class="popup-header">
            <button
                type="button"
                class="popup-titleblock ui-pressable"
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
                class="dismiss ui-pressable"
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
    <div
        class="popup popup--rich ui-pressable"
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
                class="dismiss ui-pressable"
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
            <div class="popup-inner popup-inner-no-hover">
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
                    class="dismiss ui-pressable"
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
                                "btn " +
                                (act.variant === "primary"
                                    ? "btn--primary"
                                    : act.variant === "danger"
                                    ? "btn--danger"
                                    : "")
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
    .popup {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-2);

        background: var(--bg-surface);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius-lg);

        padding: calc(var(--space-2) + var(--space-1)) var(--space-3);
        max-width: min(40rem, 90%, 50vh, 300px);
        width: 90%;
    }

    .popup--banner {
        cursor: default;
    }

    .popup--rich {
        transition: background 0.15s ease, border-color 0.15s ease;
    }

    .popup--rich:hover {
        background: var(--bg-secondary);
    }

    .popup--rich:focus-visible {
        outline: var(--focus-ring-width) solid var(--focus-ring-color);
        outline-offset: var(--focus-ring-offset);
        border-radius: var(--radius-lg);
    }

    .modal-backdrop {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        background: var(--scrim-1);
        z-index: var(--z-modal);
        padding: var(--space-4);
    }

    .popup--modal {
        max-width: 40rem;
        width: min(40rem, 90%);
        box-shadow: var(--shadow-2);
        cursor: default;
    }

    .popup-actions {
        margin-top: calc(var(--space-2) + var(--space-1));
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--space-2);
    }

    .popup-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: calc(var(--space-2) + var(--space-1));
    }

    .popup-titleblock {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-width: 0;
        flex: 1 1 auto;
        text-align: left;
    }

    .popup-title {
        font-weight: var(--font-weight-semibold);
        font-size: 1rem;
        margin: 0;
        color: var(--text-primary);
        overflow-wrap: anywhere;
    }

    .popup-detail {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
        overflow-wrap: anywhere;
    }

    .popup-inner {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    :global(.popup-inner-no-hover .profile-preview:hover) {
        background: var(--bg-surface) !important;
    }

    .dismiss {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-1);
        min-width: 2.5rem;
        height: 2.5rem;
        padding: 0 0.4rem;
        border-radius: var(--radius-full);
        flex-shrink: 0;
        background: transparent;
        color: var(--text-secondary);
    }

    .dismiss:hover {
        background: var(--bg-hover);
    }

    .dismiss-icon {
        font-size: 1rem;
        line-height: 1;
        color: var(--text-secondary);
    }

    .dismiss svg.progress {
        width: 1.5rem;
        height: 1.5rem;
        display: inline-block;
    }

    .dismiss .circle {
        fill: none;
        stroke: var(--text-muted);
        stroke-width: 2.5;
        stroke-linecap: round;
        transition: stroke-dasharray 0.1s linear;
    }
</style>
