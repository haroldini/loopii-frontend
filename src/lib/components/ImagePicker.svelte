
<script>
    import { createEventDispatcher, tick, onDestroy, onMount } from "svelte";
    import Cropper from "cropperjs";
    import "cropperjs/dist/cropper.css";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js";
    import Overlay from "$lib/components/Overlay.svelte";

    const dispatch = createEventDispatcher();


    // ===== Overlay Management =====

    export let overlayHash = "#select-image";
    let overlay;


    // ===== Image Picker Logic =====

    // --- Props from parent ---
    export let initialOriginalUrl = null;
    export let initialEditedUrl = null;
    export let initialCropState = null;
    export let imageSize = 1080; // max size for cropped image
    export let imageQuality = 0.9; // JPEG quality for cropped image (0 to 1)
    export let title = "Upload photo";
    export let hint = "Select and crop an image to upload.";

    // --- State ---
    let originalUrl = null;   // last confirmed raw image
    let workingUrl = null;    // temp new raw image before confirm
    let editedUrl = null;     // cropped preview image (confirmed)

    let fileInput;
    let cropper = null;
    let imgElement;
    let internalMode = "preview"; // "preview" | "fullscreen"

    // Persisted crop states per source URL
    const lastStates = new Map();


    // --- Helpers ---
    function revokeUrl(u) {
        if (u?.startsWith("blob:")) {
            try { URL.revokeObjectURL(u); } catch {}
        }
    }

    function currentSourceKey() {
        return workingUrl || originalUrl;
    }

    function saveCropStateFor(key) {
        if (!key || !cropper) return;
        try {
            lastStates.set(key, {
                canvasData: cropper.getCanvasData(),
                cropBoxData: cropper.getCropBoxData(),
                data: cropper.getData()
            });
        } catch {}
    }

    function restoreCropStateFor(key) {
        if (!key || !cropper) return;
        const saved = lastStates.get(key);
        if (!saved) return;
        try {
            if (saved.canvasData) cropper.setCanvasData(saved.canvasData);
            if (saved.cropBoxData) cropper.setCropBoxData(saved.cropBoxData);
            if (saved.data) cropper.setData(saved.data);
        } catch {}
    }


    // --- Public API ---
    export async function open() {
        await enterFullscreen();
    }

    export function reset() {
        revokeUrl(originalUrl);
        revokeUrl(workingUrl);
        revokeUrl(editedUrl);
        originalUrl = null;
        workingUrl = null;
        editedUrl = null;
        lastStates.clear();
        if (fileInput) fileInput.value = "";
    }

    // --- Core Logic ---
    async function enterFullscreen() {
        overlay?.openOverlay();
        internalMode = "fullscreen";
        if (!originalUrl && !workingUrl) {
            if (fileInput) fileInput.value = "";
            fileInput?.click();
        }
        await tick();
    }

    async function exitToPreview(confirm = false) {
        const srcKey = currentSourceKey();

        if (confirm && cropper) {
            saveCropStateFor(srcKey);

            // get cropped image for preview
            const canvas = cropper.getCroppedCanvas({
                width: imageSize,
                height: imageSize,
                imageSmoothingQuality: "high"
            });

            const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", imageQuality));
            if (blob) {
                const file = new File([blob], "upload.jpg", { type: "image/jpeg" });
                revokeUrl(editedUrl);
                editedUrl = URL.createObjectURL(blob);

                // confirm the raw source: working replaces original if it exists
                if (workingUrl) {
                    revokeUrl(originalUrl);
                    originalUrl = workingUrl;
                    workingUrl = null;
                }

                saveCropStateFor(originalUrl);
                dispatch("confirm", {
                    editedUrl,
                    editedFile: file,
                    originalUrl,
                    cropState: lastStates.get(originalUrl)
                });
            }
        } else {
            // cancel — discard working image
            if (workingUrl) {
                revokeUrl(workingUrl);
                workingUrl = null;
            }
            dispatch("back");
        }

        // cleanup
        if (cropper) {
            try { cropper.destroy(); } catch {}
            cropper = null;
        }

        internalMode = "preview";
        overlay?.closeOverlay();
    }

    function handleFileSelect(e) {
        const f = e?.target?.files?.[0];
        if (!f) return;
        revokeUrl(workingUrl);
        workingUrl = URL.createObjectURL(f);
    }

    export function replaceImage() {
        internalMode = "fullscreen";
        if (fileInput) fileInput.value = "";
        fileInput?.click();
    }

    function onImageLoad() {
        if (cropper) {
            try { cropper.destroy(); } catch {}
            cropper = null;
        }
        cropper = new Cropper(imgElement, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
            responsive: true,
            center: true,
            background: false,
            dragMode: "move",
            movable: true,
            zoomable: true,
            zoomOnWheel: true,
            wheelZoomRatio: 0.2,
            cropBoxMovable: false,
            cropBoxResizable: false,
            toggleDragModeOnDblclick: false,
            checkOrientation: true,
            highlight: false,
            guides: false,
            ready() {
                const key = currentSourceKey();
                restoreCropStateFor(key);
            },
            zoom(event) {
                const imageData = cropper.getImageData();
                const cropBoxData = cropper.getCropBoxData();

                const minZoom = Math.min(
                    cropBoxData.width / imageData.naturalWidth,
                    cropBoxData.height / imageData.naturalHeight
                );

                const maxZoom = 4;

                if (event.detail.ratio < minZoom) {
                    event.preventDefault();
                    cropper.zoomTo(minZoom);
                } else if (event.detail.ratio > maxZoom) {
                    event.preventDefault();
                    cropper.zoomTo(maxZoom);
                }
            }
        });
    }


    // --- Lifecycle ---
    onMount(() => {
        if (initialOriginalUrl) {
            originalUrl = initialOriginalUrl;
        }
        if (initialEditedUrl) {
            editedUrl = initialEditedUrl;
        }
        if (initialOriginalUrl && initialCropState) {
            lastStates.set(initialOriginalUrl, initialCropState);
        }
    });

    
    // --- Cleanup ---
    onDestroy(() => {
        revokeUrl(originalUrl);
        revokeUrl(workingUrl);
        revokeUrl(editedUrl);
        if (cropper) {
            try { cropper.destroy(); } catch {}
            cropper = null;
        }
    });
