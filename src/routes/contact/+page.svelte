
<script>
    import { goto } from "$app/navigation";
    import Icon from "@iconify/svelte";

    import { UI_ICONS, referencesStatus } from "$lib/stores/app.js";
    import { authState } from "$lib/stores/auth.js";
    import { profileState } from "$lib/stores/profile.js";

    const EMAIL = "contact@loopii.app";
    const GITHUB = "https://github.com/haroldini";
    const ISSUES = "https://github.com/haroldini/loopii-frontend/issues";

    $: inApp = $authState === "authenticated" && $profileState === "loaded" && $referencesStatus === "loaded";

    function goBack() {
        if (inApp) goto("/settings");
        else window.location.replace("/");
    }
</script>


<svelte:head>
    <title>loopii • Contact</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h2 class="text-heading">Contact</h2>
            </div>
            <div class="bar__actions">
                <button
                    type="button"
                    class="btn btn--ghost btn--icon"
                    on:click={goBack}
                    aria-label="Back"
                    title="Back"
                >
                    <Icon icon={UI_ICONS.arrowLeft} class="btn__icon" />
                </button>
            </div>
        </div>
    </header>

    <div class="content stack">
        <div class="section stack">
            <h3>Get in touch</h3>
            <div class="card card--panel" role="region" aria-label="Contact options">
                <div class="section stack">
                    <div class="form__actions">
                        <a
                            class="btn btn--ghost btn--block"
                            href={`mailto:${EMAIL}`}
                            aria-label="Email"
                            title={EMAIL}
                        >
                            <Icon icon={UI_ICONS.email} class="btn__icon" />
                            <span class="btn__label">{EMAIL}</span>
                        </a>
                    </div>

                    <p class="text-hint">
                        Email is for support, privacy questions, and safety reports.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Report a bug</h3>
            <div class="card card--panel" role="region" aria-label="Report an issue">
                <div class="section stack">
                    <div class="form__actions">
                        <a
                            class="btn btn--danger btn--block"
                            href={ISSUES}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open GitHub issues"
                            title={ISSUES}
                        >
                            <Icon icon={UI_ICONS.bug} class="btn__icon" />
                            <span class="btn__label">Issues</span>
                        </a>
                    </div>

                    <p class="text-hint">
                        Include steps to reproduce, what you expected, what happened, and screenshots if relevant.
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
