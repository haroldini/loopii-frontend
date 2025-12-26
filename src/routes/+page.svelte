
<script>
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js"; 
    import { goto } from "$app/navigation";
    import { initPeerStore, peer, peerStatus, handleDecision, refreshPeerStore } from "$lib/stores/feed.js";
    import ProfileCard from "$lib/components/ProfileCard.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

    // Initialize the peer store (fetches batch + sets first peer)
    $: if ($peerStatus === "unloaded") {
        initPeerStore();
    }

    let expanded = false;

    function open() {
        expanded = true;
    }

    function close() {
        expanded = false;
    }
</script>


<svelte:head>
    <title>loopii • Find Loops</title>
</svelte:head>


<div class="page page--viewport">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h3>Find Loops</h3>
                <!-- <img src="/logo/logo.png" alt="loopii" class="logo logo--long" /> -->
            </div>

            <div class="bar__actions">
                {#if !expanded}
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        class:is-loading={$peerStatus === "loading"}
                        on:click={refreshPeerStore}
                        disabled={$peerStatus === "loading"}
                        aria-label="Refresh"
                    >
                        <Icon icon={UI_ICONS.refresh} class="btn__icon" />
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                    </button>

                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => goto("/profile/search-preferences")}
                    >
                        <Icon 
                            icon={UI_ICONS.tune}
                            class="btn__icon"
                        />
                    </button>
                {:else}
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={close}
                        aria-label="Close"
                    >
                        <Icon 
                            icon={UI_ICONS.chevronDown}
                            class="btn__icon"
                        />
                    </button>
                {/if}
            </div>
        </div>
    </header>

    <div class="content stack" class:content--scroll={expanded}>
        {#if $peerStatus === "loading"}
            <div class="page__center">
                <Icon 
                    icon={UI_ICONS.animLoading}
                    class="page__icon"
                />
            </div>

        {:else if $peerStatus === "error"}
            <div class="page__center">
                <Icon icon={UI_ICONS.refreshError} class="icon--medium" />
                <p class="text-center u-space-above">We couldn't load your feed right now.</p>
                <p class="text-hint text-center">Please try again in a moment.</p>
            </div>
        {:else if $peerStatus === "hidden"}
            <div class="page__center">
                <Icon icon={UI_ICONS.eyeClose} class="icon--medium" />
                <p class="text-center u-space-above">Your profile is hidden.</p>
                <p class="text-hint text-center">
                    Update your 
                    <a href="/profile/visibility-preferences" class="text-link">visibility preferences</a>
                    to see other profiles.
                </p>
            </div>
        {:else if $peerStatus === "empty"}
            <div class="page__center">
                <Icon icon={UI_ICONS.filtersEmpty} class="icon--medium" />
                <p class="text-center u-space-above">We couldn't find any matching profiles.</p>
                <p class="text-hint text-center">
                    Expand your
                    <a href="/profile/search-preferences" class="text-link">search preferences</a>
                    or try again later.
                </p>
            </div>
        {:else if expanded}
            <ProfileCardExpanded profile={$peer} onAvatarClick={close} />
        {:else}
            <ProfileCard profile={$peer} on:expand={open} />
        {/if}
    </div>

    {#if $peerStatus !== "loading" && $peerStatus !== "error" && $peerStatus !== "hidden" && $peerStatus !== "empty"}
        <div class="bar bar--actionbar">
            <div class="bar__inner">
                <div class="actionbar">
                    <button
                        type="button"
                        class="btn btn--danger btn--mini btn--round"
                        on:click={() => {
                            handleDecision(false);
                            if (expanded) close();
                        }}
                    >
                        <Icon 
				            icon={UI_ICONS.close}
                            class="btn__icon btn__icon--large"
                        />
                    </button>

                    <button
                        type="button"
                        class="btn btn--success btn--mini btn--round"
                        on:click={() => {
                            handleDecision(true);
                            if (expanded) close();
                        }}
                    >
                        <Icon 
				            icon={UI_ICONS.heart}
                            class="btn__icon btn__icon--large"
                        />
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>
