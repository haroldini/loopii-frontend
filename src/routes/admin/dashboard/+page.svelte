
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
    let weeks = 12;

    // section collapse state
    let showTotals = true;
    let showEngagement = true;
    let showQuality = true;
    let showGrowth = true;
    let showRecency = true;
    let showDistributions = true;
    let showModeration = true;

    // distribution sub-sections
    let showElo = true;
    let showCountries = true;
    let showGenders = true;

    // canvases
    let cvWeeklyActivity;
    let cvWeeklyMutual;

    let cvWeeklyReports;
    let cvWeeklyActions;
    let cvMonthlyReports;

    let cvMonthlyProfiles;
    let cvMonthlyCumulative;

    let cvMonthlyLastSeen;
    let cvRecencyDecay;

    let cvEloBuckets;

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

    function computeRecencyCumulative(monthly) {
        // Reverse cumulative of monthly profiles_last_seen
        const counts = (monthly || []).map((r) => num(r?.profiles_last_seen, 0));
        const out = new Array(counts.length).fill(0);

        let running = 0;
        for (let i = counts.length - 1; i >= 0; i--) {
            running += counts[i];
            out[i] = running;
        }
        return out;
    }

    async function renderCharts() {
        if (!browser) return;
        if (!data) return;

        destroyCharts();

        const mod = await import("chart.js/auto");
        const Chart = mod.default;

        const weekly = data?.timeseries?.weekly || [];
        const monthly = data?.timeseries?.monthly || [];

        const wLabels = weekly.map((r) => isoToYMD(r.bucket_start));
        const mLabels = monthly.map((r) => isoToYM(r.bucket_start));

        // Engagement charts
        if (showEngagement && cvWeeklyActivity) {
            charts.push(
                new Chart(cvWeeklyActivity, {
                    type: "line",
                    data: {
                        labels: wLabels,
                        datasets: [
                            {
                                label: "decisions",
                                data: weekly.map((r) => num(r.decisions_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "connect decisions",
                                data: weekly.map((r) => num(r.connect_decisions_created, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "loops",
                                data: weekly.map((r) => num(r.loops_created, 0)),
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

        if (showEngagement && cvWeeklyMutual) {
            charts.push(
                new Chart(cvWeeklyMutual, {
                    type: "line",
                    data: {
                        labels: wLabels,
                        datasets: [
                            {
                                label: "mutual connect %",
                                data: weekly.map((r) => num(r?.mutual_connect_eventual?.pct, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => `${ctx.dataset.label}: ${formatPct(ctx.parsed.y)}`,
                                },
                            },
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                suggestedMax: 100,
                                ticks: { callback: (v) => `${v}%` },
                            },
                        },
                    },
                })
            );
        }

        // Growth charts
        if (showGrowth && cvMonthlyProfiles) {
            charts.push(
                new Chart(cvMonthlyProfiles, {
                    type: "line",
                    data: {
                        labels: mLabels,
                        datasets: [
                            {
                                label: "profiles created (all)",
                                data: monthly.map((r) => num(r.profiles_created_all, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "profiles created (active now)",
                                data: monthly.map((r) => num(r.profiles_created_active_now, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } },
                    },
                })
            );
        }

        if (showGrowth && cvMonthlyCumulative) {
            charts.push(
                new Chart(cvMonthlyCumulative, {
                    type: "line",
                    data: {
                        labels: mLabels,
                        datasets: [
                            {
                                label: "cumulative created (all)",
                                data: monthly.map((r) => num(r.profiles_created_cumulative_all, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "cumulative created (active now)",
                                data: monthly.map((r) => num(r.profiles_created_cumulative_active_now, 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } },
                    },
                })
            );
        }

        // Recency charts
        if (showRecency && cvMonthlyLastSeen) {
            charts.push(
                new Chart(cvMonthlyLastSeen, {
                    type: "bar",
                    data: {
                        labels: mLabels,
                        datasets: [
                            {
                                label: "profiles last seen (by month)",
                                data: monthly.map((r) => num(r.profiles_last_seen, 0)),
                                borderWidth: 1,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } },
                    },
                })
            );
        }

        if (showRecency && cvRecencyDecay) {
            const cum = computeRecencyCumulative(monthly);
            charts.push(
                new Chart(cvRecencyDecay, {
                    type: "line",
                    data: {
                        labels: mLabels,
                        datasets: [
                            {
                                label: "last seen since month (cumulative in window)",
                                data: cum,
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

        // Distributions charts
        if (showDistributions && showElo && cvEloBuckets) {
            const buckets = data?.breakdowns?.profiles_by_elo_bucket || [];
            charts.push(
                new Chart(cvEloBuckets, {
                    type: "bar",
                    data: {
                        labels: buckets.map((b) => b.label),
                        datasets: [
                            {
                                label: "profiles",
                                data: buckets.map((b) => num(b.count, 0)),
                                borderWidth: 1,
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

        // Moderation charts
        if (showModeration && cvWeeklyReports) {
            charts.push(
                new Chart(cvWeeklyReports, {
                    type: "bar",
                    data: {
                        labels: wLabels,
                        datasets: [
                            {
                                label: "reports created",
                                data: weekly.map((r) => num(r.reports_created, 0)),
                                borderWidth: 1,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
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

        if (showModeration && cvMonthlyReports) {
            charts.push(
                new Chart(cvMonthlyReports, {
                    type: "bar",
                    data: {
                        labels: mLabels,
                        datasets: [
                            {
                                label: "reports created",
                                data: monthly.map((r) => num(r.reports_created, 0)),
                                borderWidth: 1,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } },
                    },
                })
            );
        }
    }

    async function load() {
        if (loading) return;
        loading = true;

        try {
            data = await adminGetDashboard({ weeks });
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

    function onWeeksChange(e) {
        const v = Number(e?.currentTarget?.value);
        if (!isFinite(v) || v <= 0) return;
        weeks = v;
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

    // ----- derived display data

    $: dau = data?.activity?.dau ?? data?.totals?.dau ?? null;
    $: wau = data?.activity?.wau ?? data?.totals?.wau ?? null;
    $: mau = data?.activity?.mau ?? data?.totals?.mau ?? null;

    $: totalsRows = [
        { k: "profiles_total", v: data?.totals?.profiles_total ?? "-", d: "Total profiles in the database." },
        { k: "profiles_active_total", v: data?.totals?.profiles_active_total ?? "-", d: "Profiles that pass current access gating." },
        { k: "DAU", v: displayIntOrDash(dau), d: "Profiles seen in the last 24 hours." },
        { k: "WAU", v: displayIntOrDash(wau), d: "Profiles seen in the last 7 days." },
        { k: "MAU", v: displayIntOrDash(mau), d: "Profiles seen in the last 30 days." },
        { k: "open_reports_total", v: data?.totals?.open_reports_total ?? "-", d: "Reports with status open." },
        { k: "loops_total", v: data?.totals?.loops_total ?? "-", d: "Total loops created." },
        { k: "decisions_total", v: data?.totals?.decisions_total ?? "-", d: "Total decisions stored." },
        { k: "connect_decisions_total", v: data?.totals?.connect_decisions_total ?? "-", d: "Decisions where connect is true." },
        { k: "profiles_invisible_total", v: data?.totals?.profiles_invisible_total ?? "-", d: "Profiles with is_visible set to false." },
        { k: "profiles_invisible_pct", v: formatPct(data?.totals?.profiles_invisible_pct ?? 0), d: "Invisible profiles as a percent of total." },
    ];

    $: completenessRows = [
        { k: "with_location_pct", v: formatPct(data?.completeness?.with_location_pct ?? 0), d: "Has a location string." },
        { k: "with_latlng_pct", v: formatPct(data?.completeness?.with_latlng_pct ?? 0), d: "Has latitude and longitude." },
        { k: "with_mbti_or_star_sign_pct", v: formatPct(data?.completeness?.with_mbti_or_star_sign_pct ?? 0), d: "Has MBTI or star sign." },
        { k: "with_bio_or_looking_for_pct", v: formatPct(data?.completeness?.with_bio_or_looking_for_pct ?? 0), d: "Has bio or looking_for." },
        { k: "with_loop_bio_pct", v: formatPct(data?.completeness?.with_loop_bio_pct ?? 0), d: "Has loop bio." },
        { k: "with_audio_pct", v: formatPct(data?.completeness?.with_audio_pct ?? 0), d: "Has voice intro audio." },
        { k: "no_socials_pct", v: formatPct(data?.completeness?.no_socials_pct ?? 0), d: "Has zero socials linked." },
        { k: "zero_images_pct", v: formatPct(data?.completeness?.zero_images_pct ?? 0), d: "Has zero images." },
        { k: "only_one_image_pct", v: formatPct(data?.completeness?.only_one_image_pct ?? 0), d: "Has exactly one image." },
        { k: "invisible_pct", v: formatPct(data?.completeness?.invisible_pct ?? 0), d: "Invisible profiles as a percent of total." },
        { k: "avg_text_len_per_profile", v: num(data?.completeness?.avg_text_len_per_profile, 0).toFixed(1), d: "Average total text length per profile." },
        { k: "avg_pics_per_profile", v: num(data?.completeness?.avg_pics_per_profile, 0).toFixed(2), d: "Average images per profile." },
        { k: "avg_socials_per_profile", v: num(data?.completeness?.avg_socials_per_profile, 0).toFixed(2), d: "Average socials per profile." },
    ];

    $: engagementRows = [
        { k: "elo_games_zero_total", v: data?.engagement?.elo_games_zero_total ?? "-", d: "Profiles with elo_games equal to 0." },
        { k: "elo_games_zero_pct", v: formatPct(data?.engagement?.elo_games_zero_pct ?? 0), d: "elo_games equal to 0 as a percent of total." },
        {
            k: "decisions per new profile (7d)",
            v: num(data?.engagement?.decisions_per_new_profile?.d7?.avg_decisions_per_profile, 0).toFixed(2),
            d: `Last 7 days. Profiles ${data?.engagement?.decisions_per_new_profile?.d7?.profiles ?? 0}. Any decisions ${formatPct(data?.engagement?.decisions_per_new_profile?.d7?.pct_with_any_decision ?? 0)}.`,
        },
        {
            k: "decisions per new profile (30d)",
            v: num(data?.engagement?.decisions_per_new_profile?.d30?.avg_decisions_per_profile, 0).toFixed(2),
            d: `Last 30 days. Profiles ${data?.engagement?.decisions_per_new_profile?.d30?.profiles ?? 0}. Any decisions ${formatPct(data?.engagement?.decisions_per_new_profile?.d30?.pct_with_any_decision ?? 0)}.`,
        },
    ];

    $: pctImage = data?.percentiles?.image_size_bytes || {};
    $: pctAudio = data?.percentiles?.audio_size_bytes || {};

    $: countries = (data?.breakdowns?.profiles_by_country || []).map((r) => {
        const cm = $countryMap || {};
        const c = r?.country_id ? cm[r.country_id] : null;

        const code = (r?.code || c?.code || "").toString();
        const flag_icon = c?.flag_icon || (code ? `circle-flags:${code.toLowerCase()}` : null);
        const sub_region = c?.sub_region || c?.subregion || c?.region || "-";
        const name = r?.name || c?.name || "-";

        return {
            country_id: r?.country_id || null,
            code: code || null,
            flag_icon,
            sub_region,
            name,
            count: num(r?.count, 0),
        };
    });

    $: genders = (data?.breakdowns?.profiles_by_gender || []).map((r) => {
        const g = (r?.gender || "other").toString().toLowerCase();
        const icon = GENDER_ICONS[g] || GENDER_ICONS.other;
        return { gender: g, icon, count: num(r?.count, 0) };
    });

    function titleCase(s) {
        const t = (s || "").toString();
        if (!t) return "-";
        return t.charAt(0).toUpperCase() + t.slice(1);
    }
</script>

<svelte:head>
    <title>loopii • Admin • Dashboard</title>
</svelte:head>

<div class="stack">
    <div class="toolbar">
        <div class="toolbar__group">
            <h3>Dashboard</h3>
            {#if data?.range?.weeks?.start && data?.range?.weeks?.end}
                <span class="pill"><span class="pill__label">weeks: {data.range.weeks.count}</span></span>
                <span class="pill"><span class="pill__label">{isoToYMD(data.range.weeks.start)} -> {isoToYMD(data.range.weeks.end)}</span></span>
            {/if}
        </div>

        <div class="toolbar__group">
            <select disabled={busy} on:change={onWeeksChange} aria-label="Weeks range">
                <option value="4" selected={weeks === 4}>4w</option>
                <option value="8" selected={weeks === 8}>8w</option>
                <option value="12" selected={weeks === 12}>12w</option>
            </select>

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
                    <p class="text-hint">Snapshot totals and active counts.</p>

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
            </div>
        </section>

        <!-- Engagement -->
        <section class="card">
            <div class="section stack">
                <div class="row" style="justify-content:space-between;align-items:center;">
                    <h3 style="margin:0;">Engagement</h3>
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => toggleAndRerender(() => (showEngagement = !showEngagement))}
                        disabled={busy}
                        title={showEngagement ? "Collapse engagement" : "Expand engagement"}
                        aria-label={showEngagement ? "Collapse engagement" : "Expand engagement"}
                    >
                        {#if showEngagement}
                            <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                        {:else}
                            <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                        {/if}
                    </button>
                </div>

                {#if showEngagement}
                    <div class="stack" style="gap:var(--space-4);">
                        <div>
                            <p class="text-hint">Weekly activity for decisions, connect decisions, and loops.</p>
                            <div style="height:280px;">
                                <canvas bind:this={cvWeeklyActivity}></canvas>
                            </div>
                        </div>

                        <div>
                            <p class="text-hint">Weekly mutual connect percent for connect decisions.</p>
                            <div style="height:240px;">
                                <canvas bind:this={cvWeeklyMutual}></canvas>
                            </div>
                        </div>

                        <div class="u-divider"></div>

                        <div>
                            <h4 style="margin:0;">Activation</h4>
                            <p class="text-hint">New profile behavior windows.</p>

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
                                        {#each engagementRows as r}
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
                    </div>
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
                    <div class="stack" style="gap:var(--space-4);">
                        <div>
                            <h4 style="margin:0;">Completeness</h4>
                            <p class="text-hint">Coverage metrics and averages.</p>

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
                            <p class="text-hint">Global percentiles for image and audio sizes.</p>

                            <div class="admin-table-wrap">
                                <table class="admin-table admin-table--percentiles">
                                    <thead>
                                        <tr>
                                            <th>type</th>
                                            <th>p50</th>
                                            <th>p75</th>
                                            <th>p90</th>
                                            <th>p99</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>image</td>
                                            <td>{formatBytes(pctImage.p50 ?? 0)}</td>
                                            <td>{formatBytes(pctImage.p75 ?? 0)}</td>
                                            <td>{formatBytes(pctImage.p90 ?? 0)}</td>
                                            <td>{formatBytes(pctImage.p99 ?? 0)}</td>
                                        </tr>
                                        <tr>
                                            <td>audio</td>
                                            <td>{formatBytes(pctAudio.p50 ?? 0)}</td>
                                            <td>{formatBytes(pctAudio.p75 ?? 0)}</td>
                                            <td>{formatBytes(pctAudio.p90 ?? 0)}</td>
                                            <td>{formatBytes(pctAudio.p99 ?? 0)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </section>

        <!-- Growth -->
        <section class="card">
            <div class="section stack">
                <div class="row" style="justify-content:space-between;align-items:center;">
                    <h3 style="margin:0;">Growth</h3>
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => toggleAndRerender(() => (showGrowth = !showGrowth))}
                        disabled={busy}
                        title={showGrowth ? "Collapse growth" : "Expand growth"}
                        aria-label={showGrowth ? "Collapse growth" : "Expand growth"}
                    >
                        {#if showGrowth}
                            <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                        {:else}
                            <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                        {/if}
                    </button>
                </div>

                {#if showGrowth}
                    <div class="stack" style="gap:var(--space-4);">
                        <div>
                            <p class="text-hint">Monthly profiles created for all and active now.</p>
                            <div style="height:260px;">
                                <canvas bind:this={cvMonthlyProfiles}></canvas>
                            </div>
                        </div>

                        <div>
                            <p class="text-hint">Monthly cumulative created totals across the window.</p>
                            <div style="height:260px;">
                                <canvas bind:this={cvMonthlyCumulative}></canvas>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </section>

        <!-- Recency -->
        <section class="card">
            <div class="section stack">
                <div class="row" style="justify-content:space-between;align-items:center;">
                    <h3 style="margin:0;">Recency</h3>
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={() => toggleAndRerender(() => (showRecency = !showRecency))}
                        disabled={busy}
                        title={showRecency ? "Collapse recency" : "Expand recency"}
                        aria-label={showRecency ? "Collapse recency" : "Expand recency"}
                    >
                        {#if showRecency}
                            <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                        {:else}
                            <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                        {/if}
                    </button>
                </div>

                {#if showRecency}
                    <div class="stack" style="gap:var(--space-4);">
                        <div>
                            <p class="text-hint">Monthly last seen distribution using each profile's current last_seen_at.</p>
                            <div style="height:240px;">
                                <canvas bind:this={cvMonthlyLastSeen}></canvas>
                            </div>
                        </div>

                        <div>
                            <p class="text-hint">Reverse cumulative view of the last seen distribution.</p>
                            <div style="height:240px;">
                                <canvas bind:this={cvRecencyDecay}></canvas>
                            </div>
                        </div>
                    </div>
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
                        <!-- Elo -->
                        <div>
                            <div class="row" style="justify-content:space-between;align-items:center;">
                                <h4 style="margin:0;">Elo buckets</h4>
                                <button
                                    type="button"
                                    class="btn btn--ghost btn--icon"
                                    on:click={() => toggleAndRerender(() => (showElo = !showElo))}
                                    disabled={busy}
                                    title={showElo ? "Collapse elo" : "Expand elo"}
                                    aria-label={showElo ? "Collapse elo" : "Expand elo"}
                                >
                                    {#if showElo}
                                        <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                                    {:else}
                                        <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                                    {/if}
                                </button>
                            </div>

                            {#if showElo}
                                <p class="text-hint">Profiles per 100 point bucket.</p>
                                <div style="height:280px;">
                                    <canvas bind:this={cvEloBuckets}></canvas>
                                </div>
                            {/if}
                        </div>

                        <div class="u-divider"></div>

                        <!-- Countries -->
                        <div>
                            <div class="row" style="justify-content:space-between;align-items:center;">
                                <h4 style="margin:0;">Profiles by country</h4>
                                <button
                                    type="button"
                                    class="btn btn--ghost btn--icon"
                                    on:click={() => toggleAndRerender(() => (showCountries = !showCountries))}
                                    disabled={busy}
                                    title={showCountries ? "Collapse countries" : "Expand countries"}
                                    aria-label={showCountries ? "Collapse countries" : "Expand countries"}
                                >
                                    {#if showCountries}
                                        <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                                    {:else}
                                        <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                                    {/if}
                                </button>
                            </div>

                            {#if showCountries}
                                <p class="text-hint">Distribution by country_id with reference data when available.</p>

                                <div class="admin-table-wrap">
                                    <table class="admin-table admin-table--countries">
                                        <thead>
                                            <tr>
                                                <th>flag</th>
                                                <th>sub_region</th>
                                                <th>country</th>
                                                <th>count</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each countries as c}
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
                                                    <td>{c.count}</td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            {/if}
                        </div>

                        <div class="u-divider"></div>

                        <!-- Gender -->
                        <div>
                            <div class="row" style="justify-content:space-between;align-items:center;">
                                <h4 style="margin:0;">Profiles by gender</h4>
                                <button
                                    type="button"
                                    class="btn btn--ghost btn--icon"
                                    on:click={() => toggleAndRerender(() => (showGenders = !showGenders))}
                                    disabled={busy}
                                    title={showGenders ? "Collapse genders" : "Expand genders"}
                                    aria-label={showGenders ? "Collapse genders" : "Expand genders"}
                                >
                                    {#if showGenders}
                                        <Icon icon={UI_ICONS.chevronUp} class="btn__icon" />
                                    {:else}
                                        <Icon icon={UI_ICONS.chevronDown} class="btn__icon" />
                                    {/if}
                                </button>
                            </div>

                            {#if showGenders}
                                <p class="text-hint">Distribution by profiles.gender.</p>

                                <div class="admin-table-wrap">
                                    <table class="admin-table admin-table--genders">
                                        <thead>
                                            <tr>
                                                <th>icon</th>
                                                <th>gender</th>
                                                <th>count</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each genders as g}
                                                <tr>
                                                    <td><Icon icon={g.icon} /></td>
                                                    <td>{titleCase(g.gender)}</td>
                                                    <td>{g.count}</td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
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
                    <div class="stack" style="gap:var(--space-4);">
                        <div>
                            <p class="text-hint">Weekly reports created.</p>
                            <div style="height:220px;">
                                <canvas bind:this={cvWeeklyReports}></canvas>
                            </div>
                        </div>

                        <div>
                            <p class="text-hint">Weekly admin actions by type.</p>
                            <div style="height:320px;">
                                <canvas bind:this={cvWeeklyActions}></canvas>
                            </div>
                        </div>

                        <div>
                            <p class="text-hint">Monthly reports created.</p>
                            <div style="height:220px;">
                                <canvas bind:this={cvMonthlyReports}></canvas>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </section>
    {/if}
</div>
