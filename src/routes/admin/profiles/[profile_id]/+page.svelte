
<script>
    import Icon from "@iconify/svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";

    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

    import {
        ADMIN_REASON_CODE_OPTIONS,
        ADMIN_CLEAR_FIELD_OPTIONS,
        validateReasonCode,
        validatePublicMessage,
        validateInternalNote,
        validateUntil,
        validateAdminClearField,
        validateAdminClearValue,
    } from "$lib/utils/validators.js";

    import { relativeTime, formatDateTimeShort } from "$lib/utils/profile.js";

    import {
        adminGetProfile,
        adminWarnProfile,
        adminBanProfile,
        adminTempBanProfile,
        adminUnbanProfile,
        adminClearContent,
        adminDeleteProfileImage,
        adminDeleteProfileAudio,
    } from "$lib/api/admin.js";

    let loading = false;
    let acting = false;
    let data = null;

    let profileId;
    let lastProfileId = null;

    // shared moderation context
    let reason_code = "";
    let public_message = "";
    let internal_note = "";

    // temp ban extra
    let until_local = "";

    // clear content extra
    let clear_field = "bio";
    let clear_value = "";

    // minimisable sections
    let showOverview = true;
    let showStats = true;

    // expansion state
    let expandedReportsReceived = new Set();
    let expandedReportsMade = new Set();
    let expandedActionsReceived = new Set();
    let expandedActionsMade = new Set();

    // ids
    const id_reason = "admin_action_reason";
    const id_public = "admin_action_public";
    const id_internal = "admin_action_internal";
    const id_until = "admin_action_until";
    const id_clear_field = "admin_clear_field";
    const id_clear_value = "admin_clear_value";

    function toastErr(err, fallback) {
        addToast({ text: err?.message || fallback || "Request failed.", autoHideMs: 6000 });
    }

    function toastValidation(e) {
        addToast({ text: e?.message || "Invalid input.", autoHideMs: 5000 });
    }

    function firstError(list) {
        return (list || []).find(Boolean) || null;
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
        const pct = n <= 1 ? n * 100 : n;
        if (pct === 0) return "0%";
        return pct < 1 ? `${pct.toFixed(1)}%` : `${pct.toFixed(0)}%`;
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

    function keyOf(obj, fallback = "") {
        if (!obj) return fallback;
        return (
            obj.id ||
            `${obj.created_at || ""}:${obj.reporter_profile_id || ""}:${obj.reportee_profile_id || ""}:${obj.admin_profile_id || ""}:${obj.target_profile_id || ""}` ||
            fallback
        );
    }

    function toggleSet(set, key) {
        const next = new Set(set);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
    }

    function toggleReportReceived(k) {
        expandedReportsReceived = toggleSet(expandedReportsReceived, k);
    }
    function toggleReportMade(k) {
        expandedReportsMade = toggleSet(expandedReportsMade, k);
    }
    function toggleActionReceived(k) {
        expandedActionsReceived = toggleSet(expandedActionsReceived, k);
    }
    function toggleActionMade(k) {
        expandedActionsMade = toggleSet(expandedActionsMade, k);
    }

    function gotoProfile(id) {
        if (!id) return;
        goto(`/admin/profiles/${id}`);
    }

    $: profileId = $page.params.profile_id;

    async function load() {
        if (!profileId) return;
        if (loading) return;

        loading = true;
        try {
            data = await adminGetProfile(profileId);
        } catch (err) {
            toastErr(err, "Failed to load profile.");
        } finally {
            loading = false;
        }
    }

    $: if (profileId && profileId !== lastProfileId) {
        lastProfileId = profileId;
        data = null;
        load();
    }

    function validateContext({ requireReason = true } = {}) {
        return firstError([
            validateReasonCode(reason_code, { field: "reason_code", required: requireReason }),
            validatePublicMessage(public_message, { field: "public_message", required: false }),
            validateInternalNote(internal_note, { field: "internal_note", required: false }),
        ]);
    }

    async function runAction(fn) {
        if (acting) return;
        acting = true;

        try {
            await fn();
            addToast({ text: "Updated.", autoHideMs: 2000 });
            await load();
        } catch (err) {
            throw err;
        } finally {
            acting = false;
        }
    }

    async function doWarn() {
        const e = validateContext({ requireReason: true });
        if (e) return toastValidation(e);

        try {
            await runAction(async () => {
                await adminWarnProfile(profileId, {
                    reason_code,
                    public_message: public_message?.trim() || null,
                    internal_note: internal_note?.trim() || null,
                });
            });
        } catch (err) {
            toastErr(err, "Failed to warn.");
        }
    }

    async function doBan() {
        const e = validateContext({ requireReason: true });
        if (e) return toastValidation(e);

        try {
            await runAction(async () => {
                await adminBanProfile(profileId, {
                    reason_code,
                    public_message: public_message?.trim() || null,
                    internal_note: internal_note?.trim() || null,
                });
            });
        } catch (err) {
            toastErr(err, "Failed to ban.");
        }
    }

    async function doTempBan() {
        const e = firstError([
            validateContext({ requireReason: true }),
            validateUntil(until_local, { field: "until", required: true }),
        ]);
        if (e) return toastValidation(e);

        try {
            await runAction(async () => {
                const iso = new Date(until_local).toISOString();

                await adminTempBanProfile(profileId, {
                    reason_code,
                    until: iso,
                    public_message: public_message?.trim() || null,
                    internal_note: internal_note?.trim() || null,
                });
            });
        } catch (err) {
            toastErr(err, "Failed to temp-ban.");
        }
    }

    async function doUnban() {
        const e = firstError([
            validateReasonCode(reason_code, { field: "reason_code", required: true }),
            validateInternalNote(internal_note, { field: "internal_note", required: false }),
        ]);
        if (e) return toastValidation(e);

        try {
            await runAction(async () => {
                await adminUnbanProfile(profileId, {
                    reason_code,
                    internal_note: internal_note?.trim() || null,
                });
            });
        } catch (err) {
            toastErr(err, "Failed to unban.");
        }
    }

    async function doClearContent() {
        const e = firstError([
            validateContext({ requireReason: true }),
            validateAdminClearField(clear_field, { field: "field_key" }),
            validateAdminClearValue(clear_field, clear_value, { field: "field_value" }),
        ]);
        if (e) return toastValidation(e);

        try {
            await runAction(async () => {
                const v = typeof clear_value === "string" ? clear_value.trim() : clear_value;

                await adminClearContent(profileId, {
                    reason_code,
                    field_key: clear_field,
                    field_value: v === "" ? null : v,
                    internal_note: internal_note?.trim() || null,
                    public_message: public_message?.trim() || null,
                });
            });
        } catch (err) {
            toastErr(err, "Failed to update field.");
        }
    }

    function confirmDeleteImage(image_id) {
        const e = validateContext({ requireReason: true });
        if (e) return toastValidation(e);

        addToast({
            variant: "modal",
            text: "Delete image?",
            description: "This removes the DB row. Storage deletion is handled elsewhere.",
            autoHideMs: null,
            actions: [
                { label: "Cancel", variant: "secondary" },
                {
                    label: "Delete",
                    variant: "danger",
                    onClick: async () => {
                        try {
                            await runAction(async () => {
                                await adminDeleteProfileImage(profileId, image_id, {
                                    reason_code,
                                    internal_note: internal_note?.trim() || null,
                                    public_message: public_message?.trim() || null,
                                });
                            });
                        } catch (err) {
                            toastErr(err, "Failed to delete image.");
                        }
                    },
                },
            ],
        });
    }

    function confirmDeleteAudio(audio_id) {
        const e = validateContext({ requireReason: true });
        if (e) return toastValidation(e);

        addToast({
            variant: "modal",
            text: "Delete audio?",
            description: "This removes the DB row. Storage deletion is handled elsewhere.",
            autoHideMs: null,
            actions: [
                { label: "Cancel", variant: "secondary" },
                {
                    label: "Delete",
                    variant: "danger",
                    onClick: async () => {
                        try {
                            await runAction(async () => {
                                await adminDeleteProfileAudio(profileId, audio_id, {
                                    reason_code,
                                    internal_note: internal_note?.trim() || null,
                                    public_message: public_message?.trim() || null,
                                });
                            });
                        } catch (err) {
                            toastErr(err, "Failed to delete audio.");
                        }
                    },
                },
            ],
        });
    }
</script>


<svelte:head>
    {#if data?.profile?.username}
        <title>loopii • Admin • @{data?.profile?.username}</title>
    {:else}
        <title>loopii • Admin</title>
    {/if}
</svelte:head>


<div class="stack">
    <div class="toolbar">
        <div class="toolbar__group">
            <h3>Profile</h3>
            <span class="pill"><span class="pill__label">{profileId}</span></span>
        </div>

        <div class="toolbar__group">
            <button type="button" class="btn btn--ghost btn--icon" on:click={() => goto("/admin/profiles")} aria-label="Back">
                <Icon icon={UI_ICONS.chevronLeft} class="btn__icon" />
            </button>

            <button
                type="button"
                class="btn btn--ghost btn--icon"
                class:is-loading={loading}
                on:click={load}
                disabled={loading}
                aria-label="Refresh"
            >
                <Icon icon={UI_ICONS.refresh} class="btn__icon" />
                <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
            </button>
        </div>
    </div>

    {#if !data}
        <div class="page__center">
            <Icon icon={UI_ICONS.animLoading} class="page__icon" />
        </div>
    {:else}
        <div class="admin-grid">
            <div class="stack">
                <section class="card">
                    <div class="section stack">
                        <div class="row" style="justify-content:space-between;align-items:center;">
                            <h3 style="margin:0;">Overview</h3>
                            <button type="button" class="btn btn--mini btn--ghost" on:click={() => (showOverview = !showOverview)}>
                                {showOverview ? "Hide" : "Show"}
                            </button>
                        </div>

                        {#if showOverview}
                            <dl class="admin-kv">
                                <dt>username</dt><dd class="admin-code">@{data?.profile?.username}</dd>
                                <dt>name</dt><dd>{data?.profile?.name || "-"}</dd>
                                <dt>age</dt><dd>{data?.profile?.age ?? "-"}</dd>

                                <dt>created</dt>
                                <dd class="admin-code">
                                    <span title={dtTitle(data?.profile?.created_at)}>{dtLabel(data?.profile?.created_at)}</span>
                                </dd>

                                <dt>updated</dt>
                                <dd class="admin-code">
                                    <span title={dtTitle(data?.profile?.updated_at)}>{dtLabel(data?.profile?.updated_at)}</span>
                                </dd>

                                <dt>last seen</dt>
                                <dd class="admin-code">
                                    <span title={dtTitle(data?.profile?.last_seen_at)}>{dtLabel(data?.profile?.last_seen_at)}</span>
                                </dd>

                                <dt>role</dt><dd>{data?.meta?.access?.role || data?.profile?.access?.role || "-"}</dd>
                                <dt>status</dt><dd>{data?.meta?.access?.status || data?.profile?.access?.status || "-"}</dd>

                                <dt>banned_until</dt>
                                <dd class="admin-code">
                                    {#if data?.meta?.access?.banned_until || data?.profile?.access?.banned_until}
                                        {#if data?.meta?.access?.banned_until}
                                            <span title={dtTitle(data.meta.access.banned_until)}>{dtLabel(data.meta.access.banned_until)}</span>
                                        {:else}
                                            <span title={dtTitle(data.profile.access.banned_until)}>{dtLabel(data.profile.access.banned_until)}</span>
                                        {/if}
                                    {:else}
                                        -
                                    {/if}
                                </dd>

                                <dt>public_message</dt><dd>{data?.meta?.access?.public_message || data?.profile?.access?.public_message || "-"}</dd>
                            </dl>
                        {/if}

                        <div class="u-divider"></div>

                        <div class="row" style="justify-content:space-between;align-items:center;">
                            <h4 style="margin:0;">Stats</h4>
                            <button type="button" class="btn btn--mini btn--ghost" on:click={() => (showStats = !showStats)}>
                                {showStats ? "Hide" : "Show"}
                            </button>
                        </div>

                        {#if showStats}
                            <dl class="admin-kv">
                                <dt>storage</dt><dd>{formatBytes(data?.meta?.storage_bytes)}</dd>
                                <dt>images</dt><dd>{data?.meta?.img_count ?? "-"}</dd>
                                <dt>loops (total / 30d)</dt><dd>{data?.meta?.loops_total ?? "-"} / {data?.meta?.loops_30d ?? "-"}</dd>
                                <dt>decisions made (total / 30d)</dt><dd>{data?.meta?.decisions_made_total ?? "-"} / {data?.meta?.decisions_made_30d ?? "-"}</dd>
                                <dt>decisions received (total / 30d)</dt><dd>{data?.meta?.decisions_received_total ?? "-"} / {data?.meta?.decisions_received_30d ?? "-"}</dd>
                                <dt>reports received (total / open / 30d)</dt><dd>{data?.meta?.reports_received_total ?? "-"} / {data?.meta?.reports_received_open ?? "-"} / {data?.meta?.reports_received_30d ?? "-"}</dd>
                                <dt>reports made (total / 30d)</dt><dd>{data?.meta?.reports_made_total ?? "-"} / {data?.meta?.reports_made_30d ?? "-"}</dd>
                                <dt>dismissed reports</dt><dd>{data?.meta?.reports_made_dismissed_total ?? "-"} ({formatPct(data?.meta?.reports_made_dismissed_pct)})</dd>
                                <dt>admin actions (total / 30d)</dt><dd>{data?.meta?.actions_received_total ?? "-"} / {data?.meta?.actions_received_30d ?? "-"}</dd>
                                <dt>socials</dt><dd>{data?.meta?.socials_total ?? "-"}</dd>
                                <dt>text_len</dt><dd>{data?.meta?.text_len ?? "-"}</dd>
                            </dl>
                        {/if}
                    </div>
                </section>

                <section class="card">
                    <div class="section stack">
                        <h3>Admin context</h3>

                        <div class="field">
                            <label class="field__label" for={id_reason}>reason_code</label>
                            <select id={id_reason} bind:value={reason_code} disabled={acting}>
                                <option value="">(select)</option>
                                {#each ADMIN_REASON_CODE_OPTIONS as opt}
                                    <option value={opt.value}>{opt.label}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="field">
                            <label class="field__label" for={id_public}>public_message</label>
                            <textarea id={id_public} bind:value={public_message} placeholder="optional" disabled={acting}></textarea>
                        </div>

                        <div class="field">
                            <label class="field__label" for={id_internal}>internal_note</label>
                            <textarea id={id_internal} bind:value={internal_note} placeholder="optional" disabled={acting}></textarea>
                        </div>
                    </div>
                </section>

                <section class="card">
                    <div class="section stack">
                        <h3>Actions</h3>

                        <div class="actionbar">
                            <button type="button" class="btn btn--primary" on:click={doWarn} disabled={acting || loading}>
                                <Icon icon={UI_ICONS.check} class="btn__icon" />
                                <span class="btn__label">Warn</span>
                            </button>

                            <button type="button" class="btn btn--danger" on:click={doBan} disabled={acting || loading}>
                                <span class="btn__label">Ban</span>
                            </button>

                            <button type="button" class="btn btn--success" on:click={doUnban} disabled={acting || loading}>
                                <span class="btn__label">Unban</span>
                            </button>
                        </div>

                        <div class="u-divider"></div>

                        <h4>Temp ban</h4>

                        <div class="field">
                            <label class="field__label" for={id_until}>until</label>
                            <input id={id_until} type="datetime-local" bind:value={until_local} disabled={acting} />
                        </div>

                        <button type="button" class="btn btn--danger" on:click={doTempBan} disabled={acting || loading}>
                            <span class="btn__label">Apply temp ban</span>
                        </button>

                        <div class="u-divider"></div>

                        <h4>Clear / overwrite content</h4>

                        <div class="field">
                            <label class="field__label" for={id_clear_field}>field</label>
                            <select id={id_clear_field} bind:value={clear_field} disabled={acting}>
                                {#each ADMIN_CLEAR_FIELD_OPTIONS as opt}
                                    <option value={opt.value}>{opt.label}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="field">
                            <label class="field__label" for={id_clear_value}>value (empty = null)</label>
                            <textarea id={id_clear_value} bind:value={clear_value} disabled={acting}></textarea>
                        </div>

                        <button type="button" class="btn btn--primary" on:click={doClearContent} disabled={acting || loading}>
                            <span class="btn__label">Apply overwrite</span>
                        </button>

                        <div class="u-divider"></div>

                        <h4>Media</h4>

                        {#if data?.profile?.images?.length}
                            <div style="width:100%;overflow-x:auto;">
                                <table class="admin-table">
                                    <thead>
                                        <tr><th>preview</th><th>image_id</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {#each data.profile.images as img}
                                            <tr>
                                                <td>
                                                    <img class="admin-thumb" src={img?.urls?.medium} alt="Thumbnail" loading="lazy" />
                                                </td>
                                                <td class="admin-code">
                                                    {img?.id}
                                                    {#if img?.is_avatar}
                                                        <span class="pill" style="margin-left:var(--space-2);"><span class="pill__label">avatar</span></span>
                                                    {/if}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        class="btn btn--mini btn--danger"
                                                        on:click={() => confirmDeleteImage(img.id)}
                                                        disabled={acting || loading}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {:else}
                            <p class="text-hint">No images.</p>
                        {/if}

                        {#if data?.profile?.audio?.id}
                            <button
                                type="button"
                                class="btn btn--danger"
                                on:click={() => confirmDeleteAudio(data.profile.audio.id)}
                                disabled={acting || loading}
                            >
                                Delete audio
                            </button>
                        {:else}
                            <p class="text-hint">No audio.</p>
                        {/if}
                    </div>
                </section>
            </div>

            <div class="stack">
                <section class="card">
                    <div class="section stack">
                        <h3>Profile view</h3>
                        <ProfileCardExpanded profile={data.profile} />

                        <div class="u-divider"></div>

                        <h3>Reports</h3>

                        {#if (data?.reports_received || []).length === 0 && (data?.reports_made || []).length === 0}
                            <p class="text-hint">No reports.</p>
                        {:else}
                            <h4>Received</h4>
                            <div style="width:100%;overflow-x:auto;">
                                <table class="admin-table">
                                    <thead>
                                        <tr><th>created</th><th>reason</th><th>status</th><th>reporter</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {#each (data.reports_received || []) as r}
                                            {@html ""}
                                            {#key keyOf(r)}
                                                <tr>
                                                    <td class="admin-code">
                                                        <span title={dtTitle(r.created_at)}>{dtLabel(r.created_at)}</span>
                                                    </td>
                                                    <td>{r.reason_code}</td>
                                                    <td>{r.status}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            class="btn btn--mini btn--ghost"
                                                            on:click={() => gotoProfile(r.reporter_profile_id)}
                                                            disabled={!r.reporter_profile_id}
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            class="btn btn--mini btn--ghost"
                                                            on:click={() => toggleReportReceived(keyOf(r))}
                                                        >
                                                            {expandedReportsReceived.has(keyOf(r)) ? "Hide" : "Details"}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {#if expandedReportsReceived.has(keyOf(r))}
                                                    <tr>
                                                        <td colspan="5">
                                                            <div class="stack" style="gap:var(--space-2);">
                                                                <div><strong>public_message:</strong> {r.public_message || "-"}</div>
                                                                <div><strong>internal_note:</strong> {r.internal_note || "-"}</div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                {/if}
                                            {/key}
                                        {/each}
                                    </tbody>
                                </table>
                            </div>

                            <h4>Made</h4>
                            <div style="width:100%;overflow-x:auto;">
                                <table class="admin-table">
                                    <thead>
                                        <tr><th>created</th><th>reason</th><th>status</th><th>reportee</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {#each (data.reports_made || []) as r}
                                            {#key keyOf(r)}
                                                <tr>
                                                    <td class="admin-code">
                                                        <span title={dtTitle(r.created_at)}>{dtLabel(r.created_at)}</span>
                                                    </td>
                                                    <td>{r.reason_code}</td>
                                                    <td>{r.status}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            class="btn btn--mini btn--ghost"
                                                            on:click={() => gotoProfile(r.reportee_profile_id)}
                                                            disabled={!r.reportee_profile_id}
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            class="btn btn--mini btn--ghost"
                                                            on:click={() => toggleReportMade(keyOf(r))}
                                                        >
                                                            {expandedReportsMade.has(keyOf(r)) ? "Hide" : "Details"}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {#if expandedReportsMade.has(keyOf(r))}
                                                    <tr>
                                                        <td colspan="5">
                                                            <div class="stack" style="gap:var(--space-2);">
                                                                <div><strong>public_message:</strong> {r.public_message || "-"}</div>
                                                                <div><strong>internal_note:</strong> {r.internal_note || "-"}</div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                {/if}
                                            {/key}
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {/if}

                        <div class="u-divider"></div>

                        <h3>Admin actions</h3>

                        {#if (data?.actions_received || []).length === 0 && (data?.actions_made || []).length === 0}
                            <p class="text-hint">No admin actions.</p>
                        {:else}
                            <h4>Received</h4>
                            <div style="width:100%;overflow-x:auto;">
                                <table class="admin-table">
                                    <thead>
                                        <tr><th>created</th><th>action</th><th>reason</th><th>admin</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {#each (data.actions_received || []) as a}
                                            {#key keyOf(a)}
                                                <tr>
                                                    <td class="admin-code">
                                                        <span title={dtTitle(a.created_at)}>{dtLabel(a.created_at)}</span>
                                                    </td>
                                                    <td>{a.action}</td>
                                                    <td>{a.reason_code}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            class="btn btn--mini btn--ghost"
                                                            on:click={() => gotoProfile(a.admin_profile_id)}
                                                            disabled={!a.admin_profile_id}
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            class="btn btn--mini btn--ghost"
                                                            on:click={() => toggleActionReceived(keyOf(a))}
                                                        >
                                                            {expandedActionsReceived.has(keyOf(a)) ? "Hide" : "Details"}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {#if expandedActionsReceived.has(keyOf(a))}
                                                    <tr>
                                                        <td colspan="5">
                                                            <div class="stack" style="gap:var(--space-2);">
                                                                <div><strong>public_message:</strong> {a.public_message || "-"}</div>
                                                                <div><strong>internal_note:</strong> {a.internal_note || "-"}</div>
                                                                {#if a.until}
                                                                    <div><strong>until:</strong> <span class="admin-code" title={dtTitle(a.until)}>{dtLabel(a.until)}</span></div>
                                                                {/if}
                                                                {#if a.field_key}
                                                                    <div><strong>field_key:</strong> <span class="admin-code">{a.field_key}</span></div>
                                                                {/if}
                                                                {#if a.field_value !== undefined}
                                                                    <div><strong>field_value:</strong> {a.field_value === null ? "null" : a.field_value}</div>
                                                                {/if}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                {/if}
                                            {/key}
                                        {/each}
                                    </tbody>
                                </table>
                            </div>

                            <h4>Made</h4>
                            <div style="width:100%;overflow-x:auto;">
                                <table class="admin-table">
                                    <thead>
                                        <tr><th>created</th><th>action</th><th>reason</th><th>target</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {#each (data.actions_made || []) as a}
                                            {#key keyOf(a)}
                                                <tr>
                                                    <td class="admin-code">
                                                        <span title={dtTitle(a.created_at)}>{dtLabel(a.created_at)}</span>
                                                    </td>
                                                    <td>{a.action}</td>
                                                    <td>{a.reason_code}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            class="btn btn--mini btn--ghost"
                                                            on:click={() => gotoProfile(a.target_profile_id)}
                                                            disabled={!a.target_profile_id}
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            class="btn btn--mini btn--ghost"
                                                            on:click={() => toggleActionMade(keyOf(a))}
                                                        >
                                                            {expandedActionsMade.has(keyOf(a)) ? "Hide" : "Details"}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {#if expandedActionsMade.has(keyOf(a))}
                                                    <tr>
                                                        <td colspan="5">
                                                            <div class="stack" style="gap:var(--space-2);">
                                                                <div><strong>public_message:</strong> {a.public_message || "-"}</div>
                                                                <div><strong>internal_note:</strong> {a.internal_note || "-"}</div>
                                                                {#if a.until}
                                                                    <div><strong>until:</strong> <span class="admin-code" title={dtTitle(a.until)}>{dtLabel(a.until)}</span></div>
                                                                {/if}
                                                                {#if a.field_key}
                                                                    <div><strong>field_key:</strong> <span class="admin-code">{a.field_key}</span></div>
                                                                {/if}
                                                                {#if a.field_value !== undefined}
                                                                    <div><strong>field_value:</strong> {a.field_value === null ? "null" : a.field_value}</div>
                                                                {/if}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                {/if}
                                            {/key}
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {/if}
                    </div>
                </section>
            </div>
        </div>
    {/if}
</div>