</script>


<Overlay
    bind:this={overlay}
    open={internalMode === "fullscreen"}
    hash={overlayHash}
    openClass="overlay"
    closedClass="u-hidden"
    renderOpenOnly={false}
    ariaLabel="Upload image"
    on:requestClose={() => exitToPreview(false)}
>
    {#if internalMode === "fullscreen"}
        <button
            type="button"
            class="overlay__scrim"
            aria-hidden="true"
            tabindex="-1"
            on:click={() => exitToPreview(false)}
        ></button>

        <div class="overlay__panel">
            <header class="overlay__header">
                <div class="bar__title">
                    <h3>{title}</h3>
                    <p class="text-hint">{hint}</p>
                </div>
            </header>

            <main class="overlay__body overlay__body--no-scroll imagepicker__body">
                {#if (workingUrl || originalUrl)}
                    <div class="imagepicker__stage">
                        <div class="imagepicker__image-wrapper">
                            <img
                                bind:this={imgElement}
                                src={workingUrl || originalUrl}
                                alt="Upload preview"
                                class="imagepicker__full-img"
                                on:load={onImageLoad}
                            />
                        </div>
                    </div>
                {:else}
                    <div class="imagepicker__stage">
                        <div
                            class="imagepicker__no-image"
                            role="button"
                            tabindex="0"
                            on:click={replaceImage}
                            on:keydown={(e) => e.key === "Enter" && replaceImage()}
                        >
                            <Icon icon={UI_ICONS.imageAdd} class="icon--large text-accent" />
                            <h3>No photo selected.</h3>
                            <p class="text-fw-semibold text-hint">Click to choose a photo.</p>
                        </div>
                    </div>
                {/if}
            </main>

            <div class="overlay__actionbar">
                <div class="overlay__actions">
                    <div class="overlay__actions-left">
                        <button
                            type="button"
                            class="btn btn--ghost btn--icon"
                            on:click={() => exitToPreview(false)}
                        >
                            <Icon icon={UI_ICONS.close} class="btn__icon" />
                        </button>
                    </div>
                    <div class="overlay__actions-right">
                        <button
                            type="button"
                            class="btn btn--ghost"
                            on:click={replaceImage}
                        >
                            <span class="btn__label">
                                {#if (workingUrl || originalUrl)}
                                    Replace
                                {:else}
                                    Select
                                {/if}
                            </span>
                        </button>

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
        </div>
    {/if}
</Overlay>


{#if internalMode !== "fullscreen"}
    {#if editedUrl}
        <button
            type="button"
            class="imagepicker__preview ui-pressable"
            on:click={enterFullscreen}
            aria-label="Open image picker"
        >
            <img src={editedUrl} alt="Upload preview" class="imagepicker__preview-img" />
        </button>
    {/if}
{/if}


<!-- Always rendered file input -->
<input
    type="file"
    accept="image/*"
    bind:this={fileInput}
    on:change={handleFileSelect}
    class="u-hidden"
/>


<style>
    .imagepicker__preview {
        width: 100%;
        aspect-ratio: 1 / 1;
        padding: 0;
        margin: 0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: var(--radius-lg);
        border: var(--border-width) solid var(--border-color);
        background: var(--bg-surface);

        outline: 0 solid transparent;
        outline-offset: 0;
        transition: outline-offset 0.15s ease;
    }

    .imagepicker__preview:hover {
        border-color: transparent;
        outline: 2px solid var(--accent);
        outline-offset: 4px;
    }

    .imagepicker__preview-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        pointer-events: none;
    }

    .imagepicker__body {
        overflow: hidden;
        padding: var(--space-3);
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .imagepicker__stage {
        flex: 1 1 auto;
        min-height: 0;

        display: flex;
        align-items: center;
        justify-content: center;
    }

    .imagepicker__image-wrapper {
        width: min(100%, 75rem);
        aspect-ratio: 1 / 1;

        max-height: 100%;
        max-width: 100%;

        background: var(--bg-app);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--radius-lg);
        overflow: hidden;

        display: flex;
        align-items: center;
        justify-content: center;
    }

    .imagepicker__full-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
    }

    .imagepicker__no-image {
        width: min(100%, 75rem);
        height: 100%;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        color: var(--text-muted);
        cursor: pointer;
        border-radius: var(--radius-lg);
        border: var(--border-width) dashed var(--border-color);
        background: var(--bg-surface);
        text-align: center;
        padding: var(--space-4);
    }

    :global(.cropper-view-box) {
        outline: 1px solid color-mix(in oklab, var(--accent) 85%, transparent);
    }

    :global(.cropper-dashed) {
        display: none;
    }

    :global(.cropper-point) {
        width: 0.75rem;
        height: 0.75rem;
        background-color: var(--accent);
        border-radius: 50%;
    }
</style>
