<svelte:head>
  <title>loopii • Find Loops</title>
</svelte:head>

<script>
    import { onMount } from 'svelte';
    import { getNextProfile, tapProfile } from '$lib/api/profiles.js';
    import { ping } from '$lib/api/utils.js';

    let profile = null;
    let profileStatus = 'loading';

    // Function to fetch the next profile, rejecting or tapping the current one
    async function handleDecision(isAccepted) {
        try {
            if (isAccepted) {
                let response = await tapProfile(profile.id);
                console.log(response);
            }
            profile = await getNextProfile();
            profileStatus = profile ? 'loaded' : 'empty';
        } catch (err) {
            profile = null;
            profileStatus = 'error';
        }
    }

    // Function to fetch a profile
    async function fetchProfile() {
        profileStatus = 'loading';
        try {
            profile = await getNextProfile();
            profileStatus = profile ? 'loaded' : 'empty';
        } catch (err) {
            profile = null;
            profileStatus = 'error';
        }
    }

    // Initial fetch of the first profile
    onMount(() => {
        fetchProfile();
        ping().catch(err => console.error('Ping failed:', err));
    });

</script>

{#if profileStatus === 'loading'}
    <p>Loading profile...</p>

{:else if profileStatus === 'error'}
    <p>Error loading profile.</p>
    <button on:click={fetchProfile}>Retry</button>
    
{:else if profileStatus === 'empty'}
    <p>No profiles available at the moment.</p>
    <button on:click={fetchProfile}>Refresh</button>
    
{:else}
    <h2>{profile.name}</h2>
    <p>{profile.description}</p>
    <p>Age: {profile.age}</p>
    <p>Location: {profile.location}</p>
    
    <button on:click={() => handleDecision(false)}>Reject</button>
    <button on:click={() => handleDecision(true)}>Tap</button>
{/if}
