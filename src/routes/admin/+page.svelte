
<script>
    import Icon from "@iconify/svelte";
    import { goto } from "$app/navigation";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";
    import { adminListProfiles, adminListReports } from "$lib/api/admin.js";

    let loading = false;
    let openReports = null;
    let totalProfiles = null;

    async function loadCounts() {
        if (loading) return;
        loading = true;

        try {
            const [r, p] = await Promise.all([
                adminListReports({ limit: 1, status: "open" }),
                adminListProfiles({ limit: 1, sort: "recent_joined" }),
            ]);

            openReports = typeof r?.total === "number" ? r.total : null;
            totalProfiles = typeof p?.total === "number" ? p.total : null;
        } catch (err) {
            addToast({ text: err?.message || "Failed to load admin counts.", autoHideMs: 5000 });
        } finally {
            loading = false;
        }
    }

    loadCounts();
</script>


<svelte:head>
    <title>loopii • Admin</title>
</svelte:head>


<div class="stack">
    <section class="card">
        <div class="section stack">
            <h3>Navigation</h3>

            <div class="admin-pillrow">
                {#if typeof openReports === "number"}
                    <span class="pill"><span class="pill__label">open reports: {openReports}</span></span>
                {/if}
                {#if typeof totalProfiles === "number"}
                    <span class="pill"><span class="pill__label">profiles: {totalProfiles}</span></span>
                {/if}
            </div>

            <div class="grid grid-2">
                <button type="button" class="btn btn--primary btn--block" on:click={() => goto("/admin/dashboard")} disabled={loading}>
                    <Icon icon={UI_ICONS.chart || UI_ICONS.activity || UI_ICONS.refresh} class="btn__icon" />
                    <span class="btn__label">Dashboard</span>
                </button>

                <button type="button" class="btn btn--primary btn--block" on:click={() => goto("/admin/profiles")} disabled={loading}>
                    <Icon icon={UI_ICONS.accountAction} class="btn__icon" />
                    <span class="btn__label">Profiles</span>
                </button>

                <button type="button" class="btn btn--primary btn--block" on:click={() => goto("/admin/reports")} disabled={loading}>
                    <Icon icon={UI_ICONS.alert} class="btn__icon" />
                    <span class="btn__label">Reports</span>
                </button>
            </div>

            <button type="button" class="btn btn--ghost btn--block" class:is-loading={loading} on:click={loadCounts} disabled={loading}>
                <Icon icon={UI_ICONS.refresh} class="btn__icon" />
                <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                <span class="btn__label">Refresh</span>
            </button>
        </div>
    </section>
</div>
