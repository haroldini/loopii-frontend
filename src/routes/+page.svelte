
<script>
    import { initPeerStore, peer, peerStatus, handleDecision, fetchPeer } from '$lib/stores/peer.js';
    initPeerStore();
</script>


<svelte:head>
  <title>loopii • Find Loops</title>
</svelte:head>


{#if $peerStatus === 'loading'}
    <p>Loading next profile...</p>

{:else if $peerStatus === 'error' && $peerStatus !== 'empty'}
    <p>Error loading peer.</p>
    <button on:click={fetchPeer}>Retry</button>

{:else if $peerStatus === 'empty'}
    <p>No peers available at the moment.</p>
    <button on:click={fetchPeer}>Refresh</button>

{:else}
    <h2>{$peer.name}</h2>
    <p>{$peer.description}</p>
    <p>Age: {$peer.age}</p>
    <p>Location: {$peer.location}</p>

    <button on:click={() => handleDecision(false)}>Pass</button>
    <button on:click={() => handleDecision(true)}>Connect</button>
{/if}
