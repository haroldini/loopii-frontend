
<script>
    import { goto } from "$app/navigation";
    import { loopNotification } from "$lib/stores/app";
    import { selectedLoop, refreshLoopsStore } from "$lib/stores/loops";
    import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";

    let notification;
    $: notification = $loopNotification;

    function dismiss() {
        loopNotification.set(null);
    }

    function openLoop(profile) {
        dismiss();
        selectedLoop.set(profile);
        refreshLoopsStore(false); // Update the loops list in the background
        goto("/loops");
    }
</script>

<style>
    .popup {
        position: fixed;
        top: 1rem;
        left: 50%;
        aspect-ratio: 2/1;
        transform: translateX(-50%);
        width: min(90%, 400px);
        height: auto;
        background: white;
        border: 1px solid #ddd;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        z-index: 1000;
        padding: 1rem;
        animation: slideDown 0.3s ease;
        display: flex;
        flex-direction: column;
    }

    .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .popup button {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
    }

    @keyframes slideDown {
        from { transform: translate(-50%, -20px); opacity: 0; }
        to   { transform: translate(-50%, 0); opacity: 1; }
    }
</style>

{#if notification && notification.profile}
    <div class="popup">
        <div class="popup-header">
            <h3>You Looped with {notification.profile.username}</h3>
            <button on:click={dismiss} aria-label="Close">✕</button>
        </div>
        <ProfileCardPreview profile={notification.profile} on:expand={() => openLoop(notification.profile)} />
    </div>
{/if}
