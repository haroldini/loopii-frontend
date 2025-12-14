
<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import noUiSlider from "nouislider";

    export let min = 0;
    export let max = 100;
    export let step = 1;
    export let gap = 0;

    // bind from parent; "" means unset
    export let valueMin = "";
    export let valueMax = "";

    // if true, edge counts as unset
    export let openMin = false;
    export let openMax = false;

    export let disabled = false;

    const dispatch = createEventDispatcher();

    let sliderEl;
    let sliderApi = null;

    let internalSet = false;
    let updatingFromSlider = false;

    let lastSyncedMin = valueMin;
    let lastSyncedMax = valueMax;

    function toNumberOrNull(v) {
        if (v === "" || v == null) return null;
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        return n;
    }

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }

    function normalizePair(a, b) {
        const lo0 = a == null ? min : clamp(a, min, max);
        const hi0 = b == null ? max : clamp(b, min, max);

        const g = Math.max(0, Number(gap) || 0);

        const lo = clamp(lo0, min, max - g);
        const hi = clamp(Math.max(hi0, lo + g), min + g, max);

        return [lo, hi];
    }

    function applyEdgeSemantics(lo, hi) {
        if (lo === min && hi === max) {
            return { nextMin: "", nextMax: "" };
        }

        const nextMin = openMin && lo === min ? "" : String(lo);
        const nextMax = openMax && hi === max ? "" : String(hi);

        return { nextMin, nextMax };
    }

    function valuesToStart() {
        const a = toNumberOrNull(valueMin);
        const b = toNumberOrNull(valueMax);
        return normalizePair(a, b);
    }

    function setSlider(lo, hi) {
        if (!sliderApi) return;

        internalSet = true;
        sliderApi.set([lo, hi]);
        internalSet = false;
    }

    function syncSliderFromValues() {
        const [lo, hi] = valuesToStart();
        setSlider(lo, hi);
    }

    function commitInputs() {
        const aRaw = toNumberOrNull(valueMin);
        const bRaw = toNumberOrNull(valueMax);

        // blank if outside range
        const a = aRaw == null ? null : (aRaw < min || aRaw > max ? null : aRaw);
        const b = bRaw == null ? null : (bRaw < min || bRaw > max ? null : bRaw);

        const [lo, hi] = normalizePair(a, b);
        const { nextMin, nextMax } = applyEdgeSemantics(lo, hi);

        valueMin = nextMin;
        valueMax = nextMax;

        lastSyncedMin = valueMin;
        lastSyncedMax = valueMax;

        dispatch("change", { valueMin, valueMax });
        syncSliderFromValues();
    }

    function preventBadKeys(e) {
        // stop number input accepting exponent / +/- (common source of garbage)
        const k = e.key;
        if (k === "e" || k === "E" || k === "+" || k === "-") {
            e.preventDefault();
            return;
        }

        const s = Number(step);
        const integerStep = Number.isFinite(s) && Math.floor(s) === s;
        if (integerStep && k === ".") {
            e.preventDefault();
        }
    }

    onMount(() => {
        const [startLo, startHi] = valuesToStart();

        sliderApi = noUiSlider.create(sliderEl, {
            start: [startLo, startHi],
            connect: true,
            step: Number(step) || 1,
            range: { min, max },

            // prevents crossing / overlap
            margin: Number(gap) || 0,

            // IMPORTANT: no "drag" (dragging the connect bar moves both)
            // tap lets user click the track to move the nearest handle
            behaviour: "tap",
        });

        sliderApi.on("update", (vals) => {
            if (internalSet) return;

            updatingFromSlider = true;

            const lo = Number(vals[0]);
            const hi = Number(vals[1]);

            const { nextMin, nextMax } = applyEdgeSemantics(lo, hi);
            const changed = nextMin !== valueMin || nextMax !== valueMax;

            valueMin = nextMin;
            valueMax = nextMax;

            lastSyncedMin = valueMin;
            lastSyncedMax = valueMax;

            updatingFromSlider = false;

            if (changed) {
                dispatch("change", { valueMin, valueMax });
            }
        });

        if (disabled) {
            sliderEl.setAttribute("disabled", "true");
        }
    });

    $: if (sliderEl && sliderApi) {
        if (disabled) sliderEl.setAttribute("disabled", "true");
        else sliderEl.removeAttribute("disabled");
    }

    // only sync slider when values change from outside OR from inputs
    $: if (sliderApi && !updatingFromSlider) {
        const changed = valueMin !== lastSyncedMin || valueMax !== lastSyncedMax;
        if (changed) {
            lastSyncedMin = valueMin;
            lastSyncedMax = valueMax;
            syncSliderFromValues();
        }
    }

    onDestroy(() => {
        if (sliderApi) {
            sliderApi.destroy();
            sliderApi = null;
        }
    });
