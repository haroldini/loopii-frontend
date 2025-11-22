
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
        top: 1rem;
        right: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        z-index: 1000;
    }
</style>
