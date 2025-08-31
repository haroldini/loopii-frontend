<script>
    import { initPeerStore, peer, peerStatus, handleDecision } from '$lib/stores/feed.js';

    // Initialize the peer store (fetches batch + sets first peer)
    initPeerStore();
</script>

<svelte:head>
  <title>loopii • Find Loops</title>
</svelte:head>

<div style="max-width:400px; margin:2rem auto; padding:1rem; border:1px solid #ccc; border-radius:8px; text-align:center;">
    
    {#if $peerStatus === 'loading'}
        <p>Loading next profile...</p>

    {:else if $peerStatus === 'error' && $peerStatus !== 'empty'}
        <p>Error loading peer.</p>
        <button on:click={initPeerStore}>Retry</button>

    {:else if $peerStatus === 'empty'}
        <p>No peers available at the moment.</p>
        <button on:click={initPeerStore}>Refresh</button>

    {:else}
        <h2 style="margin-bottom:0.5rem;">{$peer.name}</h2>
        <p>{$peer.description}</p>
        <p>Age: {$peer.age}</p>
        <p>Location: {$peer.location}</p>

        <div style="margin-top:1rem; display:flex; justify-content:space-between; gap:0.5rem;">
            <button style="flex:1;" on:click={() => handleDecision(false)}>Pass</button>
            <button style="flex:1;" on:click={() => handleDecision(true)}>Connect</button>
        </div>
    {/if}

</div>
