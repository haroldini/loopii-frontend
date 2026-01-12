
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

    <div class="content stack">
        <div class="section stack">
            <h3>1) Summary</h3>
            <div class="card card--panel" role="region" aria-label="Privacy summary">
                <div class="section stack">
                    <p>
                        loopii processes account and profile data so the app can run (authentication, discovery, loops,
                        profile display, and media). loopii does not run third-party analytics or ad tracking.
                    </p>

                    <p class="text-hint">
                        Security note: don't reuse passwords. No online service can guarantee 100% breach-proof operation.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>2) What we collect and store</h3>
            <div class="card card--panel" role="region" aria-label="Data stored">
                <div class="section stack">
                    <ol>
                        <li>
                            <strong>Account data</strong>: email, authentication/session metadata, security events (for abuse prevention),
                            and basic operational logs needed to run the service.
                        </li>

                        <li>
                            <strong>Profile data</strong>: the fields you submit (username, name, bio, interests, country, gender,
                            location label, “looking for”, etc.). Some fields may have edit cooldowns to reduce abuse.
                        </li>

                        <li>
                            <strong>Date of birth</strong>: used to calculate age. Your exact date of birth is not shown to other users.
                            Age is derived internally (e.g. rounded/normalized) for display.
                        </li>

                        <li>
                            <strong>Social links</strong>: platform + username/handle pairs you add. These are loops-only and only visible
                            after a mutual loop (match).
                        </li>

                        <li>
                            <strong>Discovery & loops data</strong>: who you see, your decisions, requests, loops, and related notification events.
                            Some decision history may expire over time, meaning you may see the same profile again later.
                        </li>

                        <li>
                            <strong>Media</strong>: profile photos and voice intros you upload (processed before upload). Media is served via
                            public URLs. Treat any media you upload as potentially public.
                        </li>

                        <li>
                            <strong>Location</strong>: if you set a map pin, we store coordinates to support distance filtering. Other users do not
                            see your coordinates. Users may see an approximate distance label. Distance calculations may use rounded/normalized coordinates.
                        </li>
                    </ol>

                    <p class="text-hint">
                        “Loops-only” fields are only accessible after a mutual loop, but anything shown to another user can be copied,
                        screenshotted, or reposted by them. If you are deceived, your shared content may become public elsewhere.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>3) How we use your data</h3>
            <div class="card card--panel" role="region" aria-label="How we use data">
                <div class="section stack">
                    <ol>
                        <li><strong>Provide the service</strong>: authentication, profile display, discovery, loops, and showing socials after a loop.</li>
                        <li><strong>Safety and integrity</strong>: detect bots, scams, abuse, and policy violations; investigate reports; enforce Terms.</li>
                        <li><strong>Operations</strong>: debugging, reliability, preventing fraud/abuse, rate-limiting, and incident response.</li>
                        <li><strong>Communications</strong>: transactional emails (e.g. account access/security) where applicable.</li>
                    </ol>

                    <p class="text-hint">
                        loopii does not sell your personal data and does not run third-party ad tracking or analytics SDKs.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>4) Sharing and disclosure</h3>
            <div class="card card--panel" role="region" aria-label="Sharing and disclosure">
                <div class="section stack">
                    <p>
                        We share data in limited ways:
                    </p>

                    <ol>
                        <li>
                            <strong>With other users</strong>: your profile content is shown in discovery to eligible users. After a mutual loop,
                            loops-only fields (including socials) become visible to the other person.
                        </li>
                        <li>
                            <strong>With service providers</strong>: we use third-party infrastructure providers (listed below) to host the app,
                            store data, send emails, and prevent abuse.
                        </li>
                        <li>
                            <strong>For legal/safety reasons</strong>: we may disclose data if required by law, to respond to valid legal requests,
                            or to protect users, the public, or the service.
                        </li>
                    </ol>

                    <p class="text-hint">
                        Off-platform contact is outside loopii. If you share socials, the other person can store them and contact you elsewhere.
                        Consider keeping linked socials private/locked for an added layer of safety.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>5) Visibility controls</h3>
            <div class="card card--panel" role="region" aria-label="Visibility controls">
                <div class="section stack">
                    <ol>
                        <li>
                            <strong>Visibility preferences</strong> control who can see you in the feed (and also who you can see).
                            If you exclude a group from seeing you, you won't see them either.
                        </li>
                        <li>
                            <strong>Visibility off</strong> hides your profile from the feed and prevents you from browsing the feed
                            (a pseudo-deactivate/private mode).
                        </li>
                        <li>
                            <strong>Important limitation:</strong> turning visibility off does not “unpublish” previously served data.
                            People you already looped with can still see loops-only content, and anyone who already has a direct media URL
                            may still be able to access it.
                        </li>
                    </ol>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>6) Cookies / local storage (cookie policy)</h3>
            <div class="card card--panel" role="region" aria-label="Cookies and local storage">
                <div class="section stack">
                    <p>
                        loopii uses browser storage to keep the app working:
                    </p>

                    <ol>
                        <li><strong>Preferences</strong>: theme + style preferences (device-specific).</li>
                        <li><strong>Session/auth state</strong>: required for login and authenticated use.</li>
                        <li>
                            <strong>Bot protection</strong>: loopii uses hCaptcha for login security and sensitive account actions.
                            hCaptcha may use cookies or local storage for security and abuse prevention.
                        </li>
                    </ol>

                    <p class="text-hint">
                        loopii does not run analytics tracking cookies.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>7) Data retention and deletion</h3>
            <div class="card card--panel" role="region" aria-label="Data retention and deletion">
                <div class="section stack">
                    <ol>
                        <li>
                            <strong>Account deletion.</strong> You can delete your account from <strong>/settings</strong> (where available).
                            Some records may be retained where required for security, abuse prevention, legal compliance, or dispute handling.
                        </li>
                        <li>
                            <strong>Dormant accounts.</strong> Dormant accounts and associated media may be routinely removed to reduce storage
                            and keep the service healthy.
                        </li>
                        <li>
                            <strong>Operational logs.</strong> We may keep limited logs for security and reliability for a reasonable period.
                        </li>
                    </ol>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>8) Security and user responsibility</h3>
            <div class="card card--panel" role="region" aria-label="Security and user responsibility">
                <div class="section stack">
                    <ol>
                        <li>
                            <strong>Unique password.</strong> Use a unique password and don't reuse it across services.
                        </li>
                        <li>
                            <strong>Minimize sensitive info.</strong> Don't put sensitive personal data in your profile.
                            Treat anything you upload as potentially shareable by other users.
                        </li>
                        <li>
                            <strong>Risk exists.</strong> We work to reduce bots/scams/abuse, but we can't guarantee a zero-risk environment.
                            Use due diligence when choosing who to loop with and who to contact off-platform.
                        </li>
                    </ol>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>9) Infrastructure and processors</h3>
            <div class="card card--panel" role="region" aria-label="Infrastructure">
                <div class="section stack">
                    <p>
                        loopii uses service providers to operate:
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
                        For support, use the Contact page or email <strong>{CONTACT_EMAIL}</strong>.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>10) Off-platform connections</h3>
            <div class="card card--panel" role="region" aria-label="Off-platform connections">
                <div class="section stack">
                    <p>
                        loopii doesn't provide in-app messaging. If you choose to connect off-platform, you're responsible for what you share
                        and who you engage with. Third-party platforms have their own rules and privacy policies.
                    </p>

                    <p class="text-hint">
                        If someone behaves badly, report them from their profile (where possible) and/or use the Contact page so their account/content
                        can be reviewed.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>11) Contact</h3>
            <div class="card card--panel" role="region" aria-label="Contact">
                <div class="section stack">
                    <p>
                        Questions, concerns, or privacy requests:
                        <strong>{CONTACT_EMAIL}</strong>
                    </p>

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
                        Use Contact for abuse reports, account access issues, and policy/privacy questions.
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
