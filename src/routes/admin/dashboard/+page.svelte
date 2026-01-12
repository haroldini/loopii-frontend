
<!-- /admin/dashboard -->

<script>
    import Icon from "@iconify/svelte";
    import { browser } from "$app/environment";
    import { onDestroy, onMount } from "svelte";

    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";
    import { adminGetDashboard } from "$lib/api/admin.js";

    let loading = false;
    let data = null;

    let weeks = 12;

    // canvases
    let cvWeeklyActivity;
    let cvWeeklyMutual;
    let cvWeeklyActions;
    let cvMonthlyProfiles;
    let cvMonthlyCumulative;
    let cvMonthlyReports;
    let cvMonthlyLastSeen;
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

    function destroyCharts() {
        for (const c of charts) {
            try {
                c?.destroy?.();
            } catch {}
        }
        charts = [];
    }

    async function renderCharts() {
        if (!browser) return;
        if (!data) return;

        destroyCharts();

        // Dynamic import prevents SSR touching Chart.js
        const mod = await import("chart.js/auto");
        const Chart = mod.default;

        const weekly = data?.timeseries?.weekly || [];
        const monthly = data?.timeseries?.monthly || [];

        const wLabels = weekly.map((r) => isoToYMD(r.bucket_start));
        const mLabels = monthly.map((r) => isoToYM(r.bucket_start));

        // --- Weekly activity (line)
        if (cvWeeklyActivity) {
            charts.push(
                new Chart(cvWeeklyActivity, {
                    type: "line",
                    data: {
                        labels: wLabels,
                        datasets: [
                            {
                                label: "decisions",
                                data: weekly.map((r) => Number(r.decisions_created || 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "connect decisions",
                                data: weekly.map((r) => Number(r.connect_decisions_created || 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "loops",
                                data: weekly.map((r) => Number(r.loops_created || 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "reports",
                                data: weekly.map((r) => Number(r.reports_created || 0)),
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
                        },
                        scales: {
                            y: { beginAtZero: true },
                        },
                    },
                })
            );
        }

        // --- Weekly mutual connect % (line)
        if (cvWeeklyMutual) {
            charts.push(
                new Chart(cvWeeklyMutual, {
                    type: "line",
                    data: {
                        labels: wLabels,
                        datasets: [
                            {
                                label: "mutual connect %",
                                data: weekly.map((r) => Number(r?.mutual_connect_eventual?.pct || 0)),
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
                                ticks: {
                                    callback: (v) => `${v}%`,
                                },
                            },
                        },
                    },
                })
            );
        }

        // --- Weekly admin actions by type (stacked bar)
        if (cvWeeklyActions) {
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
                            data: weekly.map((r) => Number((r?.admin_actions_by_type || {})[t] || 0)),
                            borderWidth: 1,
                        })),
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true },
                        },
                        scales: {
                            x: { stacked: true },
                            y: { stacked: true, beginAtZero: true },
                        },
                    },
                })
            );
        }

        // --- Monthly profiles created (line)
        if (cvMonthlyProfiles) {
            charts.push(
                new Chart(cvMonthlyProfiles, {
                    type: "line",
                    data: {
                        labels: mLabels,
                        datasets: [
                            {
                                label: "profiles created (all)",
                                data: monthly.map((r) => Number(r.profiles_created_all || 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "profiles created (active now)",
                                data: monthly.map((r) => Number(r.profiles_created_active_now || 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true },
                        },
                    },
                })
            );
        }

        // --- Monthly profiles cumulative (line)
        if (cvMonthlyCumulative) {
            charts.push(
                new Chart(cvMonthlyCumulative, {
                    type: "line",
                    data: {
                        labels: mLabels,
                        datasets: [
                            {
                                label: "cumulative created (all)",
                                data: monthly.map((r) => Number(r.profiles_created_cumulative_all || 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                            {
                                label: "cumulative created (active now)",
                                data: monthly.map((r) => Number(r.profiles_created_cumulative_active_now || 0)),
                                borderWidth: 2,
                                tension: 0.25,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true },
                        },
                    },
                })
            );
        }

        // --- Monthly reports created (bar)
        if (cvMonthlyReports) {
            charts.push(
                new Chart(cvMonthlyReports, {
                    type: "bar",
                    data: {
                        labels: mLabels,
                        datasets: [
                            {
                                label: "reports created",
                                data: monthly.map((r) => Number(r.reports_created || 0)),
                                borderWidth: 1,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true },
                        },
                    },
                })
            );
        }

        // --- Monthly last seen (bar)
        if (cvMonthlyLastSeen) {
            charts.push(
                new Chart(cvMonthlyLastSeen, {
                    type: "bar",
                    data: {
                        labels: mLabels,
                        datasets: [
                            {
                                label: "profiles last seen (snapshot)",
                                data: monthly.map((r) => Number(r.profiles_last_seen || 0)),
                                borderWidth: 1,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true },
                        },
                    },
                })
            );
        }

        // --- Elo buckets (bar)
        if (cvEloBuckets) {
            const buckets = data?.breakdowns?.profiles_by_elo_bucket || [];
            charts.push(
                new Chart(cvEloBuckets, {
                    type: "bar",
                    data: {
                        labels: buckets.map((b) => b.label),
                        datasets: [
                            {
                                label: "profiles",
                                data: buckets.map((b) => Number(b.count || 0)),
                                borderWidth: 1,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true },
                        },
                        scales: {
                            y: { beginAtZero: true },
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
            data = await adminGetDashboard({ weeks });
            if (browser) await renderCharts();
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

    onMount(() => {
        load();
    });

    onDestroy(() => {
        destroyCharts();
    });
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
                <span class="pill"><span class="pill__label">{isoToYMD(data.range.weeks.start)} → {isoToYMD(data.range.weeks.end)}</span></span>
            {/if}
        </div>

        <div class="toolbar__group">
            <select disabled={loading} on:change={onWeeksChange} aria-label="Weeks range">
                <option value="4" selected={weeks === 4}>4w</option>
                <option value="8" selected={weeks === 8}>8w</option>
                <option value="12" selected={weeks === 12}>12w</option>
            </select>

            <button
                type="button"
                class="btn btn--ghost btn--icon"
                class:is-loading={loading}
                on:click={load}
                disabled={loading}
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
        <section class="card">
            <div class="section stack">
                <h3>Totals</h3>

                <dl class="admin-kv">
                    <dt>profiles_total</dt><dd>{data?.totals?.profiles_total ?? "-"}</dd>
                    <dt>profiles_active_total</dt><dd>{data?.totals?.profiles_active_total ?? "-"}</dd>

                    <dt>open_reports_total</dt><dd>{data?.totals?.open_reports_total ?? "-"}</dd>

                    <dt>loops_total</dt><dd>{data?.totals?.loops_total ?? "-"}</dd>
                    <dt>decisions_total</dt><dd>{data?.totals?.decisions_total ?? "-"}</dd>
                    <dt>connect_decisions_total</dt><dd>{data?.totals?.connect_decisions_total ?? "-"}</dd>

                    <dt>profiles_invisible_total</dt><dd>{data?.totals?.profiles_invisible_total ?? "-"}</dd>
                    <dt>profiles_invisible_pct</dt><dd>{formatPct(data?.totals?.profiles_invisible_pct ?? 0)}</dd>
                </dl>
            </div>
        </section>

        <section class="card">
            <div class="section stack">
                <h3>Weekly</h3>

                <div class="stack" style="gap:var(--space-4);">
                    <div style="height:280px;">
                        <canvas bind:this={cvWeeklyActivity}></canvas>
                    </div>

                    <div style="height:240px;">
                        <canvas bind:this={cvWeeklyMutual}></canvas>
                    </div>

                    <div style="height:320px;">
                        <canvas bind:this={cvWeeklyActions}></canvas>
                    </div>
                </div>
            </div>
        </section>

        <section class="card">
            <div class="section stack">
                <h3>Monthly</h3>

                <div class="stack" style="gap:var(--space-4);">
                    <div style="height:260px;">
                        <canvas bind:this={cvMonthlyProfiles}></canvas>
                    </div>

                    <div style="height:260px;">
                        <canvas bind:this={cvMonthlyCumulative}></canvas>
                    </div>

                    <div style="height:220px;">
                        <canvas bind:this={cvMonthlyReports}></canvas>
                    </div>

                    <div style="height:220px;">
                        <canvas bind:this={cvMonthlyLastSeen}></canvas>
                    </div>
                </div>
            </div>
        </section>

        <section class="card">
            <div class="section stack">
                <h3>Breakdowns</h3>

                <h4 style="margin:0;">Elo buckets</h4>
                <div style="height:280px;">
                    <canvas bind:this={cvEloBuckets}></canvas>
                </div>

                <div class="u-divider"></div>

                <h4 style="margin:0;">Completeness</h4>
                <dl class="admin-kv">
                    <dt>with_location_pct</dt><dd>{formatPct(data?.completeness?.with_location_pct ?? 0)}</dd>
                    <dt>with_latlng_pct</dt><dd>{formatPct(data?.completeness?.with_latlng_pct ?? 0)}</dd>
                    <dt>with_mbti_or_star_sign_pct</dt><dd>{formatPct(data?.completeness?.with_mbti_or_star_sign_pct ?? 0)}</dd>
                    <dt>with_bio_or_looking_for_pct</dt><dd>{formatPct(data?.completeness?.with_bio_or_looking_for_pct ?? 0)}</dd>
                    <dt>with_loop_bio_pct</dt><dd>{formatPct(data?.completeness?.with_loop_bio_pct ?? 0)}</dd>
                    <dt>with_audio_pct</dt><dd>{formatPct(data?.completeness?.with_audio_pct ?? 0)}</dd>
                    <dt>no_socials_pct</dt><dd>{formatPct(data?.completeness?.no_socials_pct ?? 0)}</dd>
                    <dt>zero_images_pct</dt><dd>{formatPct(data?.completeness?.zero_images_pct ?? 0)}</dd>
                    <dt>only_one_image_pct</dt><dd>{formatPct(data?.completeness?.only_one_image_pct ?? 0)}</dd>
                    <dt>invisible_pct</dt><dd>{formatPct(data?.completeness?.invisible_pct ?? 0)}</dd>

                    <dt>avg_text_len_per_profile</dt><dd>{Number(data?.completeness?.avg_text_len_per_profile ?? 0).toFixed(1)}</dd>
                    <dt>avg_pics_per_profile</dt><dd>{Number(data?.completeness?.avg_pics_per_profile ?? 0).toFixed(2)}</dd>
                    <dt>avg_socials_per_profile</dt><dd>{Number(data?.completeness?.avg_socials_per_profile ?? 0).toFixed(2)}</dd>
                </dl>

                <div class="u-divider"></div>

                <h4 style="margin:0;">Percentiles</h4>
                <dl class="admin-kv">
                    <dt>image p90</dt><dd>{formatBytes(data?.percentiles?.image_size_bytes?.p90 ?? 0)}</dd>
                    <dt>image p99</dt><dd>{formatBytes(data?.percentiles?.image_size_bytes?.p99 ?? 0)}</dd>
                    <dt>audio p90</dt><dd>{formatBytes(data?.percentiles?.audio_size_bytes?.p90 ?? 0)}</dd>
                    <dt>audio p99</dt><dd>{formatBytes(data?.percentiles?.audio_size_bytes?.p99 ?? 0)}</dd>
                </dl>

                <div class="u-divider"></div>

                <h4 style="margin:0;">Engagement</h4>
                <dl class="admin-kv">
                    <dt>elo_games_zero_total</dt><dd>{data?.engagement?.elo_games_zero_total ?? "-"}</dd>
                    <dt>elo_games_zero_pct</dt><dd>{formatPct(data?.engagement?.elo_games_zero_pct ?? 0)}</dd>
                    <dt>decisions/new profile (7d)</dt>
                    <dd>
                        {Number(data?.engagement?.decisions_per_new_profile?.d7?.avg_decisions_per_profile ?? 0).toFixed(2)}
                        (profiles: {data?.engagement?.decisions_per_new_profile?.d7?.profiles ?? 0},
                        any: {formatPct(data?.engagement?.decisions_per_new_profile?.d7?.pct_with_any_decision ?? 0)})
                    </dd>
                    <dt>decisions/new profile (30d)</dt>
                    <dd>
                        {Number(data?.engagement?.decisions_per_new_profile?.d30?.avg_decisions_per_profile ?? 0).toFixed(2)}
                        (profiles: {data?.engagement?.decisions_per_new_profile?.d30?.profiles ?? 0},
                        any: {formatPct(data?.engagement?.decisions_per_new_profile?.d30?.pct_with_any_decision ?? 0)})
                    </dd>
                </dl>
            </div>
        </section>
    {/if}
</div>
