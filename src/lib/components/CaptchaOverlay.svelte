
<script>
    import { onDestroy, tick } from "svelte";
    import Overlay from "$lib/components/Overlay.svelte";
    import HCaptcha from "$lib/components/HCaptcha.svelte";
    import { HCAPTCHA_SITEKEY } from "$lib/utils/env.js";

    const HASH = "#captcha";

    let overlay;
    let isOpen = false;

    let captchaRef;
    let captchaToken = "";

    let busy = false;
    let message = "Captcha required. Please complete the challenge to continue.";

    // Promise hooks (set by openAndSolve)
    let resolveFn = null;
    let rejectFn = null;

    function onCaptchaToken(e) {
        captchaToken = e.detail.token || "";
    }

    function openOverlay() {
        isOpen = true;
        overlay?.openOverlay();
    }

    function closeOverlay() {
        isOpen = false;
        overlay?.closeOverlay();
    }

    function cleanup() {
        captchaToken = "";
        captchaRef?.reset();
        busy = false;
        resolveFn = null;
        rejectFn = null;
        message = "Captcha required. Please complete the challenge to continue.";
    }

    function cancel(reason = "cancelled") {
        const rej = rejectFn;
        cleanup();
        closeOverlay();
        rej?.(new Error(reason));
    }

    async function confirm() {
        if (!captchaToken || busy) return;
        busy = true;

        // Resolve with token, then close/reset.
        const res = resolveFn;
        const token = captchaToken;

        cleanup();
        closeOverlay();

        // Let DOM update (avoid callers racing with teardown)
        await tick();
        res?.(token);
    }

    // Public API: returns Promise<string> token
    export function openAndSolve(opts = {}) {
        // Only allow one at a time
        if (resolveFn || rejectFn || isOpen) {
            return Promise.reject(new Error("captcha_already_open"));
        }

        message = opts.message || message;

        openOverlay();

        return new Promise((resolve, reject) => {
            resolveFn = resolve;
            rejectFn = reject;
        });
    }

    onDestroy(() => {
        // If component is destroyed while awaiting captcha, reject.
        if (rejectFn) {
            try { rejectFn(new Error("captcha_unmounted")); } catch {}
        }
        cleanup();
    });
</script>


<Overlay
    bind:this={overlay}
    open={isOpen}
    hash={HASH}
    openClass="overlay"
    closedClass="u-hidden"
    renderOpenOnly={false}
    ariaLabel="Captcha verification"
    on:requestClose={() => cancel("closed")}
>
    {#if isOpen}
        <button
            type="button"
            class="overlay__scrim"
            aria-hidden="true"
            tabindex="-1"
            on:click={() => cancel("scrim")}
        ></button>

        <div class="overlay__panel captcha__panel" role="document">
            <header class="overlay__header captcha__header">
                <div class="bar__title">
                    <h3>Verify you’re human</h3>
                    <p class="text-hint">{message}</p>
                </div>

                <button
                    type="button"
                    class="btn btn--ghost btn--icon"
                    aria-label="Close"
                    on:click={() => cancel("close")}
                >
                    ✕
                </button>
            </header>

            <main class="overlay__body captcha__body">
                <div class="captcha__widget">
                    <HCaptcha
                        bind:this={captchaRef}
                        sitekey={HCAPTCHA_SITEKEY}
                        theme="dark"
                        on:token={onCaptchaToken}
                    />
                </div>

                <div class="captcha__actions">
                    <button
                        type="button"
                        class="btn btn--ghost btn--block"
                        on:click={() => cancel("cancel")}
                        disabled={busy}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        class="btn btn--primary btn--block"
                        on:click={confirm}
                        disabled={!captchaToken || busy}
                    >
                        {busy ? "Verifying..." : "Continue"}
                    </button>
                </div>
            </main>
        </div>
    {/if}
</Overlay>


<style>
    /* .captcha__panel {
        max-width: 32rem;
        width: min(32rem, calc(100% - var(--space-4)));
        height: auto;
        max-height: min(92vh, 900px);
        margin: 0 auto;
    } */

    .captcha__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-2);
    }

    .captcha__body {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .captcha__widget {
        display: flex;
        justify-content: center;
    }

    .captcha__actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-2);
    }
</style>
