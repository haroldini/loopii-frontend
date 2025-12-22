
<script>
    import Icon from "@iconify/svelte";
    import { goto } from "$app/navigation";
    import { UI_ICONS } from "$lib/stores/app.js"; 
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
                <img src="/logo/logo.png" alt="loopii" class="logo logo--long" />
            </div>

            <div class="bar__actions">
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
            </div>
        </div>
    </header>

    <div class="content stack" class:content--scroll={expanded}>
        {#if $peerStatus === "loading"}
            <Icon 
                icon={UI_ICONS.animLoading}
                class="page__icon"
            />
        {:else if $peerStatus === "error"}
            <div class="gutter gutter-vertical">
                <div class="card">
                    <div class="section stack">
                        <p>An error occurred while loading the feed.</p>
                        <p class="text-hint">Try refreshing.</p>
                    </div>
                </div>
            </div>
        {:else if $peerStatus === "hidden"}
            <div class="gutter gutter-vertical">
                <div class="card">
                    <div class="section stack">
                        <p>Your profile is hidden.</p>
                        <p class="text-hint">
                            Update your 
                            <a href="/profile/visibility-preferences" class="text-link">visibility preferences</a>
                            to see other profiles.
                        </p>
                    </div>
                </div>
            </div>
        {:else if $peerStatus === "empty"}
            <div class="gutter gutter-vertical">
                <div class="card">
                    <div class="section stack">
                        <p>We couldn't find any matching profiles.</p>
                        <p class="text-hint">
                            Try refreshing or expanding your
                            <a href="/profile/search-preferences" class="text-link">search preferences</a>.
                        </p>
                    </div>
                </div>
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
                        class="btn btn--ghost btn--block"
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
                        class="btn btn--primary btn--block"
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
