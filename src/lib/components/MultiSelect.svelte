
<script>
    import { createEventDispatcher, onDestroy, tick } from "svelte";

    export let title = "Select";
    export let placeholder = "Any";
    export let searchPlaceholder = "Search...";
    export let items = [];

    // keys (works for countries, interests, languages)
    export let valueKey = "id";
    export let labelKey = "name";
    export let groupKey = null; // e.g. "region" or "sub_region"

    export let value = []; // bind:value from parent
    export let disabled = false;

    const dispatch = createEventDispatcher();

    let isOpen = false;
    let query = "";
    let draft = [];

    let searchEl;
    let groupCheckboxEls = {};

    function normArray(v) {
        return Array.isArray(v) ? v : [];
    }

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

    function openOverlay() {
        if (disabled) return;

        draft = [...valueArr];
        query = "";
        isOpen = true;

        tick().then(() => {
            if (searchEl) searchEl.focus();
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
        groupCheckboxEls = {};
    }

    function selectAll() {
        const all = [];
        for (const it of items || []) {
            const id = getId(it);
            if (id != null) all.push(String(id));
        }
        draft = Array.from(new Set(all));
    }

    function deselectAll() {
        draft = [];
    }

    function toggleOne(id) {
        const sid = String(id);
        const set = new Set(draft.map(String));

        if (set.has(sid)) set.delete(sid);
        else set.add(sid);

        draft = Array.from(set);
    }

    function toggleMany(ids, nextChecked) {
        const set = new Set(draft.map(String));

        for (const id of ids) {
            const sid = String(id);
            if (nextChecked) set.add(sid);
            else set.delete(sid);
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

    // reactive per-group state map (this is what fixes your issue)
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
        draftSet; // force rerun on selection change
        groupStatesByKey; // same
        for (const g of visibleGroups) {
            const el = groupCheckboxEls[g.key];
            const st = groupStatesByKey[g.key];
            if (!el || !st) continue;
            el.indeterminate = !!st.indeterminate;
        }
    }

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
        class="multi-select__control pressable"
        on:click={openOverlay}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
    >
        <span class="multi-select__value">{controlText}</span>
        <span class="multi-select__meta muted">{valueArr.length ? `${valueArr.length}` : ""}</span>
    </button>

    {#if isOpen}
        <div class="overlay" role="dialog" aria-modal="true" aria-label={title}>
            <button
                type="button"
                class="overlay__scrim"
                aria-label="Close"
                on:click={() => closeOverlay(false)}
            ></button>

            <div class="overlay__panel">
                <header class="overlay__header">
                    <button type="button" class="btn btn--ghost" on:click={() => closeOverlay(false)}>
                        Back
                    </button>

                    <div class="overlay__title">{title}</div>

                    <div class="overlay__actions">
                        <button type="button" class="btn btn--primary" on:click={() => closeOverlay(true)}>
                            Done
                        </button>
                    </div>
                </header>

                <div class="overlay__body">
                    <div class="multi-select__tools">
                        <input
                            bind:this={searchEl}
                            type="search"
                            placeholder={searchPlaceholder}
                            bind:value={query}
                            aria-label={searchPlaceholder}
                            disabled={disabled}
                        />

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
                    </div>

                    <div class="multi-select__list">
                        {#if visibleGroups.length === 0}
                            <div class="multi-select__empty muted">No results.</div>
                        {:else}
                            {#each visibleGroups as g (g.key)}
                                {#if groupKey}
                                    <label class="multi-select__row multi-select__row--group">
                                        <input
                                            type="checkbox"
                                            checked={!!groupStatesByKey[g.key]?.checked}
                                            use:captureGroupCheckbox={g.key}
                                            on:change={(e) => {
                                                const scope = groupAllItems(g);
                                                toggleMany(scope.map((it) => it.id), e.target.checked);
                                            }}
                                            disabled={disabled || (groupStatesByKey[g.key]?.total || 0) === 0}
                                        />
                                        <span class="multi-select__label">{g.label}</span>
                                        <span class="multi-select__count muted">{groupStatesByKey[g.key]?.total || 0}</span>
                                    </label>
                                {/if}

                                {#if (g.visibleItems || []).length > 0}
                                    {#each g.visibleItems as it (it.id)}
                                        <label class="multi-select__row" aria-selected={draftSet.has(it.id)}>
                                            <input
                                                type="checkbox"
                                                checked={draftSet.has(it.id)}
                                                on:change={() => toggleOne(it.id)}
                                                disabled={disabled}
                                            />
                                            <span class="multi-select__label">{it.label}</span>
                                        </label>
                                    {/each}
                                {/if}
                            {/each}
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .multi-select__control {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);

        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        border: var(--border-width) solid var(--border-color);
        background: var(--bg-surface);
        color: var(--text-secondary);
        text-align: left;
        cursor: pointer;
    }

    .multi-select__control:hover {
        background: var(--bg-hover);
    }

    .multi-select__control:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .multi-select__value {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .multi-select__meta {
        flex: 0 0 auto;
        font-size: 0.9rem;
    }

    .multi-select__tools {
        position: sticky;
        top: 0;
        z-index: 2;

        padding: var(--space-2) var(--gutter);
        background: var(--bg-surface);
        border-bottom: var(--border-width) solid var(--border-color);

        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .multi-select__bulk {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-2);
    }

    .multi-select__list {
        padding: var(--space-2) var(--gutter) var(--space-4);
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .multi-select__empty {
        padding: var(--space-3) var(--gutter);
    }

    .multi-select__row {
        display: grid;
        grid-template-columns: 18px 1fr auto;
        gap: var(--space-2);
        align-items: center;

        padding: 0.55rem 0.6rem;
        border-radius: var(--radius-md);
        cursor: pointer;
        user-select: none;
    }

    .multi-select__row:hover {
        background: var(--bg-hover);
    }

    .multi-select__row[aria-selected="true"] {
        background: color-mix(in oklab, var(--accent) 14%, var(--bg-surface));
    }

    .multi-select__row--group {
        margin-top: var(--space-2);
        background: color-mix(in oklab, var(--bg-surface) 84%, var(--border-color));
        border: var(--border-width) solid var(--border-color);
    }

    .multi-select__row--group:hover {
        background: color-mix(in oklab, var(--bg-hover) 86%, var(--border-color));
    }

    .multi-select__label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text-secondary);
    }

    .multi-select__count {
        font-size: 0.85rem;
    }

    .multi-select__row input[type="checkbox"] {
        width: 18px;
        height: 18px;
        margin: 0;
        accent-color: var(--accent);
        cursor: pointer;
    }
</style>
