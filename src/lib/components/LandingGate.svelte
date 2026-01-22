
<script>
    import Icon from "@iconify/svelte";
    import { subPage } from "$lib/stores/authForm.js";
    import { UI_ICONS } from "$lib/stores/app.js";

    export let onContinue = () => {};

    function handleSignup() {
        subPage.set("signup");
        onContinue();
    }

    function handleLogin() {
        subPage.set("login");
        onContinue();
    }

    function openQuickSettings() {
        if (typeof document === "undefined") return;

        const trigger = document.querySelector(".quick-settings__trigger");
        if (!trigger) return;

        trigger.click();
    }
</script>

<div class="page page--viewport landing-page" role="region" aria-label="loopii landing">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h1 class="text-logo">loop<span class="logo--i">ii</span></h1>
            </div>

            <div class="bar__actions">
                <button
                    type="button"
                    class="btn btn--ghost btn--icon"
                    on:click={openQuickSettings}
                    aria-label="Settings"
                    title="Settings"
                >
                    <Icon icon={UI_ICONS.settings} class="btn__icon" />
                </button>
            </div>
        </div>
    </header>

    <div class="landing-content">
        <div class="landing-layout">
            <section class="landing-hero" aria-label="Intro">
                <div class="landing-hero__inner stack">
                    <h2 class="landing-hero__title text-heading">
                        Find mutuals, friends, and partners.
                    </h2>

                    <p class="landing-hero__subtitle">
                        Discover your loops, then connect on platforms you already use.
                    </p>

                    <div class="landing-cta" role="group" aria-label="Get started">
                        <button
                            type="button"
                            class="btn btn--primary btn--large"
                            on:click={handleSignup}
                        >
                            <span class="btn__label">Get started</span>
                            <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
                        </button>

                        <button
                            type="button"
                            class="btn btn--ghost btn--large"
                            on:click={handleLogin}
                        >
                            <span class="btn__label">Log in</span>
                            <Icon icon={UI_ICONS.login} class="btn__icon" />
                        </button>
                    </div>
                </div>
            </section>

            <section class="landing-features" aria-label="Highlights">
                <div class="landing-features__grid">
                    <article class="landing-card">
                        <div class="landing-card__head">
                            <Icon icon={UI_ICONS.heartOutline} class="landing-card__icon text-secondary" />
                            <h3 class="landing-card__title">Find your people</h3>
                        </div>
                        <p class="landing-card__text">
                            Local or global. Friends or dating. You decide what you're here for.
                        </p>
                    </article>

                    <article class="landing-card">
                        <div class="landing-card__head">
                            <Icon icon={UI_ICONS.link} class="landing-card__icon text-secondary" />
                            <h3 class="landing-card__title">Connect off-app</h3>
                        </div>
                        <p class="landing-card__text">
                            Loop here, then connect on Discord, Instagram, X, or wherever you already are.
                        </p>
                    </article>

                    <article class="landing-card">
                        <div class="landing-card__head">
                            <Icon icon={UI_ICONS.tune} class="landing-card__icon text-secondary" />
                            <h3 class="landing-card__title">Control discovery</h3>
                        </div>
                        <p class="landing-card__text">
                            Shape your feed and visibility. Decide who you see and who sees you.
                        </p>
                    </article>

                    <article class="landing-card">
                        <div class="landing-card__head">
                            <Icon icon={UI_ICONS.sticker} class="landing-card__icon text-secondary" />
                            <h3 class="landing-card__title">Show personality</h3>
                        </div>
                        <p class="landing-card__text">
                            Add photos, voice notes, and loops-only content for people to connect with.
                        </p>
                    </article>

                    <article class="landing-card landing-card--highlight landing-card--span">
                        <div class="landing-card__head">
                            <Icon icon={UI_ICONS.starFilled} class="landing-card__icon text-secondary" />
                            <h3 class="landing-card__title">No pay-to-play</h3>
                        </div>
                        <p class="landing-card__text">
                            Free, equal, and simple. No boosts, no paid visibility, no feature paywalls.
                        </p>
                    </article>
                </div>
            </section>
        </div>
    </div>

    <footer class="bar bar--actionbar landing-footer" aria-label="Footer">
        <div class="bar__inner landing-footer__inner">
            <div class="landing-footer__text">
                <p class="text-hint landing-footer__hint">
                    18+ only • Be respectful, be safe, and keep connections on your terms.
                </p>
            </div>

            <div class="landing-footer__links" aria-label="Links">
                <a class="text-link" href="/terms" target="_blank" rel="noreferrer">
                    <Icon icon={UI_ICONS.terms} class="landing-footer__icon" />
                    <span class="landing-inline-label">Terms</span>
                </a>

                <span class="landing-footer__dot" aria-hidden="true">•</span>

                <a class="text-link" href="/privacy" target="_blank" rel="noreferrer">
                    <Icon icon={UI_ICONS.privacy} class="landing-footer__icon" />
                    <span class="landing-inline-label">Privacy</span>
                </a>

                <span class="landing-footer__dot" aria-hidden="true">•</span>

                <a class="text-link" href="/contact" target="_blank" rel="noreferrer">
                    <Icon icon={UI_ICONS.email} class="landing-footer__icon" />
                    <span class="landing-inline-label">Contact</span>
                </a>
            </div>
        </div>
    </footer>
</div>

