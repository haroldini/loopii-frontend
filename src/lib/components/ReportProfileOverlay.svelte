
<script>
    import { onDestroy, tick } from "svelte";
    import Icon from "@iconify/svelte";

    import Overlay from "$lib/components/Overlay.svelte";
    import { portal } from "$lib/utils/portal.js";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";

    import { createProfileReport } from "$lib/api/report.js";
    import {
        REPORT_REASON_CODE_OPTIONS,
        validateReportReasonCode,
        validateReportDetails,
    } from "$lib/utils/validators.js";

    const HASH = "#report-profile";

    let overlay;
    let isOpen = false;

    let reporteeProfileId = "";
    let reporteeLabel = "";

    let reasonCode = "";
    let details = "";

    let busy = false;
    let error = "";

    function reset() {
        reporteeProfileId = "";
        reporteeLabel = "";
        reasonCode = "";
        details = "";
        busy = false;
        error = "";
    }

    export function openForProfile(profile) {
        if (!profile?.id) return;
        if (isOpen) return;

        reporteeProfileId = String(profile.id);
        reporteeLabel = profile?.username ? "@" + profile.username : "this user";

        isOpen = true;
        overlay?.openOverlay();
    }

    function close() {
        isOpen = false;
        overlay?.closeOverlay();
        reset();
    }

    function onRequestClose() {
        if (busy) return;
        close();
    }

    function validate() {
        error = "";

        const eReason = validateReportReasonCode(reasonCode, { field: "reason_code", required: true });
        if (eReason) {
            error = eReason.message;
            return false;
        }

        const eDetails = validateReportDetails(details, { field: "details", required: false });
        if (eDetails) {
            error = eDetails.message;
            return false;
        }

        return true;
    }

    async function submit() {
        if (busy) return;
        if (!validate()) return;

        busy = true;
        error = "";

        const payload = {
            reportee_profile_id: reporteeProfileId,
            reason_code: reasonCode.trim(),
            details: (details || "").trim() || null,
        };

        try {
            const res = await createProfileReport(payload);

            if (res?.error) {
                error = res.error || "Couldn't submit report.";
                addToast({
                    variant: "banner",
                    text: "Couldn't submit report.",
                    description: error,
                    autoHideMs: null,
                });
                return;
            }

            addToast({ text: "Report submitted.", autoHideMs: 2500 });

            close();
            await tick();
        } catch (e) {
            error = e?.message || "Couldn't submit report.";
            addToast({
                variant: "banner",
                text: "Couldn't submit report.",
                description: error,
                autoHideMs: null,
            });
        } finally {
            busy = false;
        }
    }

    onDestroy(() => {
        try {
            overlay?.closeOverlay();
        } catch {}
    });
</script>

<div use:portal={"body"}>
    <Overlay
        bind:this={overlay}
        open={isOpen}
        hash={HASH}
        openClass="overlay"
        closedClass="u-hidden"
        renderOpenOnly={false}
        ariaLabel="Report profile"
        mode="auto"
        windowedAt={480}
        on:requestClose={onRequestClose}
    >
        {#if isOpen}
            <button
                type="button"
                class="overlay__scrim"
                aria-hidden="true"
                tabindex="-1"
                on:click={onRequestClose}
            ></button>

            <div class="overlay__panel report-overlay__panel" role="document">
                <header class="bar bar--header overlay__header">
                    <div class="bar__inner">
                        <div class="bar__title">
                            <h3>Report {reporteeLabel}</h3>
                        </div>
                    </div>

                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        aria-label="Close"
                        on:click={onRequestClose}
                        disabled={busy}
                    >
                        <Icon icon={UI_ICONS.close} class="btn__icon" />
                    </button>
                </header>

                <main class="overlay__body report-overlay__body">
                    <div class="section stack">
                        <label for="report-reason">Reason</label>
                        <select
                            id="report-reason"
                            value={reasonCode}
                            on:change={(e) => (reasonCode = e.target.value)}
                            disabled={busy}
                        >
                            <option value="" disabled selected={reasonCode === ""}>Select a reason</option>
                            {#each REPORT_REASON_CODE_OPTIONS as opt}
                                <option value={opt.value}>{opt.label}</option>
                            {/each}
                        </select>
                    </div>

                    <div class="section stack">
                        <label for="report-details">Details (optional)</label>
                        <textarea
                            id="report-details"
                            rows="5"
                            placeholder="Add context that helps moderation (links, what happened, where)."
                            value={details}
                            on:input={(e) => (details = e.target.value)}
                            disabled={busy}
                        ></textarea>
                        <p class="text-hint">Max 2000 characters.</p>
                    </div>

                    {#if error}
                        <p class="text-danger">{error}</p>
                    {/if}
                </main>

                <div class="overlay__actionbar">
                    <div class="overlay__actions">
                        <div class="overlay__actions-left">
                            <button
                                type="button"
                                class="btn btn--ghost"
                                on:click={onRequestClose}
                                disabled={busy}
                            >
                                <span class="btn__label">Cancel</span>
                            </button>
                        </div>

                        <div class="overlay__actions-right">
                            <button
                                type="button"
                                class="btn btn--primary"
                                class:is-loading={busy}
                                on:click={submit}
                                disabled={busy || !reasonCode}
                            >
                                <Icon icon="mdi:flag" class="btn__icon" />
                                <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                                <span class="btn__label">Submit report</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </Overlay>
</div>
