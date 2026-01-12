
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

    <div class="content stack">
        <div class="section stack">
            <h3>1) Basics</h3>
            <div class="card card--panel" role="region" aria-label="Basics">
                <div class="section stack">
                    <p>
                        loopii is a discovery app. You can browse profiles, make mutual connections, and then connect
                        off-platform using socials you choose to list.
                    </p>

                    <p>
                        By using loopii, you agree to these Terms. If you don't agree, don't use the service.
                    </p>

                    <p class="text-hint">
                        If something is unclear, treat the strictest reasonable interpretation as the rule.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>2) Eligibility and account integrity</h3>
            <div class="card card--panel" role="region" aria-label="Eligibility and account integrity">
                <div class="section stack">
                    <ol>
                        <li>
                            <strong>18+ only.</strong> You must be 18+ (or the age of legal adulthood where you live).
                            Accounts suspected to belong to minors may be restricted or removed.
                        </li>
                        <li>
                            <strong>Accurate account info.</strong> Provide accurate information where required.
                            Don't misrepresent your identity or age.
                        </li>
                        <li>
                            <strong>One person, one account (generally).</strong> Multiple accounts are not allowed
                            where they are used to evade enforcement, harass others, spam, or manipulate discovery.
                        </li>
                        <li>
                            <strong>Password hygiene.</strong> Don't reuse a password you use on any other platform.
                            Use a unique password and keep it private.
                        </li>
                    </ol>

                    <p class="text-hint">
                        We may act on suspicion (not just proof) where safety or integrity is at risk.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>3) User content and profile rules</h3>
            <div class="card card--panel" role="region" aria-label="User content and profile rules">
                <div class="section stack">
                    <p>
                        These rules apply to all user content: photos, voice intros, bios, names, locations, usernames,
                        and any other text or media you upload or display on loopii.
                    </p>

                    <ol>
                        <li>
                            <strong>No sexual / pornographic content.</strong> Don't post explicit sexual content,
                            pornography, or sexually exploitative content.
                        </li>
                        <li>
                            <strong>No AI-generated or misleading content.</strong> Don't use AI-generated images
                            or other content designed to mislead people about who you are, what you look like, or what
                            you are offering.
                        </li>
                        <li>
                            <strong>No promotion of adult platforms.</strong> Don't promote adult platforms,
                            escorting, or any link pages that route to adult content.
                        </li>
                        <li>
                            <strong>No hate or harassment.</strong> Don't post hate, harassment, targeted abuse,
                            slurs, or demeaning content aimed at a person or protected group.
                        </li>
                        <li>
                            <strong>No threats or violence.</strong> Don't threaten harm, glorify violence, or
                            encourage violence.
                        </li>
                        <li>
                            <strong>No illegal activity.</strong> Don't post illegal content or solicit illegal
                            services (including attempts to buy/sell illegal goods).
                        </li>
                        <li>
                            <strong>No self-harm content.</strong> Don't post content that encourages self-harm or
                            suicide, or that is intended to shock/trigger others.
                        </li>
                    </ol>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>4) Socials and off-platform linking</h3>
            <div class="card card--panel" role="region" aria-label="Socials and off-platform linking">
                <div class="section stack">
                    <p>
                        loopii is built around off-platform contact. That only works if people can trust the socials
                        shown after matching.
                    </p>

                    <ol>
                        <li>
                            <strong>Only list socials you own or control.</strong> Don't list socials that belong
                            to someone else, a third party, or a brand you don't control.
                        </li>
                        <li>
                            <strong>No fake socials.</strong> If your listed socials aren't yours, we may restrict
                            your account or remove your profile.
                        </li>
                        <li>
                            <strong>No impersonation.</strong> Don't impersonate a real person or pretend to be
                            affiliated with someone/something you aren't.
                        </li>
                        <li>
                            <strong>No scams or phishing.</strong> Don't attempt to deceive users to send money,
                            click malicious links, share verification codes, or reveal private information.
                        </li>
                        <li>
                            <strong>No marketing or lead-gen.</strong> Don't use loopii primarily for advertising,
                            funnels, “DM me for…”, or paid promotions.
                        </li>
                    </ol>

                    <p>
                        <strong>Security tip:</strong> Consider keeping linked socials private or locked (where the platform
                        supports it) for an added layer of safety, especially if you are concerned about impersonators or bots.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>5) Platform misuse and manipulation</h3>
            <div class="card card--panel" role="region" aria-label="Platform misuse and manipulation">
                <div class="section stack">
                    <ol>
                        <li>
                            <strong>No bots / automation.</strong> Don't use bots, scripts, automation, or other
                            tooling to interact with the feed, requests, loops, or reporting.
                        </li>
                        <li>
                            <strong>No manipulation.</strong> Don't attempt to artificially boost visibility,
                            spam requests, or interfere with how discovery works.
                        </li>
                        <li>
                            <strong>No multiple accounts for abuse.</strong> Multiple accounts used for harassment,
                            spam, ban evasion, or manipulation are not allowed.
                        </li>
                        <li>
                            <strong>No guaranteed bot-free experience.</strong> We work to detect and remove bots, scams,
                            and abusive accounts, but we can't guarantee 100% removal. Use due diligence and report concerns.
                        </li>
                    </ol>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>6) Reporting and safety</h3>
            <div class="card card--panel" role="region" aria-label="Reporting and safety">
                <div class="section stack">
                    <p>
                        If you see something that looks unsafe or against these Terms, report it.
                    </p>

                    <ol>
                        <li>
                            <strong>How to report:</strong> You can report users from their profile page using the
                            Report button.
                        </li>
                        <li>
                            <strong>When to report:</strong> Report content or behaviour you suspect to be against these Terms.
                        </li>
                        <li>
                            <strong>False or abusive reporting:</strong> Don't file reports to harass people or as
                            retaliation. We may restrict accounts that abuse reporting.
                        </li>
                    </ol>

                    <p class="text-hint">
                        If you feel in immediate danger, contact local emergency services. loopii is not an emergency service.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>7) Moderation, enforcement, and appeals</h3>
            <div class="card card--panel" role="region" aria-label="Moderation, enforcement, and appeals">
                <div class="section stack">
                    <p>
                        We may take action to enforce these Terms, protect users, and protect the service.
                    </p>

                    <ol>
                        <li>
                            <strong>Actions we may take</strong> include: removing content, restricting features, warning accounts,
                            temporarily banning accounts, permanently banning accounts, and deleting accounts or profiles.
                        </li>
                        <li>
                            <strong>We can act on suspicion.</strong> We may act based on suspected violations, risk signals,
                            or credible reports, even if we can't prove every detail.
                        </li>
                        <li>
                            <strong>No guarantee of notice.</strong> We may or may not notify you before or after we take action,
                            and we may remove content without warning.
                        </li>
                        <li>
                            <strong>Context matters.</strong> We consider severity, frequency, intent, and user safety.
                            Some violations result in immediate bans.
                        </li>
                        <li>
                            <strong>Appeals.</strong> If your account is restricted, banned, or content is removed, you can appeal
                            by contacting support via the Contact page. We may request information to verify ownership or context.
                        </li>
                    </ol>

                    <p class="text-hint">
                        You can delete your account from <strong>/settings</strong>.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>8) Privacy, security, and risk</h3>
            <div class="card card--panel" role="region" aria-label="Privacy, security, and risk">
                <div class="section stack">
                    <ol>
                        <li>
                            <strong>No system is 100% breach-proof.</strong> We take security seriously, but you accept that
                            no online service can guarantee absolute security. Use a unique password and avoid sharing sensitive
                            personal information in your profile.
                        </li>
                        <li>
                            <strong>Treat uploads as potentially public.</strong> Anything you upload (including “loops-only” content)
                            may be seen, copied, recorded, screenshotted, or shared by others. Anyone you loop with can see content
                            made available after matching. If you are deceived, content you shared may be reposted publicly.
                        </li>
                        <li>
                            <strong>Use due diligence.</strong> Choose who you loop with carefully. We can't guarantee 100%
                            removal of bots or scam accounts, and we can't control what users do off-platform.
                        </li>
                    </ol>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>9) Off-platform interactions and responsibility</h3>
            <div class="card card--panel" role="region" aria-label="Off-platform interactions and responsibility">
                <div class="section stack">
                    <p>
                        After you connect off-platform, your interactions are governed by those platforms and your own choices.
                        loopii is not responsible for what happens in DMs, calls, meetups, payments, or other third-party services.
                    </p>

                    <ol>
                        <li>
                            <strong>Use common sense.</strong> Don't send money to strangers, don't share verification codes,
                            and don't click suspicious links.
                        </li>
                        <li>
                            <strong>Meet safely.</strong> If you meet in person, meet in public, tell a friend, and take reasonable precautions.
                        </li>
                    </ol>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>10) Retention, dormancy, and product behaviour</h3>
            <div class="card card--panel" role="region" aria-label="Retention, dormancy, and product behaviour">
                <div class="section stack">
                    <ol>
                        <li>
                            <strong>Dormant accounts.</strong> Dormant accounts and associated media may be routinely removed
                            to reduce storage and keep the service healthy.
                        </li>
                        <li>
                            <strong>Decisions can expire.</strong> Decisions may expire after a period
                            of time. This means you may see the same profile again in your feed after some time.
                        </li>
                    </ol>

                    <p class="text-hint">
                        If you want to keep an account active, log in periodically and keep your profile up to date.
                    </p>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>11) Availability, changes, and termination</h3>
            <div class="card card--panel" role="region" aria-label="Availability, changes, and termination">
                <div class="section stack">
                    <ol>
                        <li>
                            <strong>Service changes.</strong> We may modify, suspend, or discontinue parts of loopii at any time.
                        </li>
                        <li>
                            <strong>Account termination.</strong> We may terminate or restrict access to the service at any time
                            for violations, risk, safety, or integrity reasons.
                        </li>
                        <li>
                            <strong>Terms updates.</strong> We may update these Terms. Continued use means you accept the updated Terms.
                        </li>
                    </ol>
                </div>
            </div>
        </div>

        <div class="section stack">
            <h3>12) Contact</h3>
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
                        Use Contact for abuse reports, account access issues, appeals, or policy questions.
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
