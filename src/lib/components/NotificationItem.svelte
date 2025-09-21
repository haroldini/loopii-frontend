
<script>
    import { onMount } from "svelte";
    import { dismissNotification } from "$lib/stores/app";

    // Store props
    export let id;
    export let type = "info";      // "success" | "error" | "info"
    export let variant = "banner"; // "banner" | "popup"
    export let text = "";
    export let autoHideMs = null;
    export let onDismiss = null;
    export let component = null;
    export let props = {};

    // Timer and progress for auto-hide
    let timer;
    let progress = 1; // 1 = full circle, 0 = empty
    let interval;

    // Setup auto-hide timer if specified
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

    // Dismiss notification
    function dismiss() {
        dismissNotification(id);
        if (onDismiss) onDismiss();
    }
</script>


<!-- Banner -->
{#if variant === "banner"}
    <div class="banner {type}">
        <span class="text">{text}</span>
        <button class="dismiss" on:click={dismiss}>
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
{:else if variant === "popup"}
    <div class="popup">
        <div class="popup-header">
            <p class="popup-title">{text}</p>
            <button class="dismiss" on:click={dismiss} aria-label="Dismiss">
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
                on:expand={props.onExpand}
            />
            {:else}
            <p>{text}</p>
            {/if}
        </div>
    </div>
{/if}


<style>
/* Shared */
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

/* Banner */
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
.banner .text {
    flex: 1;
    margin-right: 0.75rem;
}
.banner.success { background: #eef9f0; color: #0b5e2b; }
.banner.error   { background: #fdecea; color: #811d1d; }
.banner.info    { background: #eef3ff; color: #1c3c86; }

/* Popup */
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
  margin: 0;
  font-weight: 600;
  line-height: 1.2;
}

.popup-body {
  display: block;
}
</style>