<style>
    :global(.quick-settings__trigger) {
        display: none !important;
    }

    .landing-page {
        position: fixed;
        inset: 0;
        z-index: calc(var(--z-overlay) - 1);
        background: var(--bg-app);
        overflow: hidden;

        display: flex;
        flex-direction: column;

        overscroll-behavior: none;
    }

    .landing-page > .bar--header {
        position: relative;
        top: auto;
        height: calc(var(--header-height) + var(--safe-top));
        padding-top: var(--safe-top);
        border-bottom-width: var(--border-width);
        background: transparent;
        flex: 0 0 auto;
    }

    .landing-page > .bar--header .bar__inner {
        height: var(--header-height);
    }

    .landing-content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        overflow-x: hidden;

        display: grid;
        align-content: center;
        justify-items: stretch;

        padding: 0;
    }

    .landing-layout {
        width: 100%;
        max-width: 1200px;
        margin-inline: auto;

        padding:
            var(--space-4)
            var(--gutter)
            var(--space-4);

        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: var(--space-5);
        align-items: center;

        min-width: 0;
    }

    .landing-hero,
    .landing-features {
        min-width: 0;
    }

    .landing-hero__inner {
        max-width: 40rem;
        padding: var(--space-3) var(--space-2);
    }

    .landing-hero__title {
        font-size: clamp(1.6rem, 2.6vw, 2.35rem);
        line-height: 1.15;
        margin: 0;
    }

    .landing-hero__subtitle {
        font-size: 1rem;
        color: var(--text-secondary);
        margin: 0;
        max-width: 42rem;
    }

    .landing-cta {
        width: 100%;
        margin-top: var(--space-2);

        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);

        max-width: 32rem;
    }

    .landing-cta > .btn {
        flex: 1 1 12rem;
        width: 100%;
        min-width: 0;
        max-width: 100%;
    }

    .landing-features__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-3);
        min-width: 0;
        margin: var(--space-2);
    }

    .landing-card {
        background: var(--bg-surface);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: var(--space-3);
        min-width: 0;

        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .landing-card--highlight {
        background: color-mix(in oklab, var(--accent) 10%, var(--bg-surface));
        border-color: color-mix(in oklab, var(--accent) 30%, var(--border-color));
    }

    .landing-card--span {
        grid-column: 1 / -1;
    }

    .landing-card__head {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        min-width: 0;
    }

    .landing-card__title {
        margin: 0;
        font-size: 1.05rem;
        color: var(--text-primary);

        white-space: normal;
        overflow-wrap: anywhere;
        word-break: normal;
        min-width: 0;

        transform: translateY(-0.06rem);
    }

    .landing-card__text {
        margin: 0;
        color: var(--text-secondary);
        font-size: 0.95rem;
        overflow-wrap: anywhere;
    }

    .landing-footer {
        background: transparent;
        padding-bottom: var(--safe-bottom);
        border-top: var(--border-width) solid var(--border-color);
        flex: 0 0 auto;
    }

    .landing-footer__inner {
        max-width: 1120px;
        margin: 0 auto;

        padding:
            var(--space-3)
            var(--gutter);

        display: flex;
        align-items: center;
        justify-content: space-between;

        column-gap: var(--space-4);
        row-gap: var(--space-3);

        flex-wrap: wrap;
        min-width: 0;
    }

    .landing-footer__text {
        min-width: 0;
        max-width: 46rem;
    }

    .landing-footer__hint {
        margin: 0;
        overflow-wrap: anywhere;
    }

    .landing-footer__links {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
        min-width: 0;
    }

    .landing-footer__links .text-link {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        text-decoration: none;
        white-space: nowrap;
    }

    .landing-footer__links .text-link:hover {
        text-decoration: underline;
        text-underline-offset: 2px;
    }

    .landing-footer__dot {
        color: var(--text-muted);
        user-select: none;
        transform: translateY(-0.05rem);
        flex: 0 0 auto;
        white-space: nowrap;
    }

    .landing-inline-label {
        display: inline-flex;
        transform: translateY(-0.075rem);
        line-height: var(--line-height);
    }

    @media (max-width: 1050px) {
        .landing-footer__inner {
            justify-content: center;
            text-align: center;
        }

        .landing-footer__links {
            width: 100%;
            justify-content: center;
        }
    }

    @media (max-width: 900px) {
        .landing-layout {
            grid-template-columns: 1fr;
            gap: var(--space-3);
            align-items: stretch;

            padding:
                var(--space-3)
                var(--gutter)
                var(--space-4);
        }

        .landing-hero__inner {
            max-width: none;
            padding: var(--space-2) var(--space-2);
        }

        .landing-cta {
            max-width: none;
        }

        .landing-cta > .btn {
            flex: 1 1 14rem;
        }

        .landing-features__grid {
            gap: var(--space-2);
        }

        .landing-card {
            padding: var(--space-2-5);
        }

        .landing-card__title {
            font-size: 1rem;
        }

        .landing-card__text {
            font-size: 0.92rem;
        }
    }

    @media (max-width: 740px) {
        .landing-features__grid {
            display: flex;
            gap: var(--space-2);
            overflow-x: auto;
            overflow-y: hidden;

            scroll-snap-type: x mandatory;
            scroll-behavior: smooth;

            --landing-card-width: min(26rem, calc(100% - (var(--gutter) * 2)));

            padding-inline: max(var(--gutter), calc((100% - var(--landing-card-width)) / 2));
            scroll-padding-inline: max(var(--gutter), calc((100% - var(--landing-card-width)) / 2));

            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .landing-features__grid::-webkit-scrollbar {
            display: none;
        }

        .landing-card {
            width: var(--landing-card-width);
            flex: 0 0 auto;
            scroll-snap-align: center;
        }

        .landing-card--span {
            width: var(--landing-card-width);
        }
    }

    @media (max-width: 460px) {
        .landing-cta > .btn {
            flex: 1 1 100%;
        }
    }
</style>
