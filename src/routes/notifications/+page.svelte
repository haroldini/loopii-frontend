<script>
    import { onMount } from "svelte";
    import { notifications, inboxState, loadInitialNotifications, loadMoreNotifications, markAsRead, markAllReadHandler, deleteAllReadHandler } from "$lib/stores/notifications";
    import { goto } from "$app/navigation";
    import { selectedLoop } from "$lib/stores/loops";
    import { getProfileFromLoop } from "$lib/api/loop";
    import { timeAgo } from "$lib/utils/misc";
    import { getAvatarUrl } from "$lib/utils/profile";
    import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";

    let loading = false;

    // Load notifications on mount (only once)
    onMount(async () => {
        const s = $inboxState;
        if (!s.initialized && !s.loading) {
            await loadInitialNotifications();
        }
    });

    // Open a notification (per type)
    async function handleNotificationClick(n) {
        if (n.type === "loop" && n.props?.profile) {
            selectedLoop.set(n.props.profile);
            markAsRead(n.id);
            goto("/loops");
        } else {
            markAsRead(n.id);
        }
    }

    // Load more
    async function loadMore() {
        if ($inboxState.loading || $inboxState.end) return;
        loading = true;
        await loadMoreNotifications();
        loading = false;
    }
</script>


<!-- Loading -->
{#if $inboxState.loading && !$inboxState.initialized}
<div class="container bordered">
    <p>Loading notifications…</p>
</div>

<!-- No Notifications -->
{:else if $notifications.length === 0}
<p>You don't have any notifications yet.</p>

<!-- Error -->
{:else if $inboxState.error}
<p class="red">Error loading notifications: {$inboxState.error.message}</p>

<!-- Notification List -->
{:else}

    <div class="container bordered">
        <nav>
            <button on:click={markAllReadHandler}>Mark all as read</button>
            <button on:click={deleteAllReadHandler}>Delete all read</button>
        </nav>
    </div>

    {#each $notifications as n (n.id)}
        <div
            role="button"
            tabindex="0"
            class="container bordered notification-item"
            on:click={() => handleNotificationClick(n)}
            on:keydown={(e) => e.key === "Enter" && handleNotificationClick(n)}
            aria-label="Open notification"
        >
            {#if n.props.profile}
                <img
                    class="avatar"
                    src={getAvatarUrl(n.props?.profile)}
                    alt="{n.props?.profile?.username}'s avatar"
                    loading="lazy"
                />
            {/if}
            <div class="content">
                <p>
                    {#if n.type === "loop"}
                        New loop from {n.props?.profile?.username ?? "someone"}!
                    {:else}
                        {n.data?.message ?? "You have a new notification."}
                    {/if}
                </p>
                <p>{timeAgo(n.created_at)}</p>
            </div>

            {#if !n.is_read}
                <button
                    type="button"
                    class="mark-read"
                    on:click={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                    }}
                >
                    Mark as read
                </button>
            {/if}
        </div>
    {/each}


    {#if !$inboxState.end}
        <button on:click={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load More"}
        </button>
    {/if}
{/if}

<style>
    .notification-item {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
    }

    .notification-item:hover {
        background: #f0f0f0;
    }

    .notification-item:focus-visible {
        outline: 2px solid #0070f3;
        outline-offset: 2px;
    }

    .notification-item .content {
        flex: 1;
        text-align: left;
    }

    .mark-read {
        cursor: pointer;
        flex-shrink: 0;
        pointer-events: auto;
        z-index: 2;
    }

    /* prevent parent hover when hovering the inner button */
    .notification-item:hover:has(.mark-read:hover) {
        background: inherit !important;
    }

    .avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        border: 1px solid #ddd;
        pointer-events: none; /* so clicks go through */
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .notification-item:hover:not(:has(.mark-read:hover)) .avatar {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    .notification-item:focus-visible .avatar {
        transform: scale(1.05);
        box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.3);
    }

    .notification-item:hover:has(.mark-read:hover) {
        background: inherit !important;
    }
</style>