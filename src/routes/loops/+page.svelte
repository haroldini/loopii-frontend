<script>
    import { onMount } from 'svelte';
    import { getUserLoops } from '$lib/api/loop.js';
    import { writable } from 'svelte/store';

    const loops = writable([]);
    const status = writable('loading'); // 'loading' | 'loaded' | 'error'

    onMount(async () => {
        status.set('loading');
        try {
            const res = await getUserLoops();
            if (res?.success) {
                loops.set(res.data);
                status.set('loaded');
            } else {
                status.set('error');
            }
        } catch (err) {
            console.error('Error fetching loops:', err);
            status.set('error');
        }
    });
</script>


<svelte:head>
  <title>loopii • Loops</title>
</svelte:head>


<div style="max-width:600px; margin:2rem auto; padding:1rem;">
    {#if $status === 'loading'}
        <p>Loading...</p>

    {:else if $status === 'error'}
        <p>Error loading loops</p>
        <button on:click={() => location.reload()}>Retry</button>

    {:else if $loops.length === 0}
        <div style="border:1px solid #ccc; border-radius:8px; padding:1rem; margin-bottom:1rem;">
            <p>You don’t have any loops yet.</p>
        </div>
    {:else}
        {#each $loops as loop}
            <div style="border:1px solid #ccc; border-radius:8px; padding:1rem; margin-bottom:1rem;">
                <p><strong>Looped at:</strong> {new Date(loop.looped_at).toLocaleString()}</p>
                <p><strong>Name:</strong> {loop.name}</p>
                <p><strong>Age:</strong> {loop.age}</p>
                <p><strong>Gender:</strong> {loop.gender}</p>
                <p><strong>Country:</strong> {loop.country}</p>
                {#if loop.location}<p><strong>Location:</strong> {loop.location}</p>{/if}
                {#if loop.bio}<p><strong>Bio:</strong> {loop.bio}</p>{/if}
            </div>
        {/each}
    {/if}
</div>
