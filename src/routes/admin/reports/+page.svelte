
<script>
    import Icon from "@iconify/svelte";
    import { goto } from "$app/navigation";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";

    import { adminListReports, adminSetReportStatus } from "$lib/api/admin.js";

    let items = [];
    let loading = false;

    // cursor paging (pages, not infinite append)
    let currentAfter = null;     // the cursor used to load THIS page
    let nextCursor = null;       // the cursor to load NEXT page
    let hasMore = false;
    let cursorStack = [];        // stack of previous "after" cursors (for Prev)

    let total = null;
    let limit = 50;

    // filters
    let status = "";
    let reason_code = "";
    let reportee_profile_id = "";
    let reporter_profile_id = "";

    const id_status = "admin_reports_status";
    const id_reason = "admin_reports_reason";
    const id_reportee = "admin_reports_reportee";
    const id_reporter = "admin_reports_reporter";

    $: pageNum = cursorStack.length + 1;

    function toastErr(err, fallback) {
        addToast({ text: err?.message || fallback || "Request failed.", autoHideMs: 6000 });
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

    // initial
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
                    <input id={id_reason} bind:value={reason_code} placeholder="optional" />
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
            </div>
        </div>

        <div class="stack">
            {#if items.length === 0 && loading}
                <div class="page__center">
                    <Icon icon={UI_ICONS.animLoading} class="page__icon" />
                </div>
            {:else if items.length === 0}
                <p class="text-hint">No reports.</p>
            {:else}
                {#each items as item}
                    <div class="card">
                        <div class="section stack">
                            <div class="admin-row">
                                <div class="admin-row__main">
                                    <div class="admin-row__title">
                                        {item?.report?.reason_code} · {item?.report?.status}
                                    </div>
                                    <div class="admin-row__sub">
                                        <span class="admin-code">{item?.report?.id}</span>
                                    </div>
                                </div>

                                <div class="admin-row__actions">
                                    <button
                                        type="button"
                                        class="btn btn--mini btn--ghost"
                                        on:click={() => goto(`/admin/profiles/${item?.report?.reportee_profile_id}`)}
                                    >
                                        Reportee
                                    </button>
                                    <button
                                        type="button"
                                        class="btn btn--mini btn--ghost"
                                        on:click={() => goto(`/admin/profiles/${item?.report?.reporter_profile_id}`)}
                                    >
                                        Reporter
                                    </button>
                                </div>
                            </div>

                            {#if item?.report?.details}
                                <p>{item.report.details}</p>
                            {/if}

                            <div class="admin-pillrow">
                                <span class="pill"><span class="pill__label">created: {item?.report?.created_at || "-"}</span></span>
                                {#if item?.report?.updated_at}
                                    <span class="pill"><span class="pill__label">updated: {item.report.updated_at}</span></span>
                                {/if}
                            </div>

                            <div class="actionbar">
                                <button type="button" class="btn btn--ghost" on:click={() => setStatus(item.report.id, "open", { bulk: false })}>
                                    Open
                                </button>
                                <button type="button" class="btn btn--success" on:click={() => setStatus(item.report.id, "actioned", { bulk: false })}>
                                    Actioned
                                </button>
                                <button type="button" class="btn btn--danger" on:click={() => setStatus(item.report.id, "dismissed", { bulk: false })}>
                                    Dismiss
                                </button>
                            </div>

                            <div class="actions actions--end">
                                <button type="button" class="text-link" on:click={() => setStatus(item.report.id, "dismissed", { bulk: true })}>
                                    Bulk dismiss (same reason + reportee)
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
</div>
