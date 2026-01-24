
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
        overflow: hidden;
        overflow-x: clip;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        
        padding-top: calc(var(--space-3) + var(--nav-height));
        gap: calc(var(--space-2) + var(--space-1));

        z-index: var(--z-toast);
        pointer-events: none;
    }

    .popups :global(*) {
        pointer-events: auto;
    }
</style>
