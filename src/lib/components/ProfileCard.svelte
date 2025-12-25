
<script>
    import { createEventDispatcher, onMount } from "svelte";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { interestMap, countryMap, GENDER_ICONS } from "$lib/stores/app.js";
    import { profile as profileStore } from "$lib/stores/profile.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";
    import {
        timeAgo,
        distanceKm,
        formatLastSeenShort,
        formatNumber,
        formatStarSign,
        computeDistanceLabel
    } from "$lib/utils/misc.js";
    import ProfileMediaCarousel from "$lib/components/ProfileMediaCarousel.svelte";
    import AudioPicker from "$lib/components/AudioPicker.svelte";

    export let profile;

    const dispatch = createEventDispatcher();

    function open() {
        dispatch("expand");
    }

    function handleKey(e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
        }
    }

    // Dynamic height adjustment for constrained cards
    let cardEl;
    let bodyEl;
    let isConstrained = false;
    const MEDIA_MIN_REM = 10;

    function updateMediaConstraint() {
        if (!cardEl || !bodyEl) return;

        const cardRect = cardEl.getBoundingClientRect();
        const bodyRect = bodyEl.getBoundingClientRect();

        const availableHeight = cardRect.height - bodyRect.height;
        const availableWidth = cardRect.width;

        const shouldConstrain = availableHeight > 0 && availableHeight < availableWidth;

        if (shouldConstrain) {
            const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            const minSize = MEDIA_MIN_REM * rootFontSize;

            const maxThatFits = Math.max(0, Math.min(availableWidth, availableHeight));
            const finalSize = Math.floor(Math.max(minSize, maxThatFits));

            cardEl.style.setProperty("--profile-media-size", `${finalSize}px`);
            isConstrained = true;
        } else {
            cardEl.style.removeProperty("--profile-media-size");
            isConstrained = false;
        }
    }

    onMount(() => {
        updateMediaConstraint();

        if (typeof ResizeObserver === "undefined") return;

        const ro = new ResizeObserver(() => {
            updateMediaConstraint();
        });

        ro.observe(cardEl);
        ro.observe(bodyEl);

        return () => {
            ro.disconnect();
        };
    });    

    $: genderKey = profile?.gender?.toLowerCase?.() || "other";
    $: genderIcon = GENDER_ICONS[genderKey] || GENDER_ICONS.other;

    $: lastSeenDate = profile?.last_seen_at
        ? new Date(profile.last_seen_at)
        : null;

    $: isOnline =
        lastSeenDate &&
        Date.now() - lastSeenDate.getTime() <= 10 * 60 * 1000;

    $: distanceLabel = computeDistanceLabel(profile, $profileStore);

    $: displayName = profile?.name || profile?.username;
    $: hasSeparateUsername =
        profile?.name && profile?.username && profile.name !== profile.username;

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
</script>


<div
    class="profile-card ui-pressable"
    class:profile-card--constrained={isConstrained}
    bind:this={cardEl}
    role="button"
    tabindex="0"
    aria-label="Open profile"
    on:click={open}
    on:keydown={handleKey}
>
    {#key profile?.id}
        <ProfileMediaCarousel
            images={profile?.images}
            fallbackUrl={getAvatarUrl(profile)}
            alt={`Photos of ${displayName}`}
        />
    {/key}

    <div class="gutter">
        <div class="profile-block" bind:this={bodyEl}>
            <div class="profile__header-main">
                <div class="profile__header-left">
                    <div class="profile__header-top-left">
                        {#if profile.last_seen_at}
                            <div class={"pill " + (isOnline ? "pill--online" : "")}>
                                {#if isOnline}
                                    <Icon icon={UI_ICONS.online} class="btn__icon" />
                                    <span class="pill__label">Online</span>
                                {:else}
                                    <Icon icon={UI_ICONS.offline} class="btn__icon" />
                                    <span class="pill__label">{formatLastSeenShort(lastSeenDate)}</span>
                                {/if}
                            </div>
                        {/if}
                        <h2>{displayName}</h2>

                        {#if hasSeparateUsername}
                            <p class="text-muted">@{profile.username}</p>
                        {/if}
                    </div>


                    {#if profile.star_sign || profile.mbti}
                        <div class="tags">
                            {#if profile.star_sign}
                                <span class="tag">{formatStarSign(profile.star_sign)}</span>
                            {/if}
                            {#if profile.mbti}
                                <span class="tag">{profile.mbti}</span>
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

                <div class="profile__header-right">
                    <div class="profile__right-top">
                        <div class="profile__header-right-main">
                            <span class="text-fw-semibold">{profile.age}</span>
                            <Icon
                                icon={genderIcon}
                                class={"gender-icon--" + genderKey}
                            />
                            {#if $countryMap[profile.country_id]?.flag_icon}
                                <Icon icon={$countryMap[profile.country_id].flag_icon} />
                            {/if}
                        </div>

                        {#if profile.location}
                            <p class="text-muted text-italic">{profile.location}</p>
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
    </div>
</div>
