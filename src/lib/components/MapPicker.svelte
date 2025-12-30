
<script>
    import { onMount, tick } from "svelte";
    import { createEventDispatcher } from "svelte";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { on } from "svelte/events";
    import Overlay from "$lib/components/Overlay.svelte";

    const ACCENT = "var(--color-black)";

    export let overlayHash = "#select-location";
    let overlay;


    // ─── Props passed into the component ─────────────────────────────────────────
    export let mode = "preview";   // "preview" (small static view) or "fullscreen"
    export let lat = 51.505;       // initial latitude (default: London)
    export let lng = -0.09;        // initial longitude (default: London)
    export let radius;             // optional radius for drawing a circle (meters)
    export let defaultZoom = 11;   // default zoom level
    export let title = "Select location";                       // fullscreen title
    export let hint = "Pin the location on the map";            // fullscreen hint text


    // ─── Constants and utility functions ────────────────────────────────────────
    const FALLBACK_LAT = 51.505;
    const FALLBACK_LNG = -0.09;
    const finiteOr = (v, fb) => (typeof v === "number" && Number.isFinite(v) ? v : fb);


    // ─── Local state ─────────────────────────────────────────────────────────────
    let interactable = mode === "fullscreen";  // interactive only in fullscreen

    let confLat = finiteOr(lat, FALLBACK_LAT);
    let confLng = finiteOr(lng, FALLBACK_LNG);
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
        overlay?.openOverlay(); // Overlay logic: scroll lock + hash
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

    export async function open() {
        await enterFullscreen();
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
        overlay?.closeOverlay();
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

    function makeAccentPinIcon() {
        return L.divIcon({
            className: "leaflet-accent-pin",
            html: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor"
                d="M12 2c-3.3 0-6 2.7-6 6 0 4.5 6 14 6 14s6-9.5 6-14c0-3.3-2.7-6-6-6zm0 8.5A2.5 2.5 0 1 1 12 5.5a2.5 2.5 0 0 1 0 5z"/>
            </svg>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });
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
        marker = L.marker([pinLat, pinLng], {
            draggable: true,
            icon: makeAccentPinIcon()
        }).addTo(map);
        marker.on("drag", handleMarkerDrag);

        // Initial circle if radius provided
        if (typeof radius === "number" && radius > 0) {
            circle = L.circle([pinLat, pinLng], {
                radius,
                color: ACCENT,
                fillColor: ACCENT,
                fillOpacity: 0.15,
                weight: 2
            }).addTo(map);
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
                circle = L.circle([pinLat, pinLng], {
                    radius: r,
                    color: "var(--accent)",
                    fillColor: "var(--accent)",
                    fillOpacity: 0.15,
                    weight: 2
                }).addTo(map);
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
            // No radius -> just center on confirmed point at default zoom
            centerOnConfirmed();
        }
    }

    onMount(() => {
        initMap();
    });
</script>


<Overlay
    bind:this={overlay}
    open={mode === "fullscreen"}
    hash={overlayHash}
    openClass="overlay"
    closedClass="mappicker__preview card"
    renderOpenOnly={false}
    role="presentation"
    ariaModal={false}
    ariaLabel="Select location"
    windowedAt={768}
    on:requestClose={() => exitToPreview(false)}
>
    {#if mode === "fullscreen"}
        <button
            type="button"
            class="overlay__scrim"
            aria-hidden="true"
            tabindex="-1"
            on:click={() => exitToPreview(false)}
        ></button>
    {/if}

    <div class={mode === "fullscreen" ? "overlay__panel" : "mappicker__panel"}>
        {#if mode === "fullscreen"}
            <header class="bar bar--header overlay__header">
                <div class="bar__inner">
                    <div class="bar__title">
                        {#if title}<h3>{title}</h3>{/if}
                        {#if hint}<p class="text-hint">{hint}</p>{/if}
                    </div>
                </div>
            </header>
        {/if}

        <main class={mode === "fullscreen"
            ? "overlay__body overlay__body--no-scroll mappicker__body"
            : "mappicker__body"}
        >
            <div class="mappicker__stage">
                <div class="mappicker__map-wrapper">
                    <button
                        type="button"
                        bind:this={mapContainer}
                        class="mappicker__map ui-pressable"
                        on:click={mode === "preview" ? enterFullscreen : null}
                        aria-label="Open map in fullscreen"
                    ></button>
                </div>
            </div>
        </main>

        {#if mode === "fullscreen"}
            <div class="overlay__actionbar">
                <div class="overlay__actions">
                    <div class="overlay__actions-left">
                        <button
                            type="button"
                            class="btn btn--ghost"
                            on:click={() => exitToPreview(false)}
                        >
                            <Icon icon={UI_ICONS.close} class="btn__icon" />
                            <span class="btn__label">Cancel</span>
                        </button>
                    </div>
                    <div class="overlay__actions-right">
                        <button
                            type="button"
                            class="btn btn--primary"
                            on:click={() => exitToPreview(true)}
                        >
                            <Icon icon={UI_ICONS.check} class="btn__icon" />
                            <span class="btn__label">Confirm</span>
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</Overlay>
