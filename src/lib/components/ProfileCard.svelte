
<script>
    import { createEventDispatcher, onMount } from "svelte";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";

    import ProfileMediaCarousel from "$lib/components/ProfileMediaCarousel.svelte";
    import ProfileHeader from "$lib/components/ProfileHeader.svelte";

    export let profile;

    // Event dispatcher

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

    // ===== Dynamic height adjustment for media carousel ======

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

    // Derived data

    $: displayName = profile?.name || profile?.username;

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
            <ProfileHeader {profile} />
        </div>
    </div>
</div>
