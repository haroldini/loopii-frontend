
<script>
    import { createEventDispatcher, onMount } from "svelte";
    import {
        interestMap,
        platformMap,
        countryMap,
        GENDER_ICONS
    } from "$lib/stores/app.js";
    import { profile as profileStore } from "$lib/stores/profile.js";

    import AudioPicker from "$lib/components/AudioPicker.svelte";
    import ProfileMediaCarousel from "$lib/components/ProfileMediaCarousel.svelte";
    import { buildSocialLink } from "$lib/utils/urls.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";
    import {
        timeAgo,
        distanceKm,
        formatLastSeenShort,
        formatNumber,
        formatStarSign,
        computeDistanceLabel
    } from "$lib/utils/misc.js";

    export let profile;
    export let onAvatarClick = null;
    export let loop = null;

    const dispatch = createEventDispatcher();

    function toggleFav() {
        dispatch("toggleFav", { loopId: loop.id });
    }

    function unloop() {
        dispatch("unloop", { loopId: loop.id });
    }

    $: genderMeta =
        GENDER_ICONS[profile?.gender?.toLowerCase?.()] || GENDER_ICONS.other;

    $: displayName = profile?.name || profile?.username;
    $: hasSeparateUsername =
        profile?.name && profile?.username && profile.name !== profile.username;

    $: lastSeenDate = profile?.last_seen_at
        ? new Date(profile.last_seen_at)
        : null;

    $: isOnline =
        lastSeenDate &&
        Date.now() - lastSeenDate.getTime() <= 10 * 60 * 1000;

    $: distanceLabel = computeDistanceLabel(profile, $profileStore);

    $: metaItems = [];
    $: {
        metaItems = [];
        if (profile) {
            const countryName = $countryMap[profile.country_id]?.name;
            if (countryName) metaItems.push(countryName);

            if (profile.created_at) {
                metaItems.push(`Joined ${timeAgo(profile.created_at)}`);
            }

            if (distanceLabel) metaItems.push(distanceLabel);
        }
    }

    // Dynamic height adjustment for media carousel
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

</script>


<div
    class="profile-expanded"
    class:profile-expanded--constrained={isConstrained}
    bind:this={expandedEl}
