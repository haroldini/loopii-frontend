
<script>
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
                <h3>loopii</h3>
            </div>

            <div class="bar__actions">
                <button
                    type="button"
                    class="btn btn--ghost"
                    on:click={refreshPeerStore}
                    disabled={$peerStatus === "loading"}
                >
                    {$peerStatus === "loading" ? "Loading…" : "Refresh"}
                </button>

                <button
                    type="button"
                    class="btn btn--ghost"
                    on:click={() => goto("/profile/search-preferences")}
                >
                    Preferences
                </button>
            </div>
        </div>
    </header>

    <div class="content stack" class:content--scroll={expanded}>
        {#if $peerStatus === "loading"}
            <div class="gutter gutter-vertical">
                <p class="text-hint">Loading next profile…</p>
            </div>
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
                        <p class="text-hint">Update your visibility settings to see other profiles.</p>
                    </div>
                </div>
            </div>
        {:else if $peerStatus === "empty"}
            <div class="gutter gutter-vertical">
                <div class="card">
                    <div class="section stack">
                        <p>We couldn't find any matching profiles.</p>
                        <p class="text-hint">Try refreshing or expanding your search preferences.</p>
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
                        class="btn btn--ghost"
                        on:click={() => {
                            handleDecision(false);
                            if (expanded) close();
                        }}
                    >
                        Skip
                    </button>

                    <button
                        type="button"
                        class="btn btn--primary"
                        on:click={() => {
                            handleDecision(true);
                            if (expanded) close();
                        }}
                    >
                        Like
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>
