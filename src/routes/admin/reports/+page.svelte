
<script>
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";
    import { REPORT_REASON_CODE_OPTIONS } from "$lib/utils/validators.js";
    import { relativeTime, formatDateTimeShort, getAvatarUrl } from "$lib/utils/profile.js";

    import { adminListReports, adminSetReportStatus } from "$lib/api/admin.js";

    let items = [];
    let loading = false;

    let currentAfter = null;
    let nextCursor = null;
    let hasMore = false;
    let cursorStack = [];

    let total = null;
    let limit = 50;

    let status = "";
    let reason_code = "";
    let reportee_profile_id = "";
    let reporter_profile_id = "";

    const id_status = "admin_reports_status";
    const id_reason = "admin_reports_reason";
    const id_reportee = "admin_reports_reportee";
    const id_reporter = "admin_reports_reporter";

    // expansion state
    let expanded = new Set();

    $: pageNum = cursorStack.length + 1;

    function toggleSet(set, key) {
        const next = new Set(set);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
    }

    function toggleExpanded(key) {
        expanded = toggleSet(expanded, key);
    }

    function toastErr(err, fallback) {
        addToast({ text: err?.message || fallback || "Request failed.", autoHideMs: 6000 });
    }

    function dtTitle(iso) {
        if (!iso) return "";
        return formatDateTimeShort(iso) || "";
    }

    function dtLabel(iso) {
        if (!iso) return "-";
        const t = formatDateTimeShort(iso);
        return relativeTime(iso, true) || t || "-";
    }

    function profileHref(id) {
        if (!id) return null;
        return `/admin/profiles/${id}`;
    }

    function reasonLabel(code) {
        if (!code) return "-";
        const opt = (REPORT_REASON_CODE_OPTIONS || []).find((o) => o?.value === code);
        return opt?.label || code;
    }

    function reportIsOpen(r) {
        return (r?.status || "") === "open";
    }

    async function loadPage({ after = null } = {}) {
        if (loading) return;
        loading = true;

        try {
            currentAfter = after;

            const res = await adminListReports({
                limit,
                after_id: after,
                status: status || null,
                reason_code: reason_code || null,
                reportee_profile_id: reportee_profile_id || null,
                reporter_profile_id: reporter_profile_id || null,
            });

            items = res?.items || [];
            nextCursor = res?.next_cursor || null;
            hasMore = !!res?.has_more;
            total = typeof res?.total === "number" ? res.total : null;

            // avoid stale expansions across pages / filters
            expanded = new Set();

        } catch (err) {
            toastErr(err, "Failed to load reports.");
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

    function resetFilters() {
        status = "";
        reason_code = "";
        reportee_profile_id = "";
        reporter_profile_id = "";
        apply();
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

    async function setStatus(reportId, nextStatus, { bulk = false } = {}) {
        addToast({
            variant: "modal",
            text: bulk ? "Bulk update reports?" : "Update report status?",
            description: bulk
                ? "This updates all OPEN reports with the same (reportee, reason_code)."
                : `Set status to "${nextStatus}".`,
            autoHideMs: null,
            actions: [
                { label: "Cancel", variant: "secondary" },
                {
                    label: "Confirm",
                    variant: bulk ? "danger" : "primary",
                    onClick: async () => {
                        try {
                            await adminSetReportStatus(reportId, {
                                status: nextStatus,
                                resolution_note: null,
                                action_id: null,
                                bulk,
                            });
                            addToast({ text: bulk ? "Bulk updated." : "Updated.", autoHideMs: 2500 });
                            apply();
                        } catch (err) {
                            toastErr(err, "Failed to update report.");
                        }
                    },
                },
            ],
        });
    }

    loadPage({ after: null });
</script>


<svelte:head>
    <title>loopii • Admin • Reports</title>
</svelte:head>


<div class="stack">
    <div class="toolbar">
        <div class="toolbar__group">
            <h3>Reports</h3>
            {#if typeof total === "number"}
                <span class="pill"><span class="pill__label">{total}</span></span>
            {/if}
            <span class="pill"><span class="pill__label">page {pageNum}</span></span>
        </div>

        <div class="toolbar__group">
            <button
                type="button"
                class="btn btn--ghost btn--icon"
                class:is-loading={loading}
                on:click={refresh}
                disabled={loading}
                aria-label="Refresh"
                title="Refresh"
            >
                <Icon icon={UI_ICONS.refresh} class="btn__icon" />
                <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
            </button>
        </div>
    </div>

    <div class="admin-grid">
        <div class="card">
            <div class="section stack">
                <h4>Filters</h4>

                <div class="field">
                    <label class="field__label" for={id_status}>status</label>
                    <select id={id_status} bind:value={status}>
                        <option value="">(any)</option>
                        <option value="open">open</option>
                        <option value="actioned">actioned</option>
                        <option value="dismissed">dismissed</option>
                    </select>
                </div>

                <div class="field">
                    <label class="field__label" for={id_reason}>reason_code</label>
                    <select id={id_reason} bind:value={reason_code}>
                        <option value="">(any)</option>
                        {#each REPORT_REASON_CODE_OPTIONS as opt}
                            <option value={opt.value}>{opt.label}</option>
                        {/each}
                    </select>
                </div>

                <div class="field">
                    <label class="field__label" for={id_reportee}>reportee_profile_id</label>
                    <input id={id_reportee} bind:value={reportee_profile_id} placeholder="uuid (optional)" />
                </div>

                <div class="field">
                    <label class="field__label" for={id_reporter}>reporter_profile_id</label>
                    <input id={id_reporter} bind:value={reporter_profile_id} placeholder="uuid (optional)" />
                </div>

                <div class="actionbar">
                    <button type="button" class="btn btn--primary" on:click={apply} disabled={loading}>Apply</button>
                    <button type="button" class="btn btn--ghost" on:click={resetFilters} disabled={loading}>Reset</button>
                </div>

                <div class="u-divider"></div>

                <div class="actionbar">
                    <button
                        type="button"
                        class="btn btn--ghost"
                        on:click={prevPage}
                        disabled={loading || cursorStack.length === 0}
                        title="Previous page"
                    >
                        <Icon icon={UI_ICONS.chevronLeft} class="btn__icon" />
                        <span class="btn__label">Prev</span>
                    </button>

                    <button
                        type="button"
                        class="btn btn--ghost"
                        on:click={nextPage}
                        disabled={loading || !hasMore}
                        title="Next page"
                    >
                        <span class="btn__label">Next</span>
                        <Icon icon={UI_ICONS.chevronRight} class="btn__icon" />
                    </button>
                </div>
            </div>
        </div>

        <div class="stack">
            {#if items.length === 0 && loading}
                <div class="page__center">
                    <Icon icon={UI_ICONS.animLoadingDots} class="page__icon" />
                </div>
            {:else if items.length === 0}
                <p class="text-hint text-center">No reports.</p>
            {:else}
                <div style="width:100%;overflow-x:auto;">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>reportee</th>
                                <th>created</th>
                                <th>reason</th>
                                <th>status</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each items as item (item?.report?.id)}
                                {@const r = item?.report}
                                {@const reportee = item?.reportee_profile}
                                {@const reporter = item?.reporter_profile}
                                {@const k = r?.id}
                                {@const isOpen = reportIsOpen(r)}
                                {@const isExpanded = expanded.has(k)}

                                <tr>
                                    <td>
                                        <img
                                            src={getAvatarUrl(reportee)}
                                            alt="Avatar"
                                            loading="lazy"
                                            style="width:2.5rem;height:2.5rem;border-radius:var(--radius-full);object-fit:cover;"
                                        />
                                    </td>

                                    <td>
                                        <div class="stack" style="gap:0.1rem;">
                                            <div class="text-fw-semibold">{reportee?.name || "-"}</div>
                                            <div class="text-hint">@{reportee?.username || "-"}</div>
                                        </div>
                                    </td>

                                    <td class="admin-code">
                                        <span title={dtTitle(r?.created_at)}>{dtLabel(r?.created_at)}</span>
                                    </td>

                                    <td class="admin-code">
                                        <span title={reasonLabel(r?.reason_code)}>{r?.reason_code || "-"}</span>
                                    </td>

                                    <td>
                                        <span class="pill">
                                            <span class="pill__label">{r?.status || "-"}</span>
                                        </span>
                                    </td>

                                    <td style="white-space:nowrap;">
                                        {#if profileHref(r?.reportee_profile_id)}
                                            <a
                                                class="btn btn--primary btn--icon"
                                                href={profileHref(r?.reportee_profile_id)}
                                                title="Open reportee profile"
                                            >
                                                <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
                                            </a>
                                        {:else}
                                            <button type="button" class="btn btn--primary" disabled>
                                                <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
                                                <span class="btn__label">Reportee</span>
                                            </button>
                                        {/if}

                                        <button
                                            type="button"
                                            class="btn btn--ghost btn--icon"
                                            on:click={() => toggleExpanded(k)}
                                            title={isExpanded ? "Collapse" : "Expand"}
                                            aria-label={isExpanded ? "Collapse" : "Expand"}
                                        >
                                            {#if isExpanded}
                                                <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                                            {:else}
                                                <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                                            {/if}
                                        </button>
                                    </td>
                                </tr>

                                {#if isExpanded}
                                    <tr>
                                        <td colspan="6">
                                            <div class="stack" style="gap:var(--space-3);">

                                                <div class="card card--panel">
                                                    <div class="section stack" style="gap:var(--space-2);">
                                                        <h4 style="margin:0;">Report</h4>

                                                        <div class="stack" style="gap:0.25rem;">
                                                            <div><strong>details:</strong> {r?.details || "-"}</div>
                                                        </div>

                                                        <div class="u-divider"></div>

                                                        <div class="actions actions--center actions-fillwrap">
                                                            {#if profileHref(r?.reporter_profile_id)}
                                                                <a
                                                                    class="btn btn--ghost text-fw-semibold"
                                                                    href={profileHref(r?.reporter_profile_id)}
                                                                    title="Open reporter profile"
                                                                >
                                                                    <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
                                                                    <span class="btn__label">
                                                                        Reporter: @{reporter?.username || "-"}
                                                                    </span>
                                                                </a>
                                                            {:else}
                                                                <button type="button" class="btn btn--ghost text-fw-semibold" disabled>
                                                                    <Icon icon={UI_ICONS.arrowRight} class="btn__icon" />
                                                                    <span class="btn__label">
                                                                        Reporter: @{reporter?.username || "-"}
                                                                    </span>
                                                                </button>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                </div>

                                                {#if r?.resolved_at || r?.resolved_by_profile_id || r?.resolution_note}
                                                    <div class="card card--panel">
                                                        <div class="section stack" style="gap:var(--space-2);">
                                                            <h4 style="margin:0;">Resolution</h4>

                                                            {#if r?.resolved_at}
                                                                <div>
                                                                    <strong>resolved_at:</strong>
                                                                    <span class="admin-code" title={dtTitle(r.resolved_at)}>{dtLabel(r.resolved_at)}</span>
                                                                </div>
                                                            {/if}

                                                            {#if r?.resolved_by_profile_id}
                                                                <div>
                                                                    <strong>resolved_by:</strong>
                                                                    {#if profileHref(r.resolved_by_profile_id)}
                                                                        <a class="text-link" href={profileHref(r.resolved_by_profile_id)} title="Open resolving admin profile">
                                                                            view
                                                                        </a>
                                                                    {:else}
                                                                        -
                                                                    {/if}
                                                                </div>
                                                            {/if}

                                                            {#if r?.resolution_note}
                                                                <div><strong>resolution_note:</strong> {r.resolution_note}</div>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                {/if}

                                                <div class="card card--panel">
                                                    <div class="section stack" style="gap:var(--space-2);">
                                                        <h4 style="margin:0;">Actions</h4>

                                                        <div class="actionbar">
                                                            {#if !isOpen}
                                                                <button
                                                                    type="button"
                                                                    class="btn btn--ghost"
                                                                    on:click={() => setStatus(r.id, "open", { bulk: false })}
                                                                >
                                                                    <Icon icon={UI_ICONS.refresh} class="btn__icon" />
                                                                    <span class="btn__label">Open</span>
                                                                </button>
                                                            {/if}

                                                            <button
                                                                type="button"
                                                                class="btn btn--success"
                                                                disabled={!isOpen}
                                                                on:click={() => setStatus(r.id, "actioned", { bulk: false })}
                                                                title={!isOpen ? "Only OPEN reports can be actioned" : "Set to actioned"}
                                                            >
                                                                <Icon icon={UI_ICONS.check} class="btn__icon" />
                                                                <span class="btn__label">Actioned</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                class="btn btn--danger"
                                                                disabled={!isOpen}
                                                                on:click={() => setStatus(r.id, "dismissed", { bulk: false })}
                                                                title={!isOpen ? "Only OPEN reports can be dismissed" : "Set to dismissed"}
                                                            >
                                                                <Icon icon={UI_ICONS.close} class="btn__icon" />
                                                                <span class="btn__label">Dismissed</span>
                                                            </button>
                                                        </div>

                                                        <div class="actionbar">
                                                            <button
                                                                type="button"
                                                                class="btn btn--ghost"
                                                                disabled={!isOpen}
                                                                on:click={() => setStatus(r.id, "actioned", { bulk: true })}
                                                                title={!isOpen ? "Bulk ops apply to OPEN reports" : "Bulk action (same reportee + reason_code)"}
                                                            >
                                                                <Icon icon={UI_ICONS.check} class="btn__icon" />
                                                                <span class="btn__label">Bulk action</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                class="btn btn--ghost"
                                                                disabled={!isOpen}
                                                                on:click={() => setStatus(r.id, "dismissed", { bulk: true })}
                                                                title={!isOpen ? "Bulk ops apply to OPEN reports" : "Bulk dismiss (same reportee + reason_code)"}
                                                            >
                                                                <Icon icon={UI_ICONS.close} class="btn__icon" />
                                                                <span class="btn__label">Bulk dismiss</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                {/if}
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </div>
</div>
