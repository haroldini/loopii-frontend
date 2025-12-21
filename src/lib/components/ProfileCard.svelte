
<script>
    import { createEventDispatcher, onMount } from "svelte";
    import Icon from "@iconify/svelte";
    import { interestMap, countryMap, GENDER_ICONS } from "$lib/stores/app.js";
    import { profile as profileStore } from "$lib/stores/profile.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";
    import {
        timeAgo,
        formatLastSeenShort,
        computeDistanceLabel
    } from "$lib/utils/misc.js";
    import ProfileMediaCarousel from "$lib/components/ProfileMediaCarousel.svelte";

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

    $: visibleInterests = profile?.interests?.slice?.(0, 10) || [];
    $: extraInterestCount = Math.max(
        (profile?.interests?.length || 0) - visibleInterests.length,
        0
    );

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
        <div class="profile-card__body" bind:this={bodyEl}>
            <div class="profile-card__top">
                <div class="profile-card__left">
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

                <div class="profile-card__right">
                    <div class="profile-card__right-main">
                        <span class="profile-card__age">{profile.age}</span>

                        <Icon
                            icon={genderIcon}
                            class={"gender-icon gender-icon--" + genderKey}
                        />

                        {#if $countryMap[profile.country_id]?.flag_icon}
                            <Icon
                                icon={$countryMap[profile.country_id].flag_icon}
                                class="profile-flag"
                            />
                        {/if}
                    </div>

                    {#if profile.location}
                        <p class="profile-card__location">{profile.location}</p>
                    {/if}
                </div>
            </div>

            {#if hasSeparateUsername}
                <p class="profile-card__username">@{profile.username}</p>
            {/if}

            {#if visibleInterests.length}
                <div class="tags">
                    {#each visibleInterests as interestId}
                        <span class="tag">
                            {$interestMap[interestId] || interestId}
                        </span>
                    {/each}
                    {#if extraInterestCount > 0}
                        <span class="tag more">+{extraInterestCount} more</span>
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
    </div>
</div>
