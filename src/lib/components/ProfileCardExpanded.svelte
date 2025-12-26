
<script>
    import { createEventDispatcher, onMount } from "svelte";
    import Icon from "@iconify/svelte";
    import { UI_ICONS, platformMap, interestMap } from "$lib/stores/app.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";

    import ProfileMediaCarousel from "$lib/components/ProfileMediaCarousel.svelte";
    import ProfileHeader from "$lib/components/ProfileHeader.svelte";

    import { buildSocialLink } from "$lib/utils/urls.js";
    import { timeAgo } from "$lib/utils/misc.js";
    import { addToast } from "$lib/stores/popups.js";
    
    export let profile;
    export let loop = null;
    export let request = null;

    // Event dispatcher

    const dispatch = createEventDispatcher();

    function toggleFav() {
        dispatch("toggleFav", { loopId: loop.id });
    }

    function unloop() {
        dispatch("unloop", { loopId: loop.id });
    }

    // ===== Dynamic height adjustment for media carousel ======

    const MEDIA_MIN_REM = 5;

    let expandedEl;
    let mediaWrapEl;
    let isConstrained = false;

    function updateExpandedMediaConstraint() {
        if (!expandedEl) return;

        const contentEl = expandedEl.closest(".content");
        if (!contentEl) return;

        const contentRect = contentEl.getBoundingClientRect();
        const wrapRect = mediaWrapEl
            ? mediaWrapEl.getBoundingClientRect()
            : expandedEl.getBoundingClientRect();

        const availableWidth = wrapRect.width;
        const availableHeight = contentRect.height;

        const shouldConstrain = availableHeight > 0 && availableHeight < availableWidth;

        if (shouldConstrain) {
            const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            const minSize = MEDIA_MIN_REM * rootFontSize;

            const maxThatFits = Math.max(0, Math.min(availableWidth, availableHeight));
            const finalSize = Math.floor(Math.max(minSize, maxThatFits));

            expandedEl.style.setProperty("--profile-media-size", `${finalSize}px`);
            isConstrained = true;
        } else {
            expandedEl.style.removeProperty("--profile-media-size");
            isConstrained = false;
        }
    }

    onMount(() => {
        updateExpandedMediaConstraint();

        if (typeof ResizeObserver === "undefined") return;

        const contentEl = expandedEl.closest(".content");
        if (!contentEl) return;

        const ro = new ResizeObserver(() => {
            updateExpandedMediaConstraint();
        });

        ro.observe(contentEl);
        if (mediaWrapEl) ro.observe(mediaWrapEl);

        return () => {
            ro.disconnect();
        };
    });

    // Derived data

    $: socialPlatforms =
        profile?.socials?.map((s) => ({
            ...s,
            platform: $platformMap[s.platform_id] || null,
    })) || [];

    $: displayName = profile?.name || profile?.username;

    // UI Functions

    let lastCopied = null;
    let resetTimer = null;

    function markCopied(key) {
        lastCopied = key;

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            lastCopied = null;
        }, 2000);
    }

    async function copyUrl(event, social) {
        event.stopPropagation();

        const url = buildSocialLink(social, $platformMap);
        if (!url) return;

        await navigator.clipboard.writeText(url);
        markCopied(url);

        addToast({
            text: "Profile URL copied to clipboard.",
            autoHideMs: 2000
        });
    }

    async function copyUsername(event, social) {
        event.stopPropagation();

        if (!social.handle) return;

        await navigator.clipboard.writeText(social.handle);
        markCopied(social.handle);

        addToast({
            text: "Username copied to clipboard.",
            autoHideMs: 2000
        });
    }

</script>


<div
    class="profile-expanded"
    class:profile-expanded--constrained={isConstrained}
    bind:this={expandedEl}
