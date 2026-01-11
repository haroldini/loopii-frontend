
<script>
    import Icon from "@iconify/svelte";
    import { goto } from "$app/navigation";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";
    import { getAvatarUrl } from "$lib/utils/profile.js";
    import { adminListProfiles } from "$lib/api/admin.js";

    let items = [];
    let loading = false;
    let cursor = null;
    let hasMore = false;
    let total = null;

    let limit = 50;
    let sort = "recent_joined";

    async function load({ reset = false } = {}) {
        if (loading) return;
        loading = true;

        try {
            const res = await adminListProfiles({
                limit,
                after_id: reset ? null : cursor,
                sort,
            });

            const next = res?.items || [];

            items = reset ? next : [...items, ...next];
            cursor = res?.next_cursor || null;
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

    function refresh() {
        cursor = null;
        items = [];
        load({ reset: true });
    }

    function openProfile(id) {
        if (!id) return;
        goto(`/admin/profiles/${id}`);
    }

    // initial
    load({ reset: true });
</script>


<svelte:head>
    <title>loopii • Admin • Profiles</title>
</svelte:head>


<section class="card">
    <div class="section stack">
        <div class="toolbar">
            <div class="toolbar__group">
                <h3>Profiles</h3>
                {#if typeof total === "number"}
                    <span class="pill"><span class="pill__label">{total}</span></span>
                {/if}
            </div>

            <div class="toolbar__group">
                <select bind:value={sort} on:change={refresh} aria-label="Sort profiles">
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

                {#if hasMore}
                    <button
                        type="button"
                        class="btn btn--block btn--ghost"
                        class:is-loading={loading}
                        on:click={() => load({ reset: false })}
                        disabled={loading}
                    >
                        <Icon icon={UI_ICONS.chevronDown} class="btn__icon--large" />
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon--large btn__spinner" />
                        <span class="btn__label">Load more</span>
                    </button>
                {/if}
            </div>
        {/if}
    </div>
</section>
