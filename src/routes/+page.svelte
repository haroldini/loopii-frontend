
<script>
    import { initPeerStore, peer, peerStatus, handleDecision } from "$lib/stores/feed.js";
    import ProfileCard from "$lib/components/ProfileCard.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

    // Initialize the peer store (fetches batch + sets first peer)
    if ($peerStatus === "unloaded") {
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


<div style="max-width:400px; margin:2rem auto; padding:1rem; border:1px solid #ccc; border-radius:8px; text-align:center;">
    {#if $peerStatus === "loading"}
        <p>Loading next profile...</p>

    {:else if $peerStatus === "error" && $peerStatus !== "empty"}
        <p>Error loading peer.</p>
        <button on:click={initPeerStore}>Retry</button>

    {:else if $peerStatus === "empty"}
        <p>No peers available at the moment.</p>
        <button on:click={initPeerStore}>Refresh</button>

    {:else if expanded}
        <ProfileCardExpanded profile={$peer} onBack={close} />
        <div style="margin-top:1rem; display:flex; justify-content:space-between; gap:0.5rem;">
            <button style="flex:1;" on:click={() => {handleDecision(false); close()}}>Pass</button>
            <button style="flex:1;" on:click={() => {handleDecision(true); close()}}>Connect</button>
        </div>

    {:else}
        <ProfileCard profile={$peer} on:expand={open} />
        <div style="margin-top:1rem; display:flex; justify-content:space-between; gap:0.5rem;">
            <button style="flex:1;" on:click={() => handleDecision(false)}>Pass</button>
            <button style="flex:1;" on:click={() => handleDecision(true)}>Connect</button>
        </div>
    {/if}
</div>
