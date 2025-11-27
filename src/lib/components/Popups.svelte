
<script>
    import { allPopups } from "$lib/stores/popups.js";
    import Popup from "$lib/components/Popup.svelte";
</script>

<div class="popups">
    {#each $allPopups as p (p.id)}
        <Popup {...p} />
    {/each}
</div>

<style>
    .popups {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding-top: 1rem;
        gap: 0.75rem;
        z-index: 1000;
        pointer-events: none;
    }

    .popups :global(*) {
        pointer-events: auto;
    }
</style>
