<script>
    import { onMount, tick } from "svelte";
    import { createEventDispatcher } from "svelte";

    // ─── Props passed into the component ─────────────────────────────────────────
    export let mode = "preview";   // "preview" (small static view) or "fullscreen"
    export let lat = 51.505;       // initial latitude (default: London)
    export let lng = -0.09;        // initial longitude (default: London)
    export let radius;             // optional radius for drawing a circle
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
            centerOnConfirmed();
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
            centerOnConfirmed();
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

        // Add marker and circle
        marker = L.marker([pinLat, pinLng], { draggable: true }).addTo(map);
        marker.on("drag", handleMarkerDrag);
        if (radius) {
            circle = L.circle([pinLat, pinLng], { radius, color: "blue" }).addTo(map);
        }

        setInteractivity(interactable);
    }

    onMount(() => {
        initMap();
    });
</script>

<!-- Template (preview / fullscreen) -->
<div class={mode === "fullscreen" ? "fullscreen-container" : "preview-container"}>
    {#if mode === "fullscreen"}
        <header class="map-header">
            <button on:click={() => exitToPreview(false)}>Back</button>
            <h2>Select Location</h2>
            <button on:click={() => exitToPreview(true)}>Confirm</button>
        </header>
    {/if}
    <button
        type="button"
        bind:this={mapContainer}
        class="map"
        on:click={mode === "preview" ? enterFullscreen : null}
        aria-label="Open map in fullscreen">
    </button>
</div>

<style>
    .map {
        border: none;
        border-radius: 0;
        margin: 0;
        padding: 0;
        cursor: pointer;
        width: 100%;
        height: 100%;
    }
    .preview-container {
        width: 100%;
        aspect-ratio: 16 / 9;
        max-width: 600px;
        border: 1px solid #ccc;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
    }
    .fullscreen-container {
        position: fixed;
        inset: 0;
        background: white;
        display: flex;
        flex-direction: column;
    }
    .map-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: #f2f2f2;
        border-bottom: 1px solid #ddd;
    }
    .fullscreen-container .map {
        flex: 1;
    }
</style>
