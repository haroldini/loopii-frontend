
<script>
    import {
        loops,
        selectedLoop,
        loopsStatus,
        loopsState,
        loadInitialLoops,
        loadMoreLoops,
        refreshLoopsStore,
    } from "$lib/stores/loops.js";

    import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

    function open(profile) {
        selectedLoop.set(profile);
    }

    function close() {
        selectedLoop.set(null);
    }
</script>


<svelte:head>
    <title>loopii • Loops</title>
</svelte:head>


<div class="container bordered">
    {#if $loopsStatus === "loading"}
        <p>Loading...</p>

    {:else if $loopsStatus === "error"}
        <p>Error loading loops</p>
        <button on:click={refreshLoopsStore}>Refresh</button>

    {:else if $loopsStatus === "loaded" && $loops.length === 0}
        <p>You don't have any loops yet.</p>
        <button on:click={refreshLoopsStore}>Refresh</button>

    {:else if $selectedLoop}
        <ProfileCardExpanded profile={$selectedLoop} onAvatarClick={close} />

    {:else if $loopsStatus === "loaded"}

        <!-- Profile Cards Grid -->
        <div class="grid grid-3">
            {#each $loops as loop}
                <div style="aspect-ratio: 1 / 1;">
                    <ProfileCardPreview profile={loop} on:expand={() => open(loop)} />
                </div>
            {/each}
        </div>

        <!-- Load More Button -->
        {#if !$loopsState.end}
            <button on:click={loadMoreLoops} disabled={$loopsState.loading}>
                {$loopsState.loading ? "Loading…" : "Load More"}
            </button>
        {:else}
            <button on:click={refreshLoopsStore}>Refresh</button>
        {/if}
    {/if}
</div>
    
