
<script>
    import Icon from "@iconify/svelte";
    import { tick } from "svelte";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { goto } from "$app/navigation";
    import {
        initPeerStore,
        peerQueue,
        peerStatus,
        handleDecision,
        refreshPeerStore
    } from "$lib/stores/feed.js";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

    $: if ($peerStatus === "unloaded") {
        initPeerStore();
    }

    // ===== Deck transition tuning =====
    const DECK_SCROLL_MS = 350;

    let deckScrollerEl;
    let isAnimating = false;

    // Always keep 3 rendered
    let deckPeers = [null, null, null];

    // Keep deckPeers synced to the queue when not animating
    $: if (!isAnimating && $peerStatus === "loaded") {
        const q = $peerQueue ?? [];
        const headId = q[0]?.id ?? null;

        if (!headId) {
            deckPeers = [null, null, null];
        } else if (deckPeers[0]?.id !== headId) {
            deckPeers = [q[0] ?? null, q[1] ?? null, q[2] ?? null];
            if (deckScrollerEl) {
                deckScrollerEl.scrollTop = 0;
            }
        } else {
            if (!deckPeers[1] && q[1]) {
                deckPeers = [deckPeers[0], q[1], deckPeers[2]];
            }
            if (!deckPeers[2] && q[2]) {
                deckPeers = [deckPeers[0], deckPeers[1], q[2]];
            }
        }
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function animateScrollTop(el, to, durationMs) {
        return new Promise((resolve) => {
            if (!el || durationMs <= 0) {
                if (el) el.scrollTop = to;
                resolve();
                return;
            }

            const from = el.scrollTop;
            const delta = to - from;

            if (delta === 0) {
                resolve();
                return;
            }

            const start = performance.now();

            const step = (now) => {
                const t = Math.min(1, (now - start) / durationMs);
                el.scrollTop = from + delta * easeOutCubic(t);

                if (t < 1) {
                    requestAnimationFrame(step);
                    return;
                }

                resolve();
            };

            requestAnimationFrame(step);
        });
    }

    async function decide(connect) {
        if (isAnimating) return;

        const q = $peerQueue ?? [];
        if (!q[0]) return;

        // Freeze the 3-card window
        deckPeers = [q[0] ?? null, q[1] ?? null, q[2] ?? null];

        isAnimating = true;

        await tick();

        if (!deckScrollerEl) {
            handleDecision(connect);
            isAnimating = false;
            return;
        }

        const slideHeight = deckScrollerEl.clientHeight || 0;
        if (slideHeight <= 0) {
            handleDecision(connect);
            isAnimating = false;
            return;
        }

        // Always start at the top of slide 1.
        deckScrollerEl.scrollTop = 0;

        // Scroll slide 2 into view
        await animateScrollTop(deckScrollerEl, slideHeight, DECK_SCROLL_MS);

        // Commit decision
        handleDecision(connect);

        // Append a new 3rd card (profile 4) and remove the first (profile 1)
        const newThird = $peerQueue?.[2] ?? null;
        deckPeers = [deckPeers[1] ?? null, deckPeers[2] ?? null, newThird];

        // Let DOM update
        await tick();
        if (deckScrollerEl) {
            deckScrollerEl.scrollTop = 0;
        }

        isAnimating = false;
    }
</script>




<svelte:head>
    <title>loopii • Find Loops</title>
</svelte:head>


<div class="page page--viewport">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h2 class="text-heading text-logo">loop<span class="logo--i">ii</span></h2>
                <!-- <img src="/logo/logo.png" alt="loopii" class="logo logo--long" /> -->
            </div>

            <div class="bar__actions">
                <!-- {#if !expanded} -->
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        class:is-loading={$peerStatus === "loading"}
                        on:click={refreshPeerStore}
                        disabled={$peerStatus === "loading" || isAnimating}
                        aria-label="Refresh"
                    >
                        <Icon icon={UI_ICONS.refresh} class="btn__icon" />
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                    </button>

                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => goto("/profile/search-preferences")}
                    >
                        <Icon 
                            icon={UI_ICONS.tune}
                            class="btn__icon"
                        />
                    </button>
                <!-- {:else}
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={close}
                        aria-label="Close"
                    >
                        <Icon 
                            icon={UI_ICONS.chevronDown}
                            class="btn__icon"
                        />
                    </button>
                {/if} -->
            </div>
        </div>
    </header>

    <div class="content stack">
        {#if $peerStatus === "loading"}
            <div class="page__center">
                <Icon
                    icon={UI_ICONS.animLoading}
                    class="page__icon"
                />
            </div>

        {:else if $peerStatus === "error"}
            <div class="page__center">
                <Icon icon={UI_ICONS.refreshError} class="icon--medium" />
                <p class="text-center u-space-above">We couldn't load your feed right now.</p>
                <p class="text-hint text-center">Please try again in a moment.</p>
            </div>

        {:else if $peerStatus === "hidden"}
            <div class="page__center">
                <Icon icon={UI_ICONS.eyeClose} class="icon--medium" />
                <p class="text-center u-space-above">Your profile is hidden.</p>
                <p class="text-hint text-center">
                    Update your
                    <a href="/profile/visibility-preferences" class="text-link">visibility preferences</a>
                    to see other profiles.
                </p>
            </div>

        {:else if $peerStatus === "empty"}
            <div class="page__center">
                <Icon icon={UI_ICONS.filtersEmpty} class="icon--medium" />
                <p class="text-center u-space-above">We couldn't find any matching profiles.</p>
                <p class="text-hint text-center">
                    Expand your
                    <a href="/profile/search-preferences" class="text-link">search preferences</a>
                    or try again later.
                </p>
            </div>

        {:else}
            <div class="feed-deck" class:is-animating={isAnimating}>
                <div class="feed-deck__scroller" bind:this={deckScrollerEl}>
                    {#each deckPeers as profile, index (profile?.id ?? `blank-${index}`)}
                        <section class="feed-deck__slide">
                            <div class="feed-slide__scroll">
                                {#if profile}
                                    <ProfileCardExpanded profile={profile} />
                                {/if}
                            </div>
                        </section>
                    {/each}
                </div>
            </div>
        {/if}
    </div>


    {#if $peerStatus !== "loading" && $peerStatus !== "error" && $peerStatus !== "hidden" && $peerStatus !== "empty"}
        <div class="bar bar--actionbar">
            <div class="bar__inner">
                <div class="actionbar">
                    <button
                        type="button"
                        class="btn btn--danger btn--mini btn--round"
                        disabled={isAnimating}
                        on:click={() => decide(false)}
                    >
                        <Icon
                            icon={UI_ICONS.close}
                            class="btn__icon btn__icon--large"
                        />
                    </button>

                    <button
                        type="button"
                        class="btn btn--success btn--mini btn--round"
                        disabled={isAnimating}
                        on:click={() => decide(true)}
                    >
                        <Icon
                            icon={UI_ICONS.heart}
                            class="btn__icon btn__icon--large"
                        />
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>


<style>
    .feed-deck {
        flex: 1 1 auto;
        min-height: 0;
        height: 100%;
        width: 100%;
        max-width: none !important;
        margin-inline: 0 !important;
        overflow: hidden;
    }

    .feed-deck__scroller {
        height: 100%;
        min-height: 0;
        overflow: hidden;
    }

    .feed-deck__slide {
        height: 100%;
        min-height: 0;
    }

    .feed-slide__scroll {
        height: 100%;
        min-height: 0;

        overflow: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
    }

    .feed-deck.is-animating .feed-slide__scroll {
        pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
        .feed-deck.is-animating .feed-slide__scroll {
            pointer-events: auto;
        }
    }
</style>

