
<script>
    import Icon from "@iconify/svelte";
    import { goto } from "$app/navigation";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";
    import { adminListProfiles } from "$lib/api/admin.js";

    let items = [];
    let loading = false;

    // cursor paging (pages, not infinite append)
    let currentAfter = null;     // cursor used to load THIS page
    let nextCursor = null;       // cursor for NEXT page
    let hasMore = false;
    let cursorStack = [];        // previous cursors for Prev

    let total = null;

    let limit = 50;
    let sort = "recent_joined";

    $: pageNum = cursorStack.length + 1;

    async function loadPage({ after = null } = {}) {
        if (loading) return;
        loading = true;

        try {
            currentAfter = after;

            const res = await adminListProfiles({
                limit,
                after_id: after,
                sort,
            });

            items = res?.items || [];
            nextCursor = res?.next_cursor || null;
            hasMore = !!res?.has_more;
            total = typeof res?.total === "number" ? res.total : null;

        } catch (err) {
            addToast({
                text: err?.message || "Failed to load profiles.",
                autoHideMs: 6000,
            });
        } finally {
            loading = false;
        }
    }

    function apply() {
        cursorStack = [];
        loadPage({ after: null });
    }

    function refresh() {
        loadPage({ after: currentAfter });
    }

    function nextPage() {
        if (loading) return;
        if (!hasMore || !nextCursor) return;
        cursorStack = [...cursorStack, currentAfter];
        loadPage({ after: nextCursor });
    }

    function prevPage() {
        if (loading) return;
        if (cursorStack.length === 0) return;
        const prevAfter = cursorStack[cursorStack.length - 1] ?? null;
        cursorStack = cursorStack.slice(0, -1);
        loadPage({ after: prevAfter });
    }

    function openProfile(id) {
        if (!id) return;
        goto(`/admin/profiles/${id}`);
    }

    function onSortChange() {
        apply();
    }

    // initial
    loadPage({ after: null });
</script>


<svelte:head>
    <title>loopii • Admin • Profiles</title>
</svelte:head>


<div class="stack">
    <div class="toolbar">
        <div class="toolbar__group">
            <h3>Profiles</h3>
            {#if typeof total === "number"}
                <span class="pill"><span class="pill__label">{total}</span></span>
            {/if}
            <span class="pill"><span class="pill__label">page {pageNum}</span></span>
        </div>

        <div class="toolbar__group">
            <select bind:value={sort} on:change={onSortChange} aria-label="Sort profiles">
                <option value="recent_joined">Recent joined</option>
                <option value="recent_updated">Recent updated</option>
                <option value="most_decisions_30d">Most decisions (30d)</option>
                <option value="most_loops_30d">Most loops (30d)</option>
                <option value="storage_bytes">Storage bytes</option>
                <option value="most_reports_open">Most reports open</option>
            </select>

            <button
                type="button"
                class="btn btn--ghost btn--icon"
                class:is-loading={loading}
                on:click={refresh}
                disabled={loading}
                aria-label="Refresh"
            >
                <Icon icon={UI_ICONS.refresh} class="btn__icon" />
                <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
            </button>
        </div>
    </div>

    <div class="u-divider"></div>

    <div class="actionbar">
        <button
            type="button"
            class="btn btn--ghost"
            on:click={prevPage}
            disabled={loading || cursorStack.length === 0}
        >
            <Icon icon={UI_ICONS.chevronLeft} class="btn__icon" />
            <span class="btn__label">Prev</span>
        </button>

        <button
            type="button"
            class="btn btn--ghost"
            on:click={nextPage}
            disabled={loading || !hasMore}
        >
            <span class="btn__label">Next</span>
            <Icon icon={UI_ICONS.chevronRight} class="btn__icon" />
        </button>
    </div>

    {#if items.length === 0 && loading}
        <div class="page__center">
            <Icon icon={UI_ICONS.animLoading} class="page__icon" />
        </div>
    {:else if items.length === 0}
        <p class="text-hint">No profiles.</p>
    {:else}
        <div class="stack">
            {#each items as row}
                <div class="card">
                    <div class="section admin-row">
                        <div class="row" style="align-items:flex-start;">
                            <img
                                class="admin-avatar"
                                src={getAvatarUrl(row.profile)}
                                alt={row.profile?.username ? `@${row.profile.username}` : "Profile avatar"}
                                loading="lazy"
                            />

                            <div class="admin-row__main stack" style="gap:var(--space-2);">
                                <div>
                                    <div class="admin-row__title">
                                        {row.profile?.name || row.profile?.username || row.profile?.id}
                                    </div>
                                    <div class="admin-row__sub">
                                        @{row.profile?.username} · <span class="admin-code">{row.profile?.id}</span>
                                    </div>
                                </div>

                                <div class="admin-pillrow">
                                    {#if row?.meta?.access?.status}
                                        <span class="pill"><span class="pill__label">{row.meta.access.status}</span></span>
                                    {/if}
                                    {#if row?.meta?.access?.role}
                                        <span class="pill"><span class="pill__label">{row.meta.access.role}</span></span>
                                    {/if}
                                    <span class="pill"><span class="pill__label">open reports: {row?.meta?.reports_received_open ?? 0}</span></span>
                                    <span class="pill"><span class="pill__label">loops 30d: {row?.meta?.loops_30d ?? 0}</span></span>
                                    <span class="pill"><span class="pill__label">storage: {row?.meta?.storage_bytes ?? 0}</span></span>
                                </div>
                            </div>
                        </div>

                        <div class="admin-row__actions">
                            <button type="button" class="btn btn--mini btn--primary" on:click={() => openProfile(row.profile?.id)}>
                                View
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
