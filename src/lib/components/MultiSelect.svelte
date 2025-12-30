
<script>
    import { createEventDispatcher, onDestroy, tick } from "svelte";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js";
    import Overlay from "$lib/components/Overlay.svelte";

    export let title = "Select";
    export let hint = "You can select multiple options.";
    export let placeholder = "Any";
    export let searchPlaceholder = "Search...";
    export let items = [];

    export let overlayHash = "#select-multiple";


    // keys (works for countries, interests, languages)
    export let valueKey = "id";
    export let labelKey = "name";
    export let groupKey = null; // e.g. "region" or "sub_region"

    // OPTIONAL limits (default: no limits)
    export let min = null; // minimum number of selections required to confirm
    export let max = null; // maximum number of selections allowed

    // OPTIONAL UI toggles (default: on)
    export let showSearch = true;
    export let showBulkActions = true;

    // OPTIONAL behavior toggles (default: on)
    export let allowGroupSelect = true;

    export let value = []; // bind:value from parent
    export let disabled = false;


    const dispatch = createEventDispatcher();

    let overlay;

    let isOpen = false;
    let query = "";
    let draft = [];

    let searchEl;
    let groupCheckboxEls = {};


    function normArray(v) {
        return Array.isArray(v) ? v : [];
    }

    function toLimit(v) {
        if (v === "" || v == null) return null;
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        return Math.max(0, Math.floor(n));
    }

    $: minLimit = toLimit(min);
    $: maxLimit = toLimit(max);

    // if both provided and inconsistent, force max >= min
    $: effectiveMin = minLimit;
    $: effectiveMax =
        maxLimit == null
            ? null
            : effectiveMin == null
                ? maxLimit
                : Math.max(maxLimit, effectiveMin);

    function getId(item) {
        return item?.[valueKey];
    }

    function getLabel(item) {
        const v = item?.[labelKey];
        return v == null ? "" : String(v);
    }

    function getGroup(item) {
        if (!groupKey) return "";
        const v = item?.[groupKey];
        return v == null ? "" : String(v);
    }

    $: valueArr = normArray(value);

    $: labelById = (() => {
        const m = new Map();
        for (const it of items || []) {
            const id = getId(it);
            if (id != null) m.set(String(id), getLabel(it));
        }
        return m;
    })();

    $: controlText = (() => {
        const labels = valueArr
            .map((id) => labelById.get(String(id)))
            .filter(Boolean);

        if (labels.length === 0) return placeholder;

        const head = labels.slice(0, 2).join(", ");
        const tail = labels.length > 2 ? ` +${labels.length - 2}` : "";
        return `${head}${tail}`;
    })();

    $: allIds = (() => {
        const out = [];
        const seen = new Set();
        for (const it of items || []) {
            const id = getId(it);
            if (id == null) continue;
            const sid = String(id);
            if (seen.has(sid)) continue;
            seen.add(sid);
            out.push(sid);
        }
        return out;
    })();

    $: totalAvailable = allIds.length;

    function clampDraftToMax(arr) {
        if (effectiveMax == null) return Array.from(new Set(arr.map(String)));
        const uniq = Array.from(new Set(arr.map(String)));
        return uniq.slice(0, effectiveMax);
    }

    function openOverlay() {
        if (disabled) return;

        draft = clampDraftToMax([...valueArr]);
        query = "";
        overlay?.openOverlay();
        isOpen = true;

        tick().then(() => {
            if (showSearch && searchEl) searchEl.focus();
        });
    }

    function closeOverlay(confirm = false) {
        if (confirm) {
            value = [...draft];
            dispatch("change", { value });
            dispatch("confirm", { value });
        } else {
            dispatch("cancel");
        }

        isOpen = false;
        overlay?.closeOverlay();
        groupCheckboxEls = {};
    }

    function selectAll() {
        draft = clampDraftToMax(allIds);
    }

    function deselectAll() {
        draft = [];
    }

    function canAdd(set) {
        return effectiveMax == null || set.size < effectiveMax;
    }

    function toggleOne(id) {
        const sid = String(id);
        const set = new Set(draft.map(String));

        if (set.has(sid)) {
            set.delete(sid);
        } else {
            if (!canAdd(set)) return;
            set.add(sid);
        }

        draft = Array.from(set);
    }

    function toggleMany(ids, nextChecked) {
        const set = new Set(draft.map(String));

        if (nextChecked) {
            for (const id of ids) {
                if (!canAdd(set)) break;
                set.add(String(id));
            }
        } else {
            for (const id of ids) {
                set.delete(String(id));
            }
        }

        draft = Array.from(set);
    }

    // proper Svelte action signature: (node, param)
    function captureGroupCheckbox(node, key) {
        groupCheckboxEls[key] = node;

        return {
            update(nextKey) {
                if (nextKey === key) return;
                if (groupCheckboxEls[key] === node) delete groupCheckboxEls[key];
                key = nextKey;
                groupCheckboxEls[key] = node;
            },
            destroy() {
                if (groupCheckboxEls[key] === node) delete groupCheckboxEls[key];
            },
        };
    }

    $: draftSet = new Set(draft.map(String));
    $: q = query.trim().toLowerCase();

    $: groups = (() => {
        const out = [];
        const byGroup = new Map();

        for (const it of items || []) {
            const id = getId(it);
            if (id == null) continue;

            const gLabel = groupKey ? (getGroup(it) || "Other") : "";
            const key = groupKey ? gLabel : "__all__";

            if (!byGroup.has(key)) {
                const groupObj = { key, label: gLabel, items: [] };
                byGroup.set(key, groupObj);
                out.push(groupObj);
            }

            byGroup.get(key).items.push({
                id: String(id),
                label: getLabel(it),
                raw: it,
            });
        }

        for (const g of out) {
            g.items.sort((a, b) => a.label.localeCompare(b.label));
        }

        return out;
    })();

    // reactive per-group state map (full-group, not filtered)
    $: groupStatesByKey = (() => {
        const states = {};
        for (const g of groups) {
            const total = g.items.length;
            let selected = 0;

            for (const it of g.items) {
                if (draftSet.has(it.id)) selected += 1;
            }

            states[g.key] = {
                total,
                selected,
                checked: total > 0 && selected === total,
                indeterminate: selected > 0 && selected < total,
            };
        }
        return states;
    })();

    // search surfaces headers:
    // - group shows if group label matches query OR any item matches
    $: visibleGroups = groups
        .map((g) => {
            if (!q) return { ...g, visibleItems: g.items };

            const groupMatch = g.label.toLowerCase().includes(q);
            const items2 = groupMatch
                ? g.items
                : g.items.filter((it) => it.label.toLowerCase().includes(q));

            return { ...g, visibleItems: items2, groupMatch };
        })
        .filter((g) => g.visibleItems.length > 0 || (!!q && g.groupMatch));

    function groupAllItems(g) {
        // ALWAYS operate on full group (not filtered)
        return g.items;
    }

    // keep indeterminate visuals in sync
    $: if (isOpen) {
        draftSet;
        groupStatesByKey;
        for (const g of visibleGroups) {
            const el = groupCheckboxEls[g.key];
            const st = groupStatesByKey[g.key];
            if (!el || !st) continue;
            el.indeterminate = !!st.indeterminate;
        }
    }

    $: doneDisabled =
        disabled ||
        (effectiveMin != null && draftSet.size < effectiveMin);

    $: atMax = effectiveMax != null && draftSet.size >= effectiveMax;

    $: headerCountText = (() => {
        if (effectiveMax != null) return `${draftSet.size}/${effectiveMax}`;
        return `${draftSet.size}/${totalAvailable}`;
    })();

    function onKeydown(e) {
        if (!isOpen) return;
        if (e.key === "Escape") {
            e.preventDefault();
            closeOverlay(false);
        }
    }

    if (typeof window !== "undefined") {
        window.addEventListener("keydown", onKeydown);
        onDestroy(() => window.removeEventListener("keydown", onKeydown));
    }