>
    <div class="profile-expanded__media-wrap" bind:this={mediaWrapEl}>
        <ProfileMediaCarousel
            images={profile.images}
            fallbackUrl={getAvatarUrl(profile)}
            alt={`Photos of ${displayName}`}
        />

        {#if onAvatarClick}
            <button
                type="button"
                class="profile-expanded__close"
                aria-label="Close expanded profile view"
                on:click={onAvatarClick}
            >
                ✕
            </button>
        {/if}
    </div>

    <div class="gutter">
        <div class="profile-block">
            <div class="profile-expanded__header-main">
                <div class="profile-expanded__header-left">
                    <div>
                        <h2 class="profile-card__name">{displayName}</h2>

                        {#if profile.last_seen_at}
                            <div class={"pill " + (isOnline ? "pill--online" : "")}>
                                <span class="status-dot"></span>
                                {#if isOnline}
                                    <span>Online</span>
                                {:else}
                                    <span>{formatLastSeenShort(lastSeenDate)}</span>
                                {/if}
                            </div>
                        {/if}
                    </div>

                    {#if hasSeparateUsername}
                        <p class="profile-card__username">@{profile.username}</p>
                    {/if}

                    {#if profile.star_sign || profile.mbti}
                        <div class="traits-row">
                            {#if profile.star_sign}
                                <span class="trait-pill">{formatStarSign(profile.star_sign)}</span>
                            {/if}
                            {#if profile.mbti}
                                <span class="trait-pill">{profile.mbti}</span>
                            {/if}
                        </div>
                    {/if}

                    {#if metaItems.length}
                        <div class="meta-row">
                            {#each metaItems as item, i}
                                {#if i > 0}
                                    <span class="meta-separator">•</span>
                                {/if}
                                <span class="meta-item">{item}</span>
                            {/each}
                        </div>
                    {/if}
                </div>

                <div class="profile-expanded__header-right">
                    <div class="profile-expanded__right-top">
                        <div class="profile-card__right-main">
                            <span class="profile-card__age">{profile.age}</span>

                            <span
                                class="gender-icon"
                                style={`--icon-url: url('${genderMeta.icon}'); --icon-color: ${genderMeta.color};`}
                            ></span>

                            {#if $countryMap[profile.country_id]?.flag_url}
                                <img
                                    src={$countryMap[profile.country_id].flag_url}
                                    alt="Country flag"
                                    class="profile-flag"
                                />
                            {/if}
                        </div>

                        {#if profile.location}
                            <p class="profile-card__location">{profile.location}</p>
                        {/if}
                    </div>

                    {#if profile.audio?.url}
                        <div class="voice-intro-inline">
                            <AudioPicker
                                audio={profile.audio.url}
                                maxDuration={30}
                                recordable={false}
                                disabled={false}
                                previewLabel="Voice intro"
                            />
                        </div>
                    {/if}
                </div>
            </div>
        </div>

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

        {#if profile.loop_bio || profile.socials?.length}
            <div class="profile-block profile-section">
                <h3>Loops-only</h3>

                {#if profile.loop_bio}
                    <h4>Loop bio</h4>
                    <p class="bio">{profile.loop_bio}</p>
                {/if}

                {#if profile.socials?.length}
                    <h4>Socials</h4>
                    <div class="socials-list">
                        {#each profile.socials as social}
                            {#if buildSocialLink(social, $platformMap)}
                                {#if $platformMap[social.platform_id]}
                                    <div
                                        class="social-row"
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
                                        <div class="social-icon">
                                            {#if $platformMap[social.platform_id].icon_url}
                                                <img
                                                    src={$platformMap[social.platform_id].icon_url}
                                                    alt={$platformMap[social.platform_id].name}
                                                    loading="lazy"
                                                />
                                            {:else}
                                                <div class="social-icon-placeholder">
                                                    {$platformMap[social.platform_id].name?.[0] || "?"}
                                                </div>
                                            {/if}
                                        </div>

                                        <div class="social-preview">
                                            <span class="social-handle">@{social.handle}</span>
                                        </div>

                                        <div class="copy-buttons">
                                            <button
                                                type="button"
                                                class="copy-btn"
                                                title="Copy profile URL"
                                                on:click={(event) => {
                                                    event.stopPropagation();
                                                    const url = buildSocialLink(social, $platformMap);
                                                    navigator.clipboard.writeText(url);
                                                }}
                                            >
                                                🌐
                                            </button>

                                            <button
                                                type="button"
                                                class="copy-btn"
                                                title="Copy username"
                                                on:click={(event) => {
                                                    event.stopPropagation();
                                                    navigator.clipboard.writeText(social.handle);
                                                }}
                                            >
                                                @
                                            </button>
                                        </div>
                                    </div>
                                {:else}
                                    <div class="social-row">
                                        <div class="social-icon">
                                            <div class="social-icon-placeholder">?</div>
                                        </div>

                                        <div class="social-preview">
                                            <span class="social-handle">Unknown Platform</span>
                                        </div>
                                    </div>
                                {/if}
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}

        {#if loop}
            <div class="profile-block">
                <p class="text-muted">Looped {timeAgo(loop.created_at)}</p>

                <div class="actions actions--center">
                    <button
                        type="button"
                        class="btn btn--toggle"
                        aria-pressed={loop.is_favourite}
                        on:click={toggleFav}
                    >
                        ★ {loop.is_favourite ? "Favourited" : "Favourite"}
                    </button>

                    <button
                        type="button"
                        class="btn btn--danger"
                        on:click={unloop}
                    >
                        ✕ Remove Loop
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>
