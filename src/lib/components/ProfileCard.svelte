
<script>
    import { createEventDispatcher } from "svelte";
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

    $: genderMeta =
        GENDER_ICONS[profile?.gender?.toLowerCase?.()] || GENDER_ICONS.other;

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
    class="profile-card pressable"
    role="button"
    tabindex="0"
    aria-label="Open profile"
    on:click={open}
    on:keydown={handleKey}
>
    <ProfileMediaCarousel
        images={profile.images}
        fallbackUrl={getAvatarUrl(profile)}
        alt={`Photos of ${displayName}`}
    />

    <div class="profile-card__body">
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


