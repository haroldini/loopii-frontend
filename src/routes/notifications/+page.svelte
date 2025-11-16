<script>
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    import {
        notifications,
        inboxState,
        loadInitialNotifications,
        loadMoreNotifications,
        markAsRead,
        markAllReadHandler,
        deleteAllReadHandler,
        deleteNotificationHandler,
        resetInbox,
        totalCount,
        totalUnread
    } from "$lib/stores/notifications";

    import { selectedLoop } from "$lib/stores/loops";
    import { getProfileFromLoop } from "$lib/api/loop";
    import { timeAgo } from "$lib/utils/misc";
    import { getAvatarUrl } from "$lib/utils/profile";
    import { addToast } from "$lib/stores/popups";

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
        if (!n.onAction) return;

        try {
            const result = await n.onAction();

            if (!result || result.success === false) {
                addToast({
                    variant: "banner",
                    text: "Could not open this loop - it may have been deleted.",
                });
            }
        } catch (err) {
            console.error("Notification onAction failed:", err);
            addToast({
                variant: "banner",
                text: "Something went wrong opening that notification.",
            });
        }
    }

    // Load more
    async function loadMoreHandler() {
        if ($inboxState.loading || $inboxState.end) return;
        loading = true;
        await loadMoreNotifications();
        loading = false;
    }

    async function refreshNotificationsHandler() {
        const s = $inboxState;
        if (s.loading) return;

        loading = true;
        resetInbox();
        try {
            await loadInitialNotifications();
        } finally {
            loading = false;
        }
    }

</script>


<!-- Loading -->
{#if $inboxState.loading && !$inboxState.initialized}
<div class="container bordered">
    <p>Loading notifications…</p>
</div>

<!-- No Notifications -->
{:else if $notifications.length === 0}
<div class="container bordered">
    <p>You don't have any notifications yet.</p>
    <button on:click={refreshNotificationsHandler}>Refresh</button>
</div>


<!-- Error -->
{:else if $inboxState.error}
<div class="container bordered">
    <p class="red">Error loading notifications: {$inboxState.error.message}</p>
    <button on:click={refreshNotificationsHandler}>Refresh</button>
</div>

<!-- Notification List -->
{:else}

    <div class="container bordered">
        <h3>Notifications</h3>
        <p>Showing {$notifications.length} of {$totalCount} total</p>
        {#if $totalUnread > 0}
            <p>You have {$totalUnread} unread notification{$totalUnread === 1 ? '' : 's'}.</p>
        {/if}
        <nav>
            <button on:click={markAllReadHandler}>Mark all as read</button>
            <button on:click={deleteAllReadHandler}>Delete all read</button>
            <button on:click={refreshNotificationsHandler}>Refresh</button>
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
            {#if n.props?.profile?.images && getAvatarUrl(n.props.profile)}
                <img
                    class="avatar"
                    src={getAvatarUrl(n.props.profile)}
                    alt="{n.props.profile.username ?? 'unknown user'}'s avatar"
                    loading="lazy"
                />
            {/if}
            <div class="content">
                <p>{n.text}</p>
                <p>{timeAgo(n.created_at)}</p>
            </div>

            <div class="actions">
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

                <button
                    type="button"
                    class="delete"
                    on:click={(e) => {
                        e.stopPropagation();
                        deleteNotificationHandler(n.id);
                    }}
                >
                    Delete
                </button>
            </div>
        </div>
    {/each}


    {#if !$inboxState.end}
        <button on:click={loadMoreHandler} disabled={loading}>
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

    .actions {
        display: flex;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    .actions button {
        cursor: pointer;
    }

    .delete {
        color: #c00;
        background: none;
        border: none;
    }

    .delete:hover {
        text-decoration: underline;
    }

</style>