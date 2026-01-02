
<script>
    import { goto } from "$app/navigation";
    import Icon from "@iconify/svelte";

    import { UI_ICONS, referencesStatus } from "$lib/stores/app.js";
    import { authState } from "$lib/stores/auth.js";
    import { profileState } from "$lib/stores/profile.js";

    $: inApp = $authState === "authenticated" && $profileState === "loaded" && $referencesStatus === "loaded";

    function goBack() {
        if (inApp) goto("/settings");
        else window.location.replace("/");
    }
</script>


<svelte:head>
    <title>loopii • Terms</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h2 class="text-heading">Terms</h2>
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

    <div class="content stack gutter">
        <div class="section stack">
            <h3>Basics</h3>
            <div class="card card--panel" role="region" aria-label="Basics">
                <div class="section stack">
                    <p>
                        loopii helps people discover each other and connect off-platform via links to shared socials.
                    </p>

                    <p class="text-hint">
                        If you don&apos;t agree with these terms, don&apos;t use the service.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Eligibility</h3>
            <div class="card card--panel" role="region" aria-label="Eligibility">
                <div class="section stack">
                    <p>
                        You must be 18+ (or the age of legal adulthood where you live).
                    </p>

                    <p class="text-hint">
                        Accounts suspected to belong to minors may be removed.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Content rules</h3>
            <div class="card card--panel" role="region" aria-label="Content rules">
                <div class="section stack">
                    <ul>
                        <li>No pornographic or explicit sexual content.</li>
                        <li>No AI-generated profile photos.</li>
                        <li>No promotion of external adult platforms (including link pages routing to them).</li>
                        <li>No hate, threats, harassment, or targeted abuse.</li>
                        <li>No illegal content or encouragement of illegal activity.</li>
                    </ul>

                    <p class="text-hint">
                        Voice intros, photos, and bios are treated as user content and must follow the same rules.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Profiles and socials</h3>
            <div class="card card--panel" role="region" aria-label="Profiles and socials">
                <div class="section stack">
                    <ul>
                        <li>Only add socials/usernames you own or control.</li>
                        <li>No advertising, lead-gen, or "DM me for..." funnels.</li>
                        <li>No impersonation or misleading identity.</li>
                    </ul>

                    <p class="text-hint">
                        If your profile is used primarily for marketing, it may be removed.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Platform misuse</h3>
            <div class="card card--panel" role="region" aria-label="Platform misuse">
                <div class="section stack">
                    <ul>
                        <li>No multiple accounts to evade bans, spam, or manipulate discovery.</li>
                        <li>No scraping, harvesting, or exporting user data.</li>
                        <li>No automation/bots to interact with the feed, requests, or loops.</li>
                        <li>Use the service only for its intended purpose: discovery and mutual connection.</li>
                    </ul>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Moderation and enforcement</h3>
            <div class="card card--panel" role="region" aria-label="Moderation">
                <div class="section stack">
                    <p>
                        loopii may remove content (including media), restrict features, suspend, or delete accounts/profiles
                        to enforce these terms or keep the service safe.
                    </p>

                    <p class="text-hint">
                        You can delete your account from <strong>/settings</strong>.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Off-platform interactions</h3>
            <div class="card card--panel" role="region" aria-label="Off-platform interactions">
                <div class="section stack">
                    <p>
                        Once you connect off-platform, your interaction is governed by that platform and your own choices.
                        loopii is not responsible for what happens in DMs, calls, meetups, or other third-party services.
                    </p>

                    <p class="text-hint">
                        If someone uses loopii to abuse or threaten you, report it via the Contact page.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Contact</h3>
            <div class="card card--panel" role="region" aria-label="Contact">
                <div class="section stack">
                    <div class="form__actions">
                        <button
                            type="button"
                            class="btn btn--ghost btn--block"
                            on:click={() => goto("/contact")}
                            aria-label="Contact"
                            title="Contact"
                        >
                            <Icon icon={UI_ICONS.email} class="btn__icon" />
                            <span class="btn__label">Contact</span>
                        </button>
                    </div>

                    <p class="text-hint">
                        Use Contact for abuse reports, account access issues, or policy questions.
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
