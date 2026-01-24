
<script>
    import { onDestroy, onMount, tick } from "svelte";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js"; 
    import { HCAPTCHA_SITEKEY } from "$lib/utils/env.js";
    import HCaptcha from "$lib/components/HCaptcha.svelte";
    import Overlay from "$lib/components/Overlay.svelte";

    const HASH = "#captcha";

    let overlay;
    let isOpen = false;

    let captchaToken = "";

    let busy = false;
    let message = null;

    // Compact captcha on small screens
    let captchaSize = "normal";
    onMount(() => {
        const mq = window.matchMedia("(max-width: 340px)");
        const setSize = () => {
            captchaSize = mq.matches ? "compact" : "normal";
        };
        setSize();
        mq.addEventListener?.("change", setSize);
        return () => mq.removeEventListener?.("change", setSize);
    });

    // Promise hooks
    let resolveFn = null;
    let rejectFn = null;

    let autoSubmitted = false;
    function onCaptchaToken(e) {
        captchaToken = e.detail.token || "";
        if (!captchaToken) {
            autoSubmitted = false;
            return;
        }
        if (busy || autoSubmitted) return;
        autoSubmitted = true;
        confirm();
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
        busy = false;
        autoSubmitted = false;
        resolveFn = null;
        rejectFn = null;
        message = null;
    }

    function cancel(reason = "cancelled") {
        const rej = rejectFn;
        try {
            closeOverlay();
        } finally {
            cleanup();
        }
        rej?.(new Error(reason));
    }

    async function confirm() {
        if (!captchaToken || busy) return;
        busy = true;

        const res = resolveFn;
        const token = captchaToken;

        closeOverlay();
        cleanup();

        await tick();
        res?.(token);
    }

    // Public API: returns Promise<string> token
    export function openAndSolve(opts = {}) {
        // Only allow one at a time
        if (resolveFn || rejectFn || isOpen) {
            return Promise.reject(new Error("captcha_already_open"));
        }

        message = opts.message ?? null;

        openOverlay();

        return new Promise((resolve, reject) => {
            resolveFn = resolve;
            rejectFn = reject;
        });
    }

    onDestroy(() => {
        const rej = rejectFn;
        try {
            closeOverlay();
        } finally {
            cleanup();
        }
        try { rej?.(new Error("captcha_unmounted")); } catch {}
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
    windowedAt={560}
    on:requestClose={() => cancel("closed")}
>
    {#if isOpen}
        <div
            class="overlay__scrim"
            aria-hidden="true"
        ></div>

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
                        sitekey={HCAPTCHA_SITEKEY}
                        theme="dark"
                        size={captchaSize}
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
                            <Icon icon={UI_ICONS.close} class="btn__icon" />
                        </button>
                    </div>
                    <div class="overlay__actions-right">
                        <button
                            type="button"
                            class="btn btn--primary"
                            class:is-loading={busy}
                            on:click={confirm}
                            disabled={!captchaToken || busy}
                        >
                            {#if busy}
                                <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                                <span class="btn__label">Submitting...</span>
                            {:else}
                                <span class="btn__label">Continue</span>
                                <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</Overlay>