>
    <div class="profile-expanded__media-wrap" bind:this={mediaWrapEl}>
        {#key profile?.id}
            <ProfileMediaCarousel
                images={profile?.images}
                fallbackUrl={getAvatarUrl(profile)}
                alt={`Photos of ${displayName}`}
            />
        {/key}
    </div>

    <div class="gutter">

        <!-- Header section (same as unexpanded ProfileCard) -->
        <div class="profile-block">
            <ProfileHeader {profile} />
        </div>

        <!-- Bio section -->
        {#if profile.audio?.url || profile.bio || profile.looking_for || profile.interests?.length}
            <div class="profile-block profile-section">
                {#if profile.bio}
                    <h4>Bio</h4>
                    <p class="bio">{profile.bio}</p>
                {/if}

                {#if profile.looking_for}
                    <h4>Looking for</h4>
                    <p class="bio">{profile.looking_for}</p>
                {/if}

                {#if profile.interests?.length}
                    <h4>Interests</h4>
                    <div class="tags">
                        {#each profile.interests as interestId}
                            <span class="tag">{$interestMap[interestId] || interestId}</span>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Socials section -->
        {#if profile.socials?.length}
            <div class="profile-block profile-section">
                <h3 class="text-accent text-center">Socials</h3>
                <div class="socials-list">
                    {#each socialPlatforms as social}
                        {#if buildSocialLink(social, $platformMap)}
                            {#if $platformMap[social.platform_id]}
                                <div
                                    class="btn social-row"
                                    role="button"
                                    tabindex="0"
                                    on:click={() => {
                                        const url = buildSocialLink(social, $platformMap);
                                        if (url) window.open(url, "_blank", "noopener,noreferrer");
                                    }}
                                    on:keydown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            const url = buildSocialLink(social, $platformMap);
                                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                                        }
                                    }}
                                >
                                        <Icon
                                            icon={social.platform.icon_url}
                                            class="btn__icon btn__icon--large social-icon--left"
                                            aria-label={social.platform.name}
                                        />

                                    <div class="social-preview">
                                        <span class="social-handle">@{social.handle}</span>
                                    </div>

                                    <div class="social-icons--right">
                                        <button
                                            type="button"
                                            class="btn btn--circle"
                                            title={lastCopied === buildSocialLink(social, $platformMap) ? "Copied" : "Copy profile URL"}
                                            aria-label={lastCopied === buildSocialLink(social, $platformMap) ? "Copied" : "Copy profile URL"}
                                            on:click={(event) => copyUrl(event, social)}
                                        >
                                            <Icon
                                                icon={
                                                    lastCopied === buildSocialLink(social, $platformMap)
                                                        ? UI_ICONS.check
                                                        : UI_ICONS.link
                                                }
                                                class={
                                                    "btn__icon " +
                                                    (lastCopied === buildSocialLink(social, $platformMap)
                                                        ? "text-success"
                                                        : "")
                                                }
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn--circle"
                                            title={lastCopied === social.handle ? "Copied" : "Copy username"}
                                            aria-label={lastCopied === social.handle ? "Copied" : "Copy username"}
                                            on:click={(event) => copyUsername(event, social)}
                                        >
                                            <Icon
                                                icon={
                                                    lastCopied === social.handle
                                                        ? UI_ICONS.check
                                                        : UI_ICONS.at
                                                }
                                                class={
                                                    "btn__icon " +
                                                    (lastCopied === social.handle
                                                        ? "text-success"
                                                        : "")
                                                }
                                            />
                                        </button>
                                    </div>
                                </div>
                            {/if}
                        {/if}
                    {/each}
                </div>
            </div>
        {/if}

       <!-- Loops section -->
        {#if profile.loop_bio}
            <div class="profile-block profile-section">            
                <h4 class="text-accent">Loops-only Bio</h4>
                <p class="bio">{profile.loop_bio}</p>
            </div>
        {/if}

        {#if loop}
            <div class="profile-block profile-section">
                <div class="actionbar">
                    <button
                    type="button"
                    class="btn btn--toggle btn--large"
                    aria-pressed={loop.is_favourite}
                    on:click={toggleFav}
                    >
                        <Icon icon={loop.is_favourite ? UI_ICONS.starFilled : UI_ICONS.star} class="btn__icon" />
                        <span>{loop.is_favourite ? "Unfavourite" : "Favourite"}</span>
                    </button>
                    
                    <button
                    type="button"
                    class="btn btn--danger btn--large"
                    on:click={unloop}
                        >
                        <Icon icon={UI_ICONS.close} class="btn__icon" />
                        <span>Unloop</span>
                    </button>
                </div>
            </div>
            <div class="profile-block profile-section">
                <p class="text-muted text-center">Looped {timeAgo(loop.created_at)}</p>
            </div>
        {:else if request}
            <div class="profile-block profile-section">
                <p class="text-muted text-center">Requested {timeAgo(request.created_at)}</p>
            </div>
        {/if}
    </div>        
</div>