</script>

<div class="range-slider">
    <div class="range-slider__inner">
        <input
            class="range-slider__box"
            type="number"
            min={min}
            max={max}
            step={step}
            inputmode="numeric"
            placeholder="Min"
            bind:value={valueMin}
            disabled={disabled}
            aria-label="Minimum value"
            on:keydown={preventBadKeys}
            on:blur={commitInputs}
        />

        <div class="range-slider__mid">
            <div class="range-slider__noui" bind:this={sliderEl}></div>
        </div>

        <input
            class="range-slider__box"
            type="number"
            min={min}
            max={max}
            step={step}
            inputmode="numeric"
            placeholder="Max"
            bind:value={valueMax}
            disabled={disabled}
            aria-label="Maximum value"
            on:keydown={preventBadKeys}
            on:blur={commitInputs}
        />
    </div>
</div>


<style>
    /* tweak these */
    .range-slider {
        --rs-thumb: 20px;
        --rs-bar: 12px;

        width: 100%;
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        border: var(--border-width) solid var(--border-color);
        background: var(--bg-surface);
    }

    .range-slider:focus-within {
        outline: var(--focus-ring-width) solid var(--focus-ring-color);
        outline-offset: var(--focus-ring-offset);
    }

    .range-slider__inner {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: var(--space-2);
        align-items: center;
    }

    .range-slider__box {
        width: 34px;
        border: 0;
        background: transparent;
        padding: 0;
        text-align: center;
        color: var(--text-secondary);
    }

    .range-slider__box:focus {
        outline: none;
    }

    .range-slider__box::placeholder {
        color: var(--text-muted);
    }

    .range-slider__mid {
        min-width: 0;
        display: flex;
        align-items: center;
    }

    .range-slider__noui {
        width: 100%;
        padding: 0 6px;
    }

    /* IMPORTANT: .noUi-target is on the SAME element as .range-slider__noui */
    .range-slider__noui:global(.noUi-target) {
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
    }

    /* The overall slider "row" height should match the THUMB so it can sit nicely */
    .range-slider__noui:global(.noUi-target.noUi-horizontal) {
        height: var(--rs-thumb) !important;
    }

    .range-slider__noui :global(.noUi-base) {
        height: var(--rs-thumb) !important;
    }

    /* Track container: center a 12px bar within the 16px row */
    .range-slider__noui :global(.noUi-connects) {
        height: var(--rs-bar) !important;
        top: 50% !important;
        transform: translateY(-50%) !important;

        border-radius: var(--radius-full) !important;
        background: var(--border-color) !important;
    }

    .range-slider__noui :global(.noUi-connect) {
        height: var(--rs-bar) !important;
        border-radius: var(--radius-full) !important;
        background: var(--accent) !important;
        transition: none !important;
    }

    /* Handles: 16px, aligned with the 16px row (NOT the 12px bar) */
    .range-slider__noui :global(.noUi-handle) {
        width: var(--rs-thumb) !important;
        height: var(--rs-thumb) !important;

        top: 0 !important;
        transform: none !important;

        /* keep the correct noUi offset behaviour */
        right: calc(-0.5 * var(--rs-thumb)) !important;

        border-radius: var(--radius-full) !important;
        border: var(--border-width) solid var(--border-color) !important;
        background: var(--bg-surface) !important;
        box-shadow: none !important;

        cursor: grab !important;
    }

    .range-slider__noui :global(.noUi-handle:active) {
        cursor: grabbing !important;
    }

    .range-slider__noui :global(.noUi-handle::before),
    .range-slider__noui :global(.noUi-handle::after) {
        display: none !important;
    }
</style>
