
<script>
    import { goto } from "$app/navigation";
    import Icon from "@iconify/svelte";

    import { UI_ICONS, referencesStatus } from "$lib/stores/app.js";
    import { authState } from "$lib/stores/auth.js";
    import { profileState } from "$lib/stores/profile.js";

    const CONTACT_EMAIL = "contact@loopii.app";

    $: inApp = $authState === "authenticated" && $profileState === "loaded" && $referencesStatus === "loaded";

    function goBack() {
        if (inApp) goto("/settings");
        else window.location.replace("/");
    }
</script>


<svelte:head>
    <title>loopii • Privacy</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h2 class="text-heading">Privacy</h2>
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
            <h3>Summary</h3>
            <div class="card card--panel" role="region" aria-label="Privacy summary">
                <div class="section stack">
                    <p>
                        loopii processes account and profile data so the app can run (auth, discovery, loops, and media).
                        loopii does not run third-party analytics or ad tracking.
                    </p>

                    <p class="text-hint">
                        Security note: don&apos;t reuse passwords you use anywhere else. No system can guarantee 100% breach-proof operation.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>What loopii stores</h3>
            <div class="card card--panel" role="region" aria-label="Data stored">
                <div class="section stack">
                    <p><strong>Account</strong>: email and authentication/session metadata.</p>

                    <p>
                        <strong>Profile</strong>: the fields you submit (bio, interests, country, gender, etc.).
                        Some fields have edit cooldowns to reduce abuse.
                    </p>

                    <p>
                        <strong>Date of birth</strong>: used to calculate age. Your exact date of birth is not shown to other users.
                        Age is derived from a rounded date internally (rounded to the first of the month).
                    </p>

                    <p>
                        <strong>Socials</strong>: platform + username pairs you add.
                        These are loops-only and only visible after a mutual loop.
                    </p>

                    <p>
                        <strong>Loops & requests</strong>: who you request, who you loop with, and related notification events.
                    </p>

                    <p>
                        <strong>Media</strong>: profile photos and voice intros you upload (processed before upload).
                        Treat media as public: anyone in your feed, or anyone with the direct URL, may be able to access it.
                    </p>

                    <p>
                        <strong>Location</strong>: if you set a map pin, the stored coordinates are used for distance filtering.
                        Other users do not see your coordinates. Matching uses rounded coordinates (approx. 1km) before distance is calculated,
                        and users only see a distance label (not coordinates).
                    </p>

                    <p class="text-hint">
                        Loops-only fields (social usernames + loops-only bio) are only accessible after a mutual loop.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Visibility controls</h3>
            <div class="card card--panel" role="region" aria-label="Visibility controls">
                <div class="section stack">
                    <p>
                        Visibility preferences control who can see you in the feed (and also who you can see).
                        If you exclude a group from seeing you, you won&apos;t see them either.
                    </p>

                    <p>
                        Disabling profile visibility hides your profile from the feed and prevents you from browsing the feed.
                        It&apos;s a pseudo-deactivate / private mode.
                    </p>

                    <p class="text-hint">
                        Visibility off does not "unpublish" media URLs. Your loops can still view you, and someone who already has your URL
                        (or was previously served your profile) may still be able to access or request to loop.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Cookies / local storage</h3>
            <div class="card card--panel" role="region" aria-label="Cookies and local storage">
                <div class="section stack">
                    <p>
                        loopii uses browser storage to keep the app working:
                    </p>

                    <ul>
                        <li>Theme + style preferences (device-specific).</li>
                        <li>Authentication/session state (required for login).</li>
                    </ul>

                    <p>
                        loopii uses hCaptcha for login security and sensitive account actions. hCaptcha may use cookies or local storage
                        for security and abuse prevention.
                    </p>

                    <p class="text-hint">
                        loopii does not run analytics tracking cookies.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Infrastructure</h3>
            <div class="card card--panel" role="region" aria-label="Infrastructure">
                <div class="section stack">
                    <p>
                        loopii uses:
                    </p>

                    <ul>
                        <li>Supabase (Postgres, auth, storage, realtime)</li>
                        <li>Netlify (frontend hosting)</li>
                        <li>Railway (backend hosting)</li>
                        <li>Resend (transactional email delivery)</li>
                        <li>hCaptcha (bot protection)</li>
                    </ul>

                    <p class="text-hint">
                        Transactional emails are sent from <strong>noreply@mail.loopii.app</strong>. Replies to that address are not monitored.
                        Use the contact options on the Contact page instead.
                    </p>
                </div>
            </div>
        </div>


        <div class="section stack">
            <h3>Off-platform connections</h3>
            <div class="card card--panel" role="region" aria-label="Off-platform connections">
                <div class="section stack">
                    <p>
                        loopii doesn&apos;t provide in-app messaging. If you choose to connect off-platform, you&apos;re responsible for what you share
                        and who you engage with.
                    </p>

                    <p class="text-hint">
                        If someone behaves badly, use the Contact page to report it so their account/content can be reviewed.
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
