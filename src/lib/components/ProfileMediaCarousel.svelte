<script>
    import { onMount, onDestroy } from "svelte";

    export let images = [];
    export let fallbackUrl = "";
    export let alt = "Profile photos";

    let track;
    let activeIndex = 0;

    let raf = 0;
    let ro = null;

    let showHud = false;
    let hudTimer = 0;

    let loaded = [];

    function getUrlFromImage(img) {
        if (!img || !img.urls) return "";
        return img.urls.medium || img.urls.large || img.urls.small || "";
    }

    function buildUrls() {
        const urls = [];

        if (Array.isArray(images) && images.length) {
            const sorted = images
                .slice()
                .sort((a, b) => (b && b.is_avatar ? 1 : 0) - (a && a.is_avatar ? 1 : 0));

            for (const img of sorted) {
                const u = getUrlFromImage(img);
                if (u) urls.push(u);
            }
        }

        if (!urls.length && fallbackUrl) {
            urls.push(fallbackUrl);
        }

        const deduped = [];
        const seen = new Set();
        for (const u of urls) {
            if (u && !seen.has(u)) {
                seen.add(u);
                deduped.push(u);
            }
        }

        return deduped;
    }

    $: urls = buildUrls();

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    function bumpHud() {
        if (urls.length <= 1) return;

        showHud = true;
        clearTimeout(hudTimer);
        hudTimer = setTimeout(() => {
            showHud = false;
        }, 1200);
    }

    function syncActiveFromScroll() {
        if (!track) return;

        const w = track.clientWidth || 1;
        const idx = Math.round(track.scrollLeft / w);
        activeIndex = clamp(idx, 0, Math.max(0, urls.length - 1));
    }

    function onScroll() {
        bumpHud();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(syncActiveFromScroll);
    }

    function goTo(i) {
        if (!track) return;
        bumpHud();

        const w = track.clientWidth || 1;
        track.scrollTo({ left: i * w, behavior: "smooth" });
    }

    $: canPrev = activeIndex > 0;
    $: canNext = activeIndex < urls.length - 1;

    function prev() {
        if (!canPrev) return;
        goTo(activeIndex - 1);
    }

    function next() {
        if (!canNext) return;
        goTo(activeIndex + 1);
    }

    function markLoaded(i) {
        if (!loaded || !loaded.length) return;
        if (loaded[i]) return;
        loaded = loaded.map((v, idx) => (idx === i ? true : v));
    }

    let lastKey = "";

    $: {
        const key = urls.join("|");
        if (key !== lastKey) {
            lastKey = key;

            activeIndex = 0;
            loaded = urls.map(() => false);

            if (track) {
                track.scrollTo({ left: 0, behavior: "auto" });
            }

            bumpHud();
        }
    }

    onMount(() => {
        syncActiveFromScroll();
        bumpHud();

        if (track && "ResizeObserver" in window) {
            ro = new ResizeObserver(() => syncActiveFromScroll());
            ro.observe(track);
        }
    });

    onDestroy(() => {
        cancelAnimationFrame(raf);
        clearTimeout(hudTimer);
        if (ro) ro.disconnect();
    });
</script>

<div class="profile-media" aria-roledescription="carousel" aria-label={alt}>
    <div class="profile-media__track" bind:this={track} on:scroll={onScroll}>
        {#if urls.length}
            {#each urls as url, i (url)}
                <div class="profile-media__slide">
                    <img
                        class={"profile-media__img" + (loaded[i] ? " is-loaded" : "")}
                        src={url}
                        alt=""
                        draggable="false"
                        decoding="async"
                        loading={i === 0 ? "eager" : "lazy"}
                        fetchpriority={i === 0 ? "high" : "auto"}
                        on:load={() => markLoaded(i)}
                    />
                </div>
            {/each}
        {:else}
            <div class="profile-media__slide"></div>
        {/if}
    </div>

    {#if urls.length > 1}
        <div class={"profile-media__count" + (showHud ? " is-visible" : "")}>
            {activeIndex + 1}/{urls.length}
        </div>

        <button
            type="button"
            class="profile-media__nav profile-media__nav--prev"
            aria-label="Previous photo"
            disabled={!canPrev}
            on:click|stopPropagation={prev}
        >
            <span class="profile-media__navIcon">‹</span>
        </button>

        <button
            type="button"
            class="profile-media__nav profile-media__nav--next"
            aria-label="Next photo"
            disabled={!canNext}
            on:click|stopPropagation={next}
        >
            <span class="profile-media__navIcon">›</span>
        </button>

        <div class="profile-media__dots" aria-label="Photo progress">
            {#each urls as _, j}
                <button
                    type="button"
                    class={"profile-media__dot" + (j === activeIndex ? " is-active" : "")}
                    aria-label={"Go to photo " + (j + 1)}
                    aria-current={j === activeIndex ? "true" : "false"}
                    on:click|stopPropagation={() => goTo(j)}
                ></button>
            {/each}
        </div>
    {/if}
</div>
