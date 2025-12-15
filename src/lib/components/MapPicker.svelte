
<script>
    import { onMount, tick } from "svelte";
    import { createEventDispatcher } from "svelte";

    // ─── Props passed into the component ─────────────────────────────────────────
    export let mode = "preview";   // "preview" (small static view) or "fullscreen"
    export let lat = 51.505;       // initial latitude (default: London)
    export let lng = -0.09;        // initial longitude (default: London)
    export let radius;             // optional radius for drawing a circle (meters)
    export let defaultZoom = 11;   // default zoom level

    // ─── Local state ─────────────────────────────────────────────────────────────
    let interactable = mode === "fullscreen";  // interactive only in fullscreen
    let confLat = lat ?? 51.505;  // confirmed (saved) latitude
    let confLng = lng ?? -0.09;   // confirmed (saved) longitude
    let pinLat = confLat;         // current pin latitude (may differ before confirm)
    let pinLng = confLng;         // current pin longitude

    // Leaflet objects and references
    let map;
    let marker;
    let circle;
    let mapContainer;
    let L;

    let ignoreNextMapClick = false; // Prevents accidental first click
    const dispatch = createEventDispatcher();

    // Enable or disable map interactions (drag, zoom, clicks)
    function setInteractivity(enabled) {
        if (!map || !marker) return;
        if (enabled) {
            map.dragging.enable();
            map.scrollWheelZoom.enable();
            marker.dragging.enable();
            map.on("click", handleMapClick);
        } else {
            map.dragging.disable();
            map.scrollWheelZoom.disable();
            marker.dragging.disable();
            map.off("click", handleMapClick);
        }
    }

    // Center map on confirmed coords
    function centerOnConfirmed() {
        if (!map) return;
        map.setView([confLat, confLng], defaultZoom);
    }

    // Reset pin marker to confirmed position
    function syncPinToConfirmed() {
        pinLat = confLat;
        pinLng = confLng;
        if (marker) marker.setLatLng([pinLat, pinLng]);
        if (circle) circle.setLatLng([pinLat, pinLng]);
    }

    // Enter fullscreen mode, set interactable
    async function enterFullscreen() {
        mode = "fullscreen";
        interactable = true;
        ignoreNextMapClick = true; // Avoid triggering immediately on open
        syncPinToConfirmed();

        await tick(); // Wait for DOM
        setInteractivity(true);

        if (map) {
            map.invalidateSize(); // Redraw map to avoid tile glitches
            if (circle) {
                map.fitBounds(circle.getBounds(), { padding: [20, 20] });
            } else {
                centerOnConfirmed();
            }
        }
    }

    // Exit fullscreen mode (confirm / back)
    async function exitToPreview(confirm = false) {
        if (confirm) {
            confLat = pinLat;
            confLng = pinLng;
            dispatch("confirm", { lat: confLat, lng: confLng });
        } else {
            syncPinToConfirmed();
            dispatch("back");
        }

        mode = "preview";
        interactable = false;
        await tick();
        setInteractivity(false);

        if (map) {
            map.invalidateSize();
            if (circle) {
                map.fitBounds(circle.getBounds(), { padding: [20, 20] });
            } else {
                centerOnConfirmed();
            }
        }
    }

    // Move the pin on map click - circle follows
    function handleMapClick(e) {
        if (ignoreNextMapClick) {
            ignoreNextMapClick = false;
            return;
        }
        const pos = e.latlng;
        pinLat = pos.lat;
        pinLng = pos.lng;
        if (marker) marker.setLatLng(pos);
        if (circle) circle.setLatLng(pos);
    }

    // Handle dragging of marker - circle follows
    function handleMarkerDrag(e) {
        const pos = e.target.getLatLng();
        pinLat = pos.lat;
        pinLng = pos.lng;
        if (circle) circle.setLatLng([pinLat, pinLng]);
    }

    // Initialise leaflet map
    async function initMap() {
        if (typeof window === "undefined") return;
        if (!mapContainer) return;

        // Lazy load Leaflet library & CSS
        if (!L) {
            const leafletModule = await import("leaflet");
            await import("leaflet/dist/leaflet.css");
            L = leafletModule.default ?? leafletModule;
        }

        // Create map
        map = L.map(mapContainer).setView([confLat, confLng], defaultZoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        // Add marker
        marker = L.marker([pinLat, pinLng], { draggable: true }).addTo(map);
        marker.on("drag", handleMarkerDrag);

        // Initial circle if radius provided
        if (typeof radius === "number" && radius > 0) {
            circle = L.circle([pinLat, pinLng], { radius, color: "blue" }).addTo(map);
            // Fit zoom to include the whole circle
            map.fitBounds(circle.getBounds(), { padding: [20, 20] });
        }

        setInteractivity(interactable);
    }

    // React to radius prop changes (create/update/remove circle and adjust zoom)
    $: if (map && marker) {
        const r = typeof radius === "number" ? radius : 0;

        if (r > 0) {
            if (!circle) {
                circle = L.circle([pinLat, pinLng], { radius: r, color: "blue" }).addTo(map);
            } else {
                circle.setRadius(r);
                circle.setLatLng([pinLat, pinLng]);
            }
            // Adjust zoom to fit the new radius
            map.fitBounds(circle.getBounds(), { padding: [20, 20] });
        } else {
            if (circle) {
                map.removeLayer(circle);
                circle = null;
            }
            // No radius → just center on confirmed point at default zoom
            centerOnConfirmed();
        }
    }

    onMount(() => {
        initMap();
    });
</script>

<div class={mode === "fullscreen" ? "overlay" : "mappicker__preview card"}>
    {#if mode === "fullscreen"}
        <div class="overlay__scrim"></div>
    {/if}

    <div class={mode === "fullscreen" ? "overlay__panel" : "mappicker__panel"}>
        {#if mode === "fullscreen"}
            <header class="overlay__header">
                <button
                    type="button"
                    class="btn btn--ghost"
                    on:click={() => exitToPreview(false)}
                >
                    Back
                </button>

                <div class="overlay__title">Select Location</div>

                <div class="overlay__actions">
                    <button
                        type="button"
                        class="btn btn--primary"
                        on:click={() => exitToPreview(true)}
                    >
                        Confirm
                    </button>
                </div>
            </header>
        {/if}

        <div class={mode === "fullscreen" ? "overlay__body mappicker__body" : "mappicker__body"}>
            <!-- IMPORTANT: same element exists in both modes (no {#if} around it) -->
            <button
                type="button"
                bind:this={mapContainer}
                class="mappicker__map pressable"
                on:click={mode === "preview" ? enterFullscreen : null}
                aria-label="Open map in fullscreen"
            ></button>
        </div>
    </div>
</div>

<style>
    .mappicker__preview {
        width: 100%;
        aspect-ratio: 16 / 9;
        max-width: 600px;
        overflow: hidden;
        padding: 0;
        border-radius: var(--radius-lg);
    }

    .mappicker__panel {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    /* Works for both preview and fullscreen (in fullscreen it sits inside overlay__body) */
    .mappicker__body {
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .mappicker__map {
        width: 100%;
        height: 100%;
        border: 0;
        padding: 0;
        margin: 0;
        border-radius: 0;
        background: transparent;
    }
</style>
