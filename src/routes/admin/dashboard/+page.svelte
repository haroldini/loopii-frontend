
<script>
    import Icon from "@iconify/svelte";
    import { browser } from "$app/environment";
    import { onDestroy, onMount, tick } from "svelte";

    import { UI_ICONS, countryMap, GENDER_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";
    import { adminGetDashboard } from "$lib/api/admin.js";

    let loading = false;
    $: busy = loading;

    let data = null;

    let days = 365;
    let startDay = "";
    let endDay = "";

    let showTotals = true;
    let showTrends = true;
    let showQuality = true;
    let showModeration = true;
    let showDistributions = true;

    let showCountryGender = true;
    let showEloGender = true;

    let cvDailyEvents;
    let cvWeeklyEvents;
    let cvMonthlyEvents;
    let cvDailyActivity;
    let cvWeeklyActions;
    let cvEloByGender;

    let charts = [];

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

    function formatPct(v) {
        const n = Number(v);
        if (!isFinite(n)) return "-";
        if (n === 0) return "0%";
        return n < 1 ? `${n.toFixed(1)}%` : `${n.toFixed(0)}%`;
    }

    function isoToYMD(iso) {
        if (!iso) return "";
        try {
            return new Date(iso).toISOString().slice(0, 10);
        } catch {
            return String(iso);
        }
    }

    function isoToYM(iso) {
        if (!iso) return "";
        try {
            return new Date(iso).toISOString().slice(0, 7);
        } catch {
            return String(iso);
        }
    }

    function num(v, fallback = 0) {
        const n = Number(v);
        return isFinite(n) ? n : fallback;
    }

    function displayIntOrDash(v) {
        if (v == null) return "-";
        const n = Number(v);
        return Number.isFinite(n) ? String(Math.trunc(n)) : "-";
    }

    function destroyCharts() {
        for (const c of charts) {
            try {
                c?.destroy?.();
            } catch {}
        }
        charts = [];
    }

    function shouldRenderDailyChart() {
        const n = (data?.timeseries?.daily || []).length;
        return n <= 400;
    }

    function genderLabel(g) {
        const t = (g || "").toString();
        if (!t) return "-";
        return t.charAt(0).toUpperCase() + t.slice(1);
    }

    function genderIcon(g) {
        const key = (g || "other").toString().toLowerCase();
        return GENDER_ICONS?.[key] || GENDER_ICONS?.other || UI_ICONS.user;
    }

    function countryRowDecor(r) {
        const cm = $countryMap || {};
        const c = r?.country_id ? cm[r.country_id] : null;

        const code = (r?.code || c?.code || "").toString();
        const flag_icon = c?.flag_icon || (code ? `circle-flags:${code.toLowerCase()}` : null);
        const name = r?.name || c?.name || "-";
        const sub_region = c?.sub_region || c?.subregion || c?.region || "-";

        return {
            ...r,
            code: code || null,
            flag_icon,
            name,
            sub_region,
        };
    }

    async function renderCharts() {
        if (!browser) return;
        if (!data) return;

        destroyCharts();

        const mod = await import("chart.js/auto");
        const Chart = mod.default;

        const daily = data?.timeseries?.daily || [];
        const weekly = data?.timeseries?.weekly || [];
        const monthly = data?.timeseries?.monthly || [];

        const dLabels = daily.map((r) => r?.day || "");
        const wLabels = weekly.map((r) => isoToYMD(r?.bucket_start));
        const mLabels = monthly.map((r) => isoToYM(r?.bucket_start));

        const genderKeys = data?.breakdowns?.gender_keys || [];
        const eloBuckets = data?.breakdowns?.elo_buckets_by_gender || [];

        if (showTrends && cvDailyEvents && shouldRenderDailyChart()) {
            charts.push(
                new Chart(cvDailyEvents, {
                    type: "line",
                    data: {
                        labels: dLabels,
                        datasets: [
                            {
                                label: "profiles created",
                                data: daily.map((r) => num(r?.events?.profiles_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "decisions",
                                data: daily.map((r) => num(r?.events?.decisions_total, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "connect decisions",
                                data: daily.map((r) => num(r?.events?.decisions_connect, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "loops",
                                data: daily.map((r) => num(r?.events?.loops_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "reports",
                                data: daily.map((r) => num(r?.events?.reports_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "admin actions",
                                data: daily.map((r) => num(r?.events?.admin_actions_total, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: { y: { beginAtZero: true } },
                    },
                })
            );
        }

        if (showTrends && cvWeeklyEvents) {
            charts.push(
                new Chart(cvWeeklyEvents, {
                    type: "line",
                    data: {
                        labels: wLabels,
                        datasets: [
                            {
                                label: "profiles created",
                                data: weekly.map((r) => num(r?.events?.profiles_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "decisions",
                                data: weekly.map((r) => num(r?.events?.decisions_total, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "connect decisions",
                                data: weekly.map((r) => num(r?.events?.decisions_connect, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "loops",
                                data: weekly.map((r) => num(r?.events?.loops_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "reports",
                                data: weekly.map((r) => num(r?.events?.reports_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "admin actions",
                                data: weekly.map((r) => num(r?.events?.admin_actions_total, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: { y: { beginAtZero: true } },
                    },
                })
            );
        }

        if (showTrends && cvMonthlyEvents) {
            charts.push(
                new Chart(cvMonthlyEvents, {
                    type: "line",
                    data: {
                        labels: mLabels,
                        datasets: [
                            {
                                label: "profiles created",
                                data: monthly.map((r) => num(r?.events?.profiles_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "decisions",
                                data: monthly.map((r) => num(r?.events?.decisions_total, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "connect decisions",
                                data: monthly.map((r) => num(r?.events?.decisions_connect, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "loops",
                                data: monthly.map((r) => num(r?.events?.loops_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "reports",
                                data: monthly.map((r) => num(r?.events?.reports_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "admin actions",
                                data: monthly.map((r) => num(r?.events?.admin_actions_total, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: { y: { beginAtZero: true } },
                    },
                })
            );
        }

        if (showTrends && cvDailyActivity && shouldRenderDailyChart()) {
            charts.push(
                new Chart(cvDailyActivity, {
                    type: "line",
                    data: {
                        labels: dLabels,
                        datasets: [
                            {
                                label: "DAU",
                                data: daily.map((r) => num(r?.activity?.dau, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "WAU",
                                data: daily.map((r) => num(r?.activity?.wau, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "MAU",
                                data: daily.map((r) => num(r?.activity?.mau, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: { y: { beginAtZero: true } },
                    },
                })
            );
        }

        if (showModeration && cvWeeklyActions) {
            const typeSet = new Set();
            for (const r of weekly) {
                const m = r?.admin_actions_by_type || {};
                for (const k of Object.keys(m)) typeSet.add(k);
            }
            const types = Array.from(typeSet).sort();

            charts.push(
                new Chart(cvWeeklyActions, {
                    type: "bar",
                    data: {
                        labels: wLabels,
                        datasets: types.map((t) => ({
                            label: t,
                            data: weekly.map((r) => num((r?.admin_actions_by_type || {})[t], 0)),
                            borderWidth: 1,
                        })),
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: {
                            x: { stacked: true },
                            y: { stacked: true, beginAtZero: true },
                        },
                    },
                })
            );
        }

        if (showDistributions && showEloGender && cvEloByGender && eloBuckets.length) {
            charts.push(
                new Chart(cvEloByGender, {
                    type: "bar",
                    data: {
                        labels: eloBuckets.map((b) => b.label),
                        datasets: genderKeys.map((g) => ({
                            label: g,
                            data: eloBuckets.map((b) => num((b?.counts || {})[g], 0)),
                            borderWidth: 1,
                        })),
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: {
                            x: { stacked: true },
                            y: { stacked: true, beginAtZero: true },
                        },
                    },
                })
            );
        }
    }

    async function load() {
        if (loading) return;
        loading = true;

        try {
            const payload = { days };

            if (startDay) payload.start_day = startDay;
            if (endDay) payload.end_day = endDay;

            data = await adminGetDashboard(payload);

            if (browser) {
                await tick();
                await renderCharts();
            }
        } catch (err) {
            toastErr(err, "Failed to load dashboard.");
        } finally {
            loading = false;
        }
    }

    function onDaysChange(e) {
        const v = Number(e?.currentTarget?.value);
        if (!isFinite(v) || v <= 0) return;
        days = v;
        load();
    }

    function onStartDayChange(e) {
        startDay = e?.currentTarget?.value || "";
    }

    function onEndDayChange(e) {
        endDay = e?.currentTarget?.value || "";
    }

    function clearDates() {
        startDay = "";
        endDay = "";
        load();
    }

    async function toggleAndRerender(setter) {
        setter();
        if (!browser) return;
        await tick();
        await renderCharts();
    }

    onMount(() => {
        load();
    });

    onDestroy(() => {
        destroyCharts();
    });

    $: snapshot = data?.snapshot || null;

    $: snapshotActivity = snapshot?.activity || {};
    $: snapshotTotals = snapshot?.totals || {};
    $: snapshotCompleteness = snapshot?.completeness || {};
    $: snapshotPercentiles = snapshot?.percentiles || {};

    $: totalsRows = [
        { k: "snapshot_day", v: snapshot?.day ? isoToYMD(snapshot.day) : "-", d: "Latest computed day available inside the requested range." },
        { k: "computed_at", v: snapshot?.computed_at ? snapshot.computed_at : "-", d: "Timestamp when metrics were computed." },

        { k: "profiles_total", v: displayIntOrDash(snapshotTotals?.profiles_total), d: "Total profiles as of snapshot day." },
        { k: "profiles_active_total", v: displayIntOrDash(snapshotTotals?.profiles_active_total), d: "Profiles that pass access gating as of snapshot day." },
        { k: "profiles_invisible_total", v: displayIntOrDash(snapshotTotals?.profiles_invisible_total), d: "Profiles with visibility is_visible=false as of snapshot day." },

        { k: "loops_total", v: displayIntOrDash(snapshotTotals?.loops_total), d: "Total loops as of snapshot day." },

        { k: "decisions_total_all_time", v: displayIntOrDash(snapshotTotals?.decisions_total_all_time), d: "Total decisions as of snapshot day." },
        { k: "decisions_connect_all_time", v: displayIntOrDash(snapshotTotals?.decisions_connect_all_time), d: "Total connect decisions as of snapshot day." },

        { k: "open_reports_total", v: displayIntOrDash(snapshotTotals?.open_reports_total), d: "Open reports as of snapshot day." },

        { k: "DAU", v: displayIntOrDash(snapshotActivity?.dau), d: "Active (last_seen) in the last 24 hours at snapshot time." },
        { k: "WAU", v: displayIntOrDash(snapshotActivity?.wau), d: "Active (last_seen) in the last 7 days at snapshot time." },
        { k: "MAU", v: displayIntOrDash(snapshotActivity?.mau), d: "Active (last_seen) in the last 30 days at snapshot time." },
    ];

    $: completenessRows = [
        { k: "with_location_pct", v: formatPct(snapshotCompleteness?.with_location_pct), d: "Has a location string." },
        { k: "with_latlng_pct", v: formatPct(snapshotCompleteness?.with_latlng_pct), d: "Has latitude and longitude." },

        { k: "with_images_pct", v: formatPct(snapshotCompleteness?.with_images_pct), d: "Has at least 1 image." },
        { k: "one_image_pct", v: formatPct(snapshotCompleteness?.one_image_pct), d: "Has exactly 1 image." },
        { k: "with_audio_pct", v: formatPct(snapshotCompleteness?.with_audio_pct), d: "Has voice intro audio." },
        { k: "with_socials_pct", v: formatPct(snapshotCompleteness?.with_socials_pct), d: "Has at least 1 social linked." },

        { k: "avg_text_len_per_profile", v: snapshotCompleteness?.avg_text_len_per_profile != null ? num(snapshotCompleteness.avg_text_len_per_profile, 0).toFixed(1) : "-", d: "Average total text length per profile." },
        { k: "avg_pics_per_profile", v: snapshotCompleteness?.avg_pics_per_profile != null ? num(snapshotCompleteness.avg_pics_per_profile, 0).toFixed(2) : "-", d: "Average images per profile." },
        { k: "avg_socials_per_profile", v: snapshotCompleteness?.avg_socials_per_profile != null ? num(snapshotCompleteness.avg_socials_per_profile, 0).toFixed(2) : "-", d: "Average socials per profile." },
    ];

    $: canShowDailyCharts = shouldRenderDailyChart();

    $: genderKeys = data?.breakdowns?.gender_keys || [];

    $: countriesByGender = (data?.breakdowns?.countries_by_gender || [])
        .map(countryRowDecor);

    $: eloBucketsByGender = data?.breakdowns?.elo_buckets_by_gender || [];

    function countryCount(r, g) {
        return num((r?.counts || {})[g], 0);
    }

    function sumDaily(fieldKey) {
        return (data?.timeseries?.daily || []).reduce((a, r) => a + num(r?.events?.[fieldKey], 0), 0);
    }
</script>


<svelte:head>
    <title>loopii • Admin • Dashboard</title>
</svelte:head>


<div class="stack">
    <div class="toolbar">
        <div class="toolbar__group">
            <h3>Dashboard</h3>

            {#if data?.range?.start && data?.range?.end}
                <span class="pill"><span class="pill__label">days: {data.range.days}</span></span>
                <span class="pill"><span class="pill__label">{isoToYMD(data.range.start)} -> {isoToYMD(data.range.end)}</span></span>
            {/if}
        </div>

        <div class="toolbar__group" style="gap:var(--space-2);">
            <select disabled={busy} on:change={onDaysChange} aria-label="Days range">
                <option value="7" selected={days === 7}>7d</option>
                <option value="14" selected={days === 14}>14d</option>
                <option value="30" selected={days === 30}>30d</option>
                <option value="90" selected={days === 90}>90d</option>
                <option value="365" selected={days === 365}>365d</option>
                <option value="730" selected={days === 730}>2y</option>
                <option value="3650" selected={days === 3650}>10y</option>
            </select>

            <input
                type="date"
                class="input"
                disabled={busy}
                bind:value={startDay}
                on:change={onStartDayChange}
                aria-label="Start day"
                title="Start day"
                style="max-width: 10.5rem;"
            />

            <input
                type="date"
                class="input"
                disabled={busy}
                bind:value={endDay}
                on:change={onEndDayChange}
                aria-label="End day"
                title="End day"
                style="max-width: 10.5rem;"
            />

            <button type="button" class="btn btn--ghost btn--icon" on:click={clearDates} disabled={busy}>
                <Icon icon={UI_ICONS.close} class="btn__icon" />
            </button>

            <button
                type="button"
                class="btn btn--ghost btn--icon"
                class:is-loading={busy}
                on:click={load}
                disabled={busy}
                aria-label="Refresh"
                title="Refresh"
            >
                <Icon icon={UI_ICONS.refresh} class="btn__icon" />
                <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
            </button>
        </div>
    </div>

    {#if !data}
        <div class="page__center">
            <Icon icon={UI_ICONS.animLoadingDots} class="page__icon" />
        </div>
    {:else}
        {#if !snapshot}
            <section class="card">
                <div class="section stack">
                    <h3 style="margin:0;">No metrics available</h3>
                    <p class="text-hint">No MetricsDaily rows exist for the requested date range. Distributions still show live from Profile.</p>
                </div>
            </section>
        {/if}

        <!-- Totals -->
        <section class="card">
            <div class="section stack">
                <div class="row" style="justify-content:space-between;align-items:center;">
                    <h3 style="margin:0;">Totals</h3>
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => toggleAndRerender(() => (showTotals = !showTotals))}
                        disabled={busy}
                        title={showTotals ? "Collapse totals" : "Expand totals"}
                        aria-label={showTotals ? "Collapse totals" : "Expand totals"}
                    >
                        {#if showTotals}
                            <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                        {:else}
                            <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                        {/if}
                    </button>
                </div>

                {#if showTotals}
                    {#if !snapshot}
                        <p class="text-hint">No snapshot available (metrics_daily empty for this range).</p>
                    {:else}
                        <p class="text-hint">Snapshot values from the latest available day inside the requested range.</p>

                        <div class="admin-table-wrap">
                            <table class="admin-table admin-table--metrics">
                                <thead>
                                    <tr>
                                        <th>metric</th>
                                        <th>value</th>
                                        <th>description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each totalsRows as r}
                                        <tr>
                                            <td class="admin-code">{r.k}</td>
                                            <td>{r.v}</td>
                                            <td>{r.d}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                {/if}
            </div>
        </section>

        <!-- Trends -->
        <section class="card">
            <div class="section stack">
                <div class="row" style="justify-content:space-between;align-items:center;">
                    <h3 style="margin:0;">Trends</h3>
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => toggleAndRerender(() => (showTrends = !showTrends))}
                        disabled={busy}
                        title={showTrends ? "Collapse trends" : "Expand trends"}
                        aria-label={showTrends ? "Collapse trends" : "Expand trends"}
                    >
                        {#if showTrends}
                            <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                        {:else}
                            <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                        {/if}
                    </button>
                </div>

                {#if showTrends}
                    {#if !snapshot}
                        <p class="text-hint">No metrics_daily rows in range, so trend charts are empty.</p>
                    {:else}
                        <div class="stack" style="gap:var(--space-4);">
                            {#if !canShowDailyCharts}
                                <p class="text-hint">
                                    Daily charts are hidden for large ranges (>{400} days) to avoid heavy rendering. Weekly/monthly remain available.
                                </p>
                            {:else}
                                <div>
                                    <p class="text-hint">Daily events (all event counters).</p>
                                    <div style="height:320px;">
                                        <canvas bind:this={cvDailyEvents}></canvas>
                                    </div>
                                </div>

                                <div>
                                    <p class="text-hint">Daily activity (DAU/WAU/MAU).</p>
                                    <div style="height:260px;">
                                        <canvas bind:this={cvDailyActivity}></canvas>
                                    </div>
                                </div>

                                <div class="u-divider"></div>
                            {/if}

                            <div>
                                <p class="text-hint">Weekly events (aggregated from daily rows).</p>
                                <div style="height:320px;">
                                    <canvas bind:this={cvWeeklyEvents}></canvas>
                                </div>
                            </div>

                            <div>
                                <p class="text-hint">Monthly events (aggregated from daily rows).</p>
                                <div style="height:320px;">
                                    <canvas bind:this={cvMonthlyEvents}></canvas>
                                </div>
                            </div>
                        </div>
                    {/if}
                {/if}
            </div>
        </section>

        <!-- Profile quality -->
        <section class="card">
            <div class="section stack">
                <div class="row" style="justify-content:space-between;align-items:center;">
                    <h3 style="margin:0;">Profile quality</h3>
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => toggleAndRerender(() => (showQuality = !showQuality))}
                        disabled={busy}
                        title={showQuality ? "Collapse profile quality" : "Expand profile quality"}
                        aria-label={showQuality ? "Collapse profile quality" : "Expand profile quality"}
                    >
                        {#if showQuality}
                            <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                        {:else}
                            <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                        {/if}
                    </button>
                </div>

                {#if showQuality}
                    {#if !snapshot}
                        <p class="text-hint">No snapshot available (metrics_daily empty for this range).</p>
                    {:else}
                        <div class="stack" style="gap:var(--space-4);">
                            <div>
                                <h4 style="margin:0;">Completeness</h4>
                                <p class="text-hint">Snapshot coverage metrics and averages.</p>

                                <div class="admin-table-wrap">
                                    <table class="admin-table admin-table--metrics">
                                        <thead>
                                            <tr>
                                                <th>metric</th>
                                                <th>value</th>
                                                <th>description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each completenessRows as r}
                                                <tr>
                                                    <td class="admin-code">{r.k}</td>
                                                    <td>{r.v}</td>
                                                    <td>{r.d}</td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="u-divider"></div>

                            <div>
                                <h4 style="margin:0;">Media size percentiles</h4>
                                <p class="text-hint">Snapshot percentiles (bytes) for image/audio sizes.</p>

                                <div class="admin-table-wrap">
                                    <table class="admin-table admin-table--percentiles">
                                        <thead>
                                            <tr>
                                                <th>type</th>
                                                <th>p90</th>
                                                <th>p99</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>image</td>
                                                <td>{formatBytes(snapshotPercentiles?.image_size_p90 ?? 0)}</td>
                                                <td>{formatBytes(snapshotPercentiles?.image_size_p99 ?? 0)}</td>
                                            </tr>
                                            <tr>
                                                <td>audio</td>
                                                <td>{formatBytes(snapshotPercentiles?.audio_size_p90 ?? 0)}</td>
                                                <td>{formatBytes(snapshotPercentiles?.audio_size_p99 ?? 0)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    {/if}
                {/if}
            </div>
        </section>

        <!-- Distributions -->
        <section class="card">
            <div class="section stack">
                <div class="row" style="justify-content:space-between;align-items:center;">
                    <h3 style="margin:0;">Distributions</h3>
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => toggleAndRerender(() => (showDistributions = !showDistributions))}
                        disabled={busy}
                        title={showDistributions ? "Collapse distributions" : "Expand distributions"}
                        aria-label={showDistributions ? "Collapse distributions" : "Expand distributions"}
                    >
                        {#if showDistributions}
                            <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                        {:else}
                            <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                        {/if}
                    </button>
                </div>

                {#if showDistributions}
                    <div class="stack" style="gap:var(--space-4);">
                        <!-- Country x gender -->
                        <div>
                            <div class="row" style="justify-content:space-between;align-items:center;">
                                <h4 style="margin:0;">Profiles by country and gender</h4>
                                <button
                                    type="button"
                                    class="btn btn--ghost btn--icon"
                                    on:click={() => toggleAndRerender(() => (showCountryGender = !showCountryGender))}
                                    disabled={busy}
                                    title={showCountryGender ? "Collapse country/gender" : "Expand country/gender"}
                                    aria-label={showCountryGender ? "Collapse country/gender" : "Expand country/gender"}
                                >
                                    {#if showCountryGender}
                                        <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                                    {:else}
                                        <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                                    {/if}
                                </button>
                            </div>

                            {#if showCountryGender}
                                <p class="text-hint">Live snapshot from Profile. Columns are gender keys present in the database.</p>

                                <div class="admin-table-wrap">
                                    <table class="admin-table admin-table--countries">
                                        <thead>
                                            <tr>
                                                <th>flag</th>
                                                <th>sub_region</th>
                                                <th>country</th>
                                                {#each genderKeys as g}
                                                    <th>
                                                        <span class="row" style="gap:0.35rem;align-items:center;">
                                                            <Icon icon={genderIcon(g)} />
                                                            <span>{genderLabel(g)}</span>
                                                        </span>
                                                    </th>
                                                {/each}
                                                <th>total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each countriesByGender as c}
                                                <tr>
                                                    <td>
                                                        {#if c.flag_icon}
                                                            <Icon icon={c.flag_icon} />
                                                        {:else}
                                                            -
                                                        {/if}
                                                    </td>
                                                    <td>{c.sub_region}</td>
                                                    <td>{c.name}</td>
                                                    {#each genderKeys as g}
                                                        <td>{countryCount(c, g)}</td>
                                                    {/each}
                                                    <td>{num(c.total, 0)}</td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            {/if}
                        </div>

                        <div class="u-divider"></div>

                        <!-- Elo by gender -->
                        <div>
                            <div class="row" style="justify-content:space-between;align-items:center;">
                                <h4 style="margin:0;">Elo buckets by gender</h4>
                                <button
                                    type="button"
                                    class="btn btn--ghost btn--icon"
                                    on:click={() => toggleAndRerender(() => (showEloGender = !showEloGender))}
                                    disabled={busy}
                                    title={showEloGender ? "Collapse elo/gender" : "Expand elo/gender"}
                                    aria-label={showEloGender ? "Collapse elo/gender" : "Expand elo/gender"}
                                >
                                    {#if showEloGender}
                                        <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                                    {:else}
                                        <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                                    {/if}
                                </button>
                            </div>

                            {#if showEloGender}
                                <p class="text-hint">Live snapshot from Profile. Stacked bars show gender composition within each 100-point Elo bucket.</p>

                                {#if !eloBucketsByGender.length}
                                    <p class="text-hint">No profiles available to compute Elo distribution.</p>
                                {:else}
                                    <div style="height:340px;">
                                        <canvas bind:this={cvEloByGender}></canvas>
                                    </div>
                                {/if}
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </section>

        <!-- Moderation -->
        <section class="card">
            <div class="section stack">
                <div class="row" style="justify-content:space-between;align-items:center;">
                    <h3 style="margin:0;">Moderation</h3>
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => toggleAndRerender(() => (showModeration = !showModeration))}
                        disabled={busy}
                        title={showModeration ? "Collapse moderation" : "Expand moderation"}
                        aria-label={showModeration ? "Collapse moderation" : "Expand moderation"}
                    >
                        {#if showModeration}
                            <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                        {:else}
                            <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                        {/if}
                    </button>
                </div>

                {#if showModeration}
                    {#if !snapshot}
                        <p class="text-hint">No metrics_daily rows in range, so moderation trends are empty.</p>
                    {:else}
                        <div class="stack" style="gap:var(--space-4);">
                            <div>
                                <p class="text-hint">Weekly admin actions by type (stacked).</p>
                                <div style="height:340px;">
                                    <canvas bind:this={cvWeeklyActions}></canvas>
                                </div>
                            </div>

                            <div class="admin-table-wrap">
                                <table class="admin-table admin-table--metrics">
                                    <thead>
                                        <tr>
                                            <th>metric</th>
                                            <th>value</th>
                                            <th>description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td class="admin-code">reports_created (range sum)</td>
                                            <td>{displayIntOrDash(sumDaily("reports_created"))}</td>
                                            <td>Total reports created across the requested range (sum of daily rows).</td>
                                        </tr>
                                        <tr>
                                            <td class="admin-code">admin_actions_total (range sum)</td>
                                            <td>{displayIntOrDash(sumDaily("admin_actions_total"))}</td>
                                            <td>Total admin actions across the requested range (sum of daily rows).</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    {/if}
                {/if}
            </div>
        </section>
    {/if}
</div>
