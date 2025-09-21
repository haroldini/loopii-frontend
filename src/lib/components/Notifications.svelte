<script>
    import { notifications } from "$lib/stores/app";
    import NotificationItem from "./NotificationItem.svelte";
</script>

<div class="notifications">
    {#each $notifications as n (n.id)}
        <NotificationItem {...n} />
    {/each}
</div>

<style>
    .notifications {
        position: fixed;
        top: 1rem;
        right: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        z-index: 1000;
    }
</style>
