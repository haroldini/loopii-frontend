
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
    let message = null;

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
        message = null;
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
    mode="windowed"
    on:requestClose={() => cancel("closed")}
>
    {#if isOpen}
        <button
            type="button"
            class="overlay__scrim"
            aria-hidden="true"
            tabindex="-1"
        ></button>

        <div class="overlay__panel captcha__panel" role="document">
            <header class="bar bar--header overlay__header">
                <div class="bar__inner">
                    <div class="bar__title">
                        <h3>Verify you're human</h3>
                        {#if message}
                            <p class="text-hint">{message}</p>
                        {/if}
                    </div>
                </div>
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
            </main>

            <div class="overlay__actionbar">
                <div class="overlay__actions">
                    <div class="overlay__actions-left">
                        <button
                            type="button"
                            class="btn btn--ghost btn--icon"
                            aria-label="Close"
                            on:click={() => cancel("close")}
                        >
                            ✕
                        </button>
                    </div>
                    <div class="overlay__actions-right">
                        <button
                            type="button"
                            class="btn btn--primary btn--block"
                            on:click={confirm}
                            disabled={!captchaToken || busy}
                        >
                            {busy ? "Verifying..." : "Continue"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</Overlay>

