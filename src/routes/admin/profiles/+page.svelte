
<script>
    import Icon from "@iconify/svelte";
    import { goto } from "$app/navigation";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";
    import { getAvatarUrl, relativeTime, formatDateTimeShort } from "$lib/utils/profile.js";
    import { adminListProfiles } from "$lib/api/admin.js";

    let items = [];
    let loading = false;

    // cursor paging (pages, not infinite append)
    let currentAfter = null;
    let nextCursor = null;
    let hasMore = false;
    let cursorStack = [];

    let total = null;

    let limit = 50;
    let sort = "recent_joined";

    $: pageNum = cursorStack.length + 1;

    function toastErr(err, fallback) {
        addToast({ text: err?.message || fallback || "Request failed.", autoHideMs: 6000 });
    }

    function formatBytes(bytes) {
        const n = Number(bytes);
        if (!isFinite(n) || n < 0) return "-";
        if (n < 1024) return `${n} B`;
        const kb = n / 1024;
        if (kb < 1024) return `${kb.toFixed(kb < 10 ? 2 : 1)} KB`;
        const mb = kb / 1024;
        if (mb < 1024) return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
        const gb = mb / 1024;
        return `${gb.toFixed(gb < 10 ? 2 : 1)} GB`;
    }

    function dtTitle(iso) {
        if (!iso) return "";
        const t = formatDateTimeShort(iso);
        return t || "";
    }

    function dtLabel(iso) {
        if (!iso) return "-";
        const title = formatDateTimeShort(iso);
        return relativeTime(iso, true) || title || "-";
    }

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
            toastErr(err, "Failed to load profiles.");
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
                <span class="pill"><span class="pill__label">{total} results</span></span>
            {/if}
            <span class="pill"><span class="pill__label">page {pageNum}</span></span>
        </div>

        <div class="toolbar__group">
            <select bind:value={sort} on:change={onSortChange} aria-label="Sort profiles">
                <option value="recent_joined">Recent joined</option>
                <option value="recent_updated">Recent updated</option>
                <option value="most_decisions_30d">Most decisions (30d)</option>
                <option value="most_loops_30d">Most loops (30d)</option>
                <option value="storage_bytes">Storage</option>
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
        <button type="button" class="btn btn--ghost" on:click={prevPage} disabled={loading || cursorStack.length === 0}>
            <Icon icon={UI_ICONS.chevronLeft} class="btn__icon" />
            <span class="btn__label">Prev</span>
        </button>

        <button type="button" class="btn btn--ghost" on:click={nextPage} disabled={loading || !hasMore}>
            <span class="btn__label">Next</span>
            <Icon icon={UI_ICONS.chevronRight} class="btn__icon" />
        </button>
    </div>

    {#if items.length === 0 && loading}
        <div class="page__center">
            <Icon icon={UI_ICONS.animLoadingDots} class="page__icon" />
        </div>
    {:else if items.length === 0}
        <p class="text-hint text-center">No profiles.</p>
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
                                        {row.profile?.name || `@${row.profile?.username || "unknown"}`}
                                    </div>

                                    <div class="admin-row__sub">
                                        {#if row.profile?.username}
                                            @{row.profile.username}
                                        {:else}
                                            <span class="text-hint">no username</span>
                                        {/if}

                                        {#if row?.meta?.access?.status}
                                            · <span class="text-hint">{row.meta.access.status}</span>
                                        {/if}

                                        {#if row?.meta?.access?.role}
                                            · <span class="text-hint">{row.meta.access.role}</span>
                                        {/if}

                                        · joined <span title={dtTitle(row.profile?.created_at)} class="admin-code">{dtLabel(row.profile?.created_at)}</span>

                                        {#if row.profile?.last_seen_at}
                                            · seen <span title={dtTitle(row.profile.last_seen_at)} class="admin-code">{dtLabel(row.profile.last_seen_at)}</span>
                                        {/if}
                                    </div>
                                </div>

                                <div class="admin-pillrow">
                                    <span class="pill">
                                        <span class="pill__label">open reports: {row?.meta?.reports_received_open ?? 0}</span>
                                    </span>

                                    <span class="pill">
                                        <span class="pill__label">loops: {row?.meta?.loops_total ?? 0} (30d {row?.meta?.loops_30d ?? 0})</span>
                                    </span>

                                    <span class="pill">
                                        <span class="pill__label">decisions made: {row?.meta?.decisions_made_total ?? 0} (30d {row?.meta?.decisions_made_30d ?? 0})</span>
                                    </span>

                                    <span class="pill">
                                        <span class="pill__label">decisions recv: {row?.meta?.decisions_received_total ?? 0} (30d {row?.meta?.decisions_received_30d ?? 0})</span>
                                    </span>

                                    <span class="pill">
                                        <span class="pill__label">storage: {formatBytes(row?.meta?.storage_bytes ?? 0)}</span>
                                    </span>

                                    {#if row?.meta?.img_count != null}
                                        <span class="pill">
                                            <span class="pill__label">images: {row.meta.img_count}</span>
                                        </span>
                                    {/if}
                                </div>
                            </div>
                        </div>

                        <div class="admin-row__actions">
                            <button type="button" class="btn btn--primary btn--icon" on:click={() => openProfile(row.profile?.id)}>
                                <Icon icon={UI_ICONS.eyeOpen} class="btn__icon" />
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