</script>


<div class="multi-select">
    <button
        type="button"
        class="btn btn--block multi-select__control"
        on:click={openOverlay}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
    >
        <span class="multi-select__value">{controlText}</span>
        <span class="multi-select__meta text-muted">
            {#if valueArr.length}
                {#if effectiveMax != null}
                    {valueArr.length}/{effectiveMax}
                {:else}
                    {valueArr.length}
                {/if}
            {/if}
        </span>
    </button>

    <Overlay
        bind:this={overlay}
        open={isOpen}
        hash={overlayHash}
        openClass="overlay"
        closedClass="u-hidden"
        renderOpenOnly={false}
        ariaLabel={title}
        windowedAt={480}
        on:requestClose={() => closeOverlay(false)}
    >
        {#if isOpen}
            <button
                type="button"
                class="overlay__scrim"
                aria-hidden="true"
                tabindex="-1"
                on:click={() => closeOverlay(false)}
            ></button>

            <div class="overlay__panel multiselect__panel">
                <!-- Header -->
                <header class="bar bar--header overlay__header">
                    <div class="bar__inner">
                        <div class="bar__title">
                            <h3>{title}</h3>
                            {#if hint}
                                <p class="text-hint">{hint}</p>
                            {/if}
                        </div>
                    </div>
                </header>

                <!-- Body: scrollable content -->
                <main class="overlay__body multi-select__body">
                    {#if showSearch || showBulkActions}
                        <div class="multi-select__tools">
                            {#if showSearch}
                                <input
                                    bind:this={searchEl}
                                    type="search"
                                    placeholder={searchPlaceholder}
                                    bind:value={query}
                                    aria-label={searchPlaceholder}
                                    disabled={disabled}
                                />
                            {/if}

                            {#if showBulkActions}
                                <div class="multi-select__bulk">
                                    <button
                                        type="button"
                                        class="btn btn--ghost btn--block"
                                        on:click={selectAll}
                                        disabled={disabled || (items || []).length === 0}
                                    >
                                        Select all
                                    </button>

                                    <button
                                        type="button"
                                        class="btn btn--ghost btn--block"
                                        on:click={deselectAll}
                                        disabled={disabled || draft.length === 0}
                                    >
                                        Deselect all
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {/if}

                    <div class="multi-select__list">
                        {#if visibleGroups.length === 0}
                            <div class="multi-select__empty text-muted">No results.</div>
                        {:else}
                            {#each visibleGroups as g (g.key)}
                                {#if groupKey}
                                    {@const st = groupStatesByKey[g.key]}

                                    {#if allowGroupSelect}
                                        <label
                                            class="multi-select__row multi-select__row--group"
                                            aria-disabled={disabled}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!st?.checked}
                                                use:captureGroupCheckbox={g.key}
                                                on:change={(e) => {
                                                    const scope = groupAllItems(g);
                                                    toggleMany(scope.map((it) => it.id), e.target.checked);
                                                }}
                                                disabled={disabled || (st?.total || 0) === 0}
                                            />
                                            <span class="multi-select__label">{g.label}</span>
                                            <span class="multi-select__count text-muted">{st?.total || 0}</span>
                                        </label>
                                    {:else}
                                        <div
                                            class="multi-select__row multi-select__row--group multi-select__row--group--static"
                                            aria-disabled="true"
                                        >
                                            <span class="multi-select__group-spacer" aria-hidden="true"></span>
                                            <span class="multi-select__label">{g.label}</span>
                                            <span class="multi-select__count text-muted">{st?.total || 0}</span>
                                        </div>
                                    {/if}
                                {/if}

                                {#if (g.visibleItems || []).length > 0}
                                    {#each g.visibleItems as it (it.id)}
                                        {@const isSelected = draftSet.has(it.id)}
                                        {@const atMaxForItem = effectiveMax != null && draftSet.size >= effectiveMax}
                                        <label class="multi-select__row" aria-selected={isSelected}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={disabled || (!isSelected && atMaxForItem)}
                                                on:change={() => toggleOne(it.id)}
                                            />
                                            <span class="multi-select__label">{it.label}</span>
                                        </label>
                                    {/each}
                                {/if}
                            {/each}
                        {/if}
                    </div>
                </main>

                <!-- Bottom actionbar -->
                <div class="overlay__actionbar">
                    <div class="overlay__actions">
                        <div class="overlay__actions-left">
                            <button
                                type="button"
                                class="btn btn--ghost"
                                on:click={() => closeOverlay(false)}
                            >
                                <Icon icon={UI_ICONS.close} class="btn__icon" />
                                <span class="btn__label">Cancel</span>
                            </button>
                        </div>
                        <div class="overlay__actions-right">
                            <span
                                class={"multi-select__headerCount text-muted " + (atMax ? "is-at-max" : "")}
                                aria-live="polite"
                            >
                                {headerCountText}
                            </span>

                            <button
                                type="button"
                                class="btn btn--primary"
                                on:click={() => closeOverlay(true)}
                                disabled={doneDisabled}
                            >
                                <Icon icon={UI_ICONS.check} class="btn__icon" />
                                <span class="btn__label">Done</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </Overlay>
</div>
