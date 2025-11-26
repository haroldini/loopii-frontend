
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


<div class="container bordered">
    <nav>
        <button on:click={refreshPeerStore}>Refresh</button>
        <button on:click={() => goto("/profile/search-preferences")}>Edit Preferences</button>
    </nav>
    {$peerStatus}
</div>


<div class="container bordered">
    
    {#if $peerStatus === "loading"}
        <p>Loading next profile...</p>

    {:else if $peerStatus === "error"}
        <p>An error occurred while loading the feed. Please try refreshing.</p>

    {:else if $peerStatus === "hidden"}
        <p>Your profile is hidden. Update your visibility settings to see other profiles.</p>

    {:else if $peerStatus === "empty"}
        <p>We couldn't find any matching profiles. Try refreshing or expanding your search preferences.</p>

    {:else if expanded}
        <ProfileCardExpanded profile={$peer} onAvatarClick={close} />
        <nav>
            <button style="flex:1;" on:click={() => {handleDecision(false); close()}}>Pass</button>
            <button style="flex:1;" on:click={() => {handleDecision(true); close()}}>Connect</button>
        </nav>

    {:else}
        <ProfileCard profile={$peer} on:expand={open} />
        <nav>
            <button style="flex:1;" on:click={() => handleDecision(false)}>Pass</button>
            <button style="flex:1;" on:click={() => handleDecision(true)}>Connect</button>
        </nav>
    {/if}
</div>
