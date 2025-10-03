<script>
    import { createEventDispatcher, tick, onDestroy, onMount } from "svelte";
    import Cropper from "cropperjs";
    import "cropperjs/dist/cropper.css";

    const dispatch = createEventDispatcher();

    // --- Props from parent ---
    export let initialOriginalUrl = null;
    export let initialEditedUrl = null;
    export let initialCropState = null;
    export let imageSize = 1080; // max size for cropped image
    export let imageQuality = 0.9; // JPEG quality for cropped image (0 to 1)

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
        internalMode = "fullscreen";
        await tick();
        if (!originalUrl && !workingUrl) {
            fileInput?.click();
        }
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

            const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", imageQuality));
            if (blob) {
                const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
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
    }

    function handleFileSelect(e) {
        const f = e?.target?.files?.[0];
        if (!f) return;
        revokeUrl(workingUrl);
        workingUrl = URL.createObjectURL(f);
    }

    function replaceImage() {
        fileInput?.click();
    }

    function onImageLoad() {
        if (cropper) {
            try { cropper.destroy(); } catch {}
            cropper = null;
        }
        cropper = new Cropper(imgElement, {
            aspectRatio: 1,
            viewMode: 2,
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

                // Calculate the minimum zoom ratio: image must cover crop box
                const minZoom = Math.max(
                    cropBoxData.width / imageData.naturalWidth,
                    cropBoxData.height / imageData.naturalHeight
                );

                // Define a reasonable max zoom (e.g. 4× natural resolution)
                const maxZoom = 4;

                if (event.detail.ratio < minZoom) {
                    event.preventDefault();
                    cropper.zoomTo(minZoom); // snap back to min
                } else if (event.detail.ratio > maxZoom) {
                    event.preventDefault();
                    cropper.zoomTo(maxZoom); // snap back to max
                }
            }
        });
    }

    // --- Init from parent ---
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

{#if internalMode === "fullscreen"}
    <div class="fullscreen-container">
        <header class="header">
            <button type="button" on:click={() => exitToPreview(false)}>Back</button>
            <h2>Select Avatar</h2>
            <div class="header-actions">
                {#if (workingUrl || originalUrl)}
                    <button type="button" on:click={replaceImage}>Replace</button>
                {/if}
                <button type="button" on:click={() => exitToPreview(true)}>Confirm</button>
            </div>
        </header>

        <main class="main">
            {#if (workingUrl || originalUrl)}
                <div class="image-wrapper">
                    <img
                        bind:this={imgElement}
                        src={workingUrl || originalUrl}
                        alt="Avatar preview"
                        class="full-img"
                        on:load={onImageLoad}
                    />
                </div>
            {:else}
                <div class="no-image-placeholder">No image selected</div>
            {/if}
        </main>

        <input
            type="file"
            accept="image/*"
            bind:this={fileInput}
            on:change={handleFileSelect}
            style="display:none"
        />
    </div>
{:else}
    {#if editedUrl}
        <button class="preview-button" on:click={enterFullscreen}>
            <img src={editedUrl} alt="Avatar preview" class="preview-img" />
        </button>
    {/if}
{/if}

<style>
    .preview-button {
        width: 100%;
        aspect-ratio: 1 / 1;
        border: 2px solid #ccc;
        padding: 0;
        margin: 0;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f7f7f7;
    }
    .preview-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .no-image-placeholder {
        color: #666;
    }

    .fullscreen-container {
        position: fixed;
        inset: 0;
        background: white;
        display: flex;
        flex-direction: column;
        z-index: 1000;
    }
    .header {
        display: flex;
        justify-content: space-between;
        padding: 1rem;
        background: #f2f2f2;
        border-bottom: 1px solid #ddd;
    }
    .header-actions {
        display: flex;
        gap: 0.5rem;
    }
    .main {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
    }
    .image-wrapper {
        max-width: 90%;
        max-height: 70vh;
        aspect-ratio: 1/1;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: #fafafa;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }
    .full-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    :global(.cropper-view-box) {
        outline: 2px solid rgba(76, 175, 80, 0.85);
    }
    :global(.cropper-dashed) { display: none; }
    :global(.cropper-point) {
        width: 10px;
        height: 10px;
        background-color: #4caf50;
        border-radius: 50%;
    }
</style>
