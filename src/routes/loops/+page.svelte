
<script>
    import { loops, loopsStatus, initLoopsStore, refreshLoopsStore } from "$lib/stores/loops.js";
    import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

    let selected = null;

    if ($loopsStatus === "unloaded") {
        initLoopsStore();
    }

    function open(profile) {
        selected = profile;
    }

    function close() {
        selected = null;
    }
</script>


<svelte:head>
    <title>loopii • Loops</title>
</svelte:head>


<div style="max-width:600px; margin:2rem auto; padding:1rem;" id="profile-container">
    {#if $loopsStatus === "loading"}
        <p>Loading...</p>

    {:else if $loopsStatus === "error"}
        <p>Error loading loops</p>
        <button on:click={refreshLoopsStore}>Retry</button>

    {:else if $loopsStatus === "loaded" && $loops.length === 0}
        <div style="border:1px solid #ccc; border-radius:8px; padding:1rem; margin-bottom:1rem;">
            <p>You don’t have any loops yet.</p>
            <button on:click={refreshLoopsStore}>Refresh</button>
        </div>

    {:else if selected}
        <ProfileCardExpanded profile={selected} onBack={close} />

    {:else if $loopsStatus === "loaded"}
        <div class="grid">
            {#each $loops as loop}
                <ProfileCardPreview profile={loop} on:expand={() => open(loop)} />
            {/each}
        </div>
        <div style="margin-top:1rem; text-align:center;">
            <button on:click={refreshLoopsStore}>Refresh</button>
        </div>
    {/if}
</div>


<style>
    .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
    }
</style>
