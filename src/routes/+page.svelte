
<script>
    import { initProfileStore, profile, profileStatus, handleDecision, fetchProfile } from '$lib/stores/profile.js';
    initProfileStore();
</script>


<svelte:head>
  <title>loopii • Find Loops</title>
</svelte:head>


{#if $profileStatus === 'loading'}
    <p>Loading profile...</p>

{:else if $profileStatus === 'error' && $profileStatus !== 'empty'}
    <p>Error loading profile.</p>
    <button on:click={fetchProfile}>Retry</button>

{:else if $profileStatus === 'empty'}
    <p>No profiles available at the moment.</p>
    <button on:click={fetchProfile}>Refresh</button>

{:else}
    <h2>{$profile.name}</h2>
    <p>{$profile.description}</p>
    <p>Age: {$profile.age}</p>
    <p>Location: {$profile.location}</p>

    <button on:click={() => handleDecision(false)}>Pass</button>
    <button on:click={() => handleDecision(true)}>Connect</button>
{/if}
