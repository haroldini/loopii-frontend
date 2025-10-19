
<script>
    import { loops, loopsStatus, initLoopsStore, refreshLoopsStore, selectedLoop } from "$lib/stores/loops.js";
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

    {:else if $loopsStatus === "loaded" && $loops.length === 0}
        <div class="card">
            <p>You don’t have any loops yet.</p>
        </div>

    {:else if $selectedLoop}
        <ProfileCardExpanded profile={$selectedLoop} onAvatarClick={close} />

    {:else if $loopsStatus === "loaded"}
        <div class="grid grid-3">
            {#each $loops as loop}
            <div style="aspect-ratio: 1 / 1;">
                <ProfileCardPreview profile={loop} on:expand={() => open(loop)} />
            </div>
            {/each}
        </div>
    {/if}
</div>
    
<nav>
    <button on:click={refreshLoopsStore}>Refresh</button>
</nav>

