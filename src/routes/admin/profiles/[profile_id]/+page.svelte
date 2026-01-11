
<script>
    import Icon from "@iconify/svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";

    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

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
    import { profile } from "$lib/stores/profile";

    let loading = false;
    let data = null;

    let profileId;
    let lastProfileId = null;

    // form state
    let warn_reason = "";
    let warn_public = "";
    let warn_internal = "";

    let ban_reason = "";
    let ban_public = "";
    let ban_internal = "";

    let temp_reason = "";
    let temp_until_local = "";
    let temp_public = "";
    let temp_internal = "";

    let unban_reason = "";
    let unban_internal = "";

    let clear_reason = "";
    let clear_field = "bio";
    let clear_value = "";

    // ids for labels
    const id_warn_reason = "admin_warn_reason";
    const id_warn_public = "admin_warn_public";
    const id_warn_internal = "admin_warn_internal";

    const id_ban_reason = "admin_ban_reason";
    const id_ban_public = "admin_ban_public";
    const id_ban_internal = "admin_ban_internal";

    const id_temp_reason = "admin_temp_reason";
    const id_temp_until = "admin_temp_until";
    const id_temp_public = "admin_temp_public";
    const id_temp_internal = "admin_temp_internal";

    const id_unban_reason = "admin_unban_reason";
    const id_unban_internal = "admin_unban_internal";

    const id_clear_reason = "admin_clear_reason";
    const id_clear_field = "admin_clear_field";
    const id_clear_value = "admin_clear_value";

    $: profileId = $page.params.profile_id;

    function toastErr(err, fallback) {
        addToast({ text: err?.message || fallback || "Request failed.", autoHideMs: 6000 });
    }

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

    async function doWarn() {
        try {
            await adminWarnProfile(profileId, {
                reason_code: warn_reason,
                public_message: warn_public || null,
                internal_note: warn_internal || null,
            });
            addToast({ text: "Warned.", autoHideMs: 2500 });
            await load();
        } catch (err) {
            toastErr(err, "Failed to warn.");
        }
    }

    async function doBan() {
        try {
            await adminBanProfile(profileId, {
                reason_code: ban_reason,
                public_message: ban_public || null,
                internal_note: ban_internal || null,
            });
            addToast({ text: "Banned.", autoHideMs: 2500 });
            await load();
        } catch (err) {
            toastErr(err, "Failed to ban.");
        }
    }

    async function doTempBan() {
        try {
            const iso = temp_until_local ? new Date(temp_until_local).toISOString() : null;

            await adminTempBanProfile(profileId, {
                reason_code: temp_reason,
                until: iso,
                public_message: temp_public || null,
                internal_note: temp_internal || null,
            });

            addToast({ text: "Temp-banned.", autoHideMs: 2500 });
            await load();
        } catch (err) {
            toastErr(err, "Failed to temp-ban.");
        }
    }

    async function doUnban() {
        try {
            await adminUnbanProfile(profileId, {
                reason_code: unban_reason,
                internal_note: unban_internal || null,
            });
            addToast({ text: "Cleared restrictions.", autoHideMs: 2500 });
            await load();
        } catch (err) {
            toastErr(err, "Failed to unban.");
        }
    }

    async function doClearContent() {
        try {
            await adminClearContent(profileId, {
                reason_code: clear_reason,
                field_key: clear_field,
                field_value: clear_value === "" ? null : clear_value,
                internal_note: null,
                public_message: null,
            });
            addToast({ text: "Updated field.", autoHideMs: 2500 });
            await load();
        } catch (err) {
            toastErr(err, "Failed to update field.");
        }
    }

    function confirmDeleteImage(image_id) {
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
                            await adminDeleteProfileImage(profileId, image_id, {
                                reason_code: "admin_delete_media",
                                internal_note: null,
                                public_message: null,
                            });
                            addToast({ text: "Image deleted.", autoHideMs: 2500 });
                            await load();
                        } catch (err) {
                            toastErr(err, "Failed to delete image.");
                        }
                    },
                },
            ],
        });
    }

    function confirmDeleteAudio(audio_id) {
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
                            await adminDeleteProfileAudio(profileId, audio_id, {
                                reason_code: "admin_delete_media",
                                internal_note: null,
                                public_message: null,
                            });
                            addToast({ text: "Audio deleted.", autoHideMs: 2500 });
                            await load();
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
            <button type="button" class="btn btn--ghost" on:click={() => goto("/admin/profiles")}>
                <Icon icon={UI_ICONS.chevronLeft} class="btn__icon" />
                <span class="btn__label">Back</span>
            </button>

            <button type="button" class="btn btn--ghost btn--icon" class:is-loading={loading} on:click={load} disabled={loading} aria-label="Refresh">
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
            <section class="card">
                <div class="section stack">
                    <h3>Overview</h3>

                    <dl class="admin-kv">
                        <dt>username</dt><dd class="admin-code">@{data?.profile?.username}</dd>
                        <dt>name</dt><dd>{data?.profile?.name || "-"}</dd>
                        <dt>role</dt><dd>{data?.meta?.access?.role || "-"}</dd>
                        <dt>status</dt><dd>{data?.meta?.access?.status || "-"}</dd>
                        <dt>banned_until</dt><dd class="admin-code">{data?.meta?.access?.banned_until || "-"}</dd>
                        <dt>public_message</dt><dd>{data?.meta?.access?.public_message || "-"}</dd>
                    </dl>

                    <div class="u-divider"></div>

                    <h3>Actions</h3>

                    <div class="stack">
                        <div class="card">
                            <div class="section stack">
                                <h4>Warn</h4>

                                <div class="field">
                                    <label class="field__label" for={id_warn_reason}>reason_code</label>
                                    <input id={id_warn_reason} bind:value={warn_reason} placeholder="required" />
                                </div>

                                <div class="field">
                                    <label class="field__label" for={id_warn_public}>public_message</label>
                                    <textarea id={id_warn_public} bind:value={warn_public} placeholder="optional"></textarea>
                                </div>

                                <div class="field">
                                    <label class="field__label" for={id_warn_internal}>internal_note</label>
                                    <textarea id={id_warn_internal} bind:value={warn_internal} placeholder="optional"></textarea>
                                </div>

                                <button type="button" class="btn btn--primary" on:click={doWarn}>
                                    <Icon icon={UI_ICONS.check} class="btn__icon" />
                                    <span class="btn__label">Warn</span>
                                </button>
                            </div>
                        </div>

                        <div class="card">
                            <div class="section stack">
                                <h4>Ban</h4>

                                <div class="field">
                                    <label class="field__label" for={id_ban_reason}>reason_code</label>
                                    <input id={id_ban_reason} bind:value={ban_reason} placeholder="required" />
                                </div>

                                <div class="field">
                                    <label class="field__label" for={id_ban_public}>public_message</label>
                                    <textarea id={id_ban_public} bind:value={ban_public} placeholder="optional"></textarea>
                                </div>

                                <div class="field">
                                    <label class="field__label" for={id_ban_internal}>internal_note</label>
                                    <textarea id={id_ban_internal} bind:value={ban_internal} placeholder="optional"></textarea>
                                </div>

                                <button type="button" class="btn btn--danger" on:click={doBan}>
                                    <span class="btn__label">Ban</span>
                                </button>
                            </div>
                        </div>

                        <div class="card">
                            <div class="section stack">
                                <h4>Temp ban</h4>

                                <div class="field">
                                    <label class="field__label" for={id_temp_reason}>reason_code</label>
                                    <input id={id_temp_reason} bind:value={temp_reason} placeholder="required" />
                                </div>

                                <div class="field">
                                    <label class="field__label" for={id_temp_until}>until</label>
                                    <input id={id_temp_until} type="datetime-local" bind:value={temp_until_local} />
                                </div>

                                <div class="field">
                                    <label class="field__label" for={id_temp_public}>public_message</label>
                                    <textarea id={id_temp_public} bind:value={temp_public} placeholder="optional"></textarea>
                                </div>

                                <div class="field">
                                    <label class="field__label" for={id_temp_internal}>internal_note</label>
                                    <textarea id={id_temp_internal} bind:value={temp_internal} placeholder="optional"></textarea>
                                </div>

                                <button type="button" class="btn btn--danger" on:click={doTempBan}>
                                    <span class="btn__label">Temp ban</span>
                                </button>
                            </div>
                        </div>

                        <div class="card">
                            <div class="section stack">
                                <h4>Unban / clear warning</h4>

                                <div class="field">
                                    <label class="field__label" for={id_unban_reason}>reason_code</label>
                                    <input id={id_unban_reason} bind:value={unban_reason} placeholder="required" />
                                </div>

                                <div class="field">
                                    <label class="field__label" for={id_unban_internal}>internal_note</label>
                                    <textarea id={id_unban_internal} bind:value={unban_internal} placeholder="optional"></textarea>
                                </div>

                                <button type="button" class="btn btn--success" on:click={doUnban}>
                                    <span class="btn__label">Clear restrictions</span>
                                </button>
                            </div>
                        </div>

                        <div class="card">
                            <div class="section stack">
                                <h4>Clear / overwrite content</h4>

                                <div class="field">
                                    <label class="field__label" for={id_clear_reason}>reason_code</label>
                                    <input id={id_clear_reason} bind:value={clear_reason} placeholder="required" />
                                </div>

                                <div class="field">
                                    <label class="field__label" for={id_clear_field}>field</label>
                                    <select id={id_clear_field} bind:value={clear_field}>
                                        <option value="bio">bio</option>
                                        <option value="loop_bio">loop_bio</option>
                                        <option value="looking_for">looking_for</option>
                                        <option value="location">location</option>
                                        <option value="name">name</option>
                                    </select>
                                </div>

                                <div class="field">
                                    <label class="field__label" for={id_clear_value}>value (empty = null)</label>
                                    <textarea id={id_clear_value} bind:value={clear_value}></textarea>
                                </div>

                                <button type="button" class="btn btn--primary" on:click={doClearContent}>
                                    <span class="btn__label">Apply</span>
                                </button>
                            </div>
                        </div>

                        <div class="card">
                            <div class="section stack">
                                <h4>Media</h4>

                                {#if data?.profile?.images?.length}
                                    <div style="width:100%;overflow-x:auto;">
                                        <table class="admin-table">
                                            <thead>
                                                <tr><th>image_id</th><th></th></tr>
                                            </thead>
                                            <tbody>
                                                {#each data.profile.images as img}
                                                    <tr>
                                                        <td class="admin-code">{img?.id}</td>
                                                        <td>
                                                            <button type="button" class="btn btn--mini btn--danger" on:click={() => confirmDeleteImage(img.id)}>
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
                                    <button type="button" class="btn btn--danger" on:click={() => confirmDeleteAudio(data.profile.audio.id)}>
                                        Delete audio
                                    </button>
                                {:else}
                                    <p class="text-hint">No audio.</p>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

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
                                    <tr><th>created</th><th>reason</th><th>status</th><th>reporter</th></tr>
                                </thead>
                                <tbody>
                                    {#each (data.reports_received || []) as r}
                                        <tr>
                                            <td class="admin-code">{r.created_at}</td>
                                            <td>{r.reason_code}</td>
                                            <td>{r.status}</td>
                                            <td class="admin-code">{r.reporter_profile_id}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>

                        <h4>Made</h4>
                        <div style="width:100%;overflow-x:auto;">
                            <table class="admin-table">
                                <thead>
                                    <tr><th>created</th><th>reason</th><th>status</th><th>reportee</th></tr>
                                </thead>
                                <tbody>
                                    {#each (data.reports_made || []) as r}
                                        <tr>
                                            <td class="admin-code">{r.created_at}</td>
                                            <td>{r.reason_code}</td>
                                            <td>{r.status}</td>
                                            <td class="admin-code">{r.reportee_profile_id}</td>
                                        </tr>
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
                                    <tr><th>created</th><th>action</th><th>reason</th><th>admin</th></tr>
                                </thead>
                                <tbody>
                                    {#each (data.actions_received || []) as a}
                                        <tr>
                                            <td class="admin-code">{a.created_at}</td>
                                            <td>{a.action}</td>
                                            <td>{a.reason_code}</td>
                                            <td class="admin-code">{a.admin_profile_id}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>

                        <h4>Made</h4>
                        <div style="width:100%;overflow-x:auto;">
                            <table class="admin-table">
                                <thead>
                                    <tr><th>created</th><th>action</th><th>reason</th><th>target</th></tr>
                                </thead>
                                <tbody>
                                    {#each (data.actions_made || []) as a}
                                        <tr>
                                            <td class="admin-code">{a.created_at}</td>
                                            <td>{a.action}</td>
                                            <td>{a.reason_code}</td>
                                            <td class="admin-code">{a.target_profile_id}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                </div>
            </section>
        </div>
    {/if}
</div>
