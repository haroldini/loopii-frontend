
<script>
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import { writable, derived } from "svelte/store";
    import { goto } from "$app/navigation";

    import { profile } from "$lib/stores/profile.js";
    import { uploadProfileImage, setProfileAvatar, deleteProfileImage } from "$lib/api/image.js";
    import { timeAgo } from "$lib/utils/misc.js";
    import { addToast } from "$lib/stores/popups.js";
    import ImagePicker from "$lib/components/ImagePicker.svelte";


    // State
    const photosState = writable("idle");
    // "idle" 
    // "settingAvatar" | "deleting" | "uploading"
    // "avatarSet" | "deleted" | "uploaded"
    // "errorSettingAvatar" | "errorDeleting" | "errorUploading"

    // Store for uploading new images
    let imagePicker;
    const newImageFile = writable(null);
    const newImageOriginalUrl = writable(null);
    const newImageCropState = writable(null);
    const newImageUrl = derived(newImageFile, ($file, set) => {
        if ($file) {
            const url = URL.createObjectURL($file);
            set(url);
            return () => URL.revokeObjectURL(url);
        } else set(null);
    });


    // Reset the image picker state
    function resetPicker() {
        if (typeof get(newImageFile) === "string" && get(newImageFile).startsWith("blob:")) {
            try { URL.revokeObjectURL(get(newImageFile)); } catch {}
        }
        newImageFile.set(null);
        newImageOriginalUrl.set(null);
        newImageCropState.set(null);
        imagePicker.reset();
    }


    // Handle setting an image as avatar
    async function handleSetAvatar(imageId) {
        try {
            photosState.set("settingAvatar");
            await setProfileAvatar(imageId);
            profile.update(p => ({
                ...p,
                images: sortImages(
                    (p.images || []).map(img => ({
                        ...img,
                        is_avatar: img.id === imageId,
                    }))
                )
            }));
            photosState.set("avatarSet");
            addToast({
                text: "Profile picture updated!",
                autoHideMs: 3000,
            });
        } catch (err) {
            photosState.set("errorSettingAvatar");
            console.error("Error setting avatar:", err);
            addToast({
                text: "Failed to update profile picture.",
                description: "We couldn't update your profile picture. Please try again later.",
                autoHideMs: 5000,
            });
        }
    }


    // Handle deleting an image (optimistic + modal)
    function handleDelete(imageId) {
        addToast({
            variant: "modal",
            text: "Delete this photo?",
            description: "This will permanently remove the photo from your profile.",
            autoHideMs: null,
            actions: [
                {
                    label: "Cancel",
                    variant: "secondary",
                },
                {
                    label: "Delete",
                    variant: "danger",
                    onClick: async () => {
                        const currentProfile = get(profile);
                        if (!currentProfile) return;

                        const prevImages = currentProfile.images || [];
                        const nextImages = prevImages.filter(img => img.id !== imageId);

                        // Optimistic update
                        photosState.set("deleting");
                        profile.update(p => ({
                            ...p,
                            images: sortImages(nextImages),
                        }));

                        try {
                            await deleteProfileImage(imageId);
                            photosState.set("deleted");
                            addToast({
                                text: "Image successfully deleted.",
                                autoHideMs: 3000,
                            });
                        } catch (err) {
                            console.error("Error deleting image:", err);
                            photosState.set("errorDeleting");

                            // Revert optimistic change
                            profile.update(p => ({
                                ...p,
                                images: sortImages(prevImages),
                            }));

                            addToast({
                                text: "Failed to delete image.",
                                description: "We couldn't delete the image. Please try again later.",
                                autoHideMs: 5000,
                            });
                        }
                    },
                },
            ],
        });
    }


    // Handle confirming upload of new image
    async function handleUpload() {
        const file = get(newImageFile);
        const setAsAvatar = document.getElementById("newImageAsAvatar")?.checked;

        if (!file) return;
        try {
            photosState.set("uploading");
            const uploaded = await uploadProfileImage(file);

            profile.update(p => {
                if (!p) return p;
                const updatedImages = sortImages([uploaded, ...(p.images || [])]);
                return { ...p, images: updatedImages };
            });

            if (setAsAvatar) {
                photosState.set("settingAvatar");
                await handleSetAvatar(uploaded.id);
            } else {
                photosState.set("uploaded");
                addToast({
                    text: "Photo uploaded!",
                    autoHideMs: 3000,
                });
            }
        } catch (err) {
            console.error("Upload failed:", err);
            photosState.set("errorUploading");
            addToast({
                text: "Failed to upload photo.",
                description: "We couldn't upload the photo. Please try again later.",
                autoHideMs: 5000,
            });
        } finally {
            resetPicker();
        }
    }


    // Helper to format ISO date strings
    function formatDate(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return isoString;
        }
    }


    // Helper to sort images by avatar first, then most recent
    function sortImages(images) {
        return [...images].sort((a, b) => {
            if (a.is_avatar && !b.is_avatar) return -1;
            if (!a.is_avatar && b.is_avatar) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }

    // On mount, ensure images are sorted
    onMount(() => {
        profile.update(p => {
            if (!p) return p;
            return { ...p, images: sortImages(p.images || []) };
        });
    });

</script>


<svelte:head>
    <title>loopii • Edit Photos</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h3>Manage Photos</h3>
            </div>

            <div class="bar__actions">
                <button
                    type="button"
                    class="btn btn--ghost"
                    on:click={() => goto("/profile")}
                    disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                >
                    Back
                </button>
            </div>
        </div>
    </header>

    <div class="content stack photos">
        <section class="photos__upload stack">
            <div class="photos__picker">
                <ImagePicker
                    bind:this={imagePicker}
                    initialOriginalUrl={$newImageOriginalUrl}
                    initialEditedUrl={$newImageUrl}
                    initialCropState={$newImageCropState}
                    on:confirm={(e) => {
                        photosState.set("idle");
                        newImageFile.set(e.detail.editedFile);
                        newImageOriginalUrl.set(e.detail.originalUrl);
                        newImageCropState.set(e.detail.cropState);
                    }}
                    on:back={() => {
                        photosState.set("idle");
                    }}
                />
            </div>

            {#if $newImageUrl}
                <div class="photos__confirm stack">
                    <label class="switch">
                        <span class="switch__text">Set as profile picture</span>
                        <span class="switch__control">
                            <input
                                class="switch__input"
                                type="checkbox"
                                id="newImageAsAvatar"
                                disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                            />
                            <span class="switch__track"></span>
                            <span class="switch__thumb"></span>
                        </span>
                    </label>

                    <div class="actions actions--end">
                        <button
                            type="button"
                            class="btn btn--primary"
                            on:click={handleUpload}
                            disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                        >
                            {#if $photosState === "uploading"}
                                Uploading…
                            {:else if $photosState === "settingAvatar"}
                                Setting profile picture…
                            {:else}
                                Upload Photo
                            {/if}
                        </button>

                        <button
                            type="button"
                            class="btn btn--ghost"
                            on:click={resetPicker}
                            disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            {:else}
                <div class="photos__add">
                    <button
                        type="button"
                        class="add-photo-btn"
                        on:click={() => imagePicker.open()}
                        disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                    >
                        <span class="add-photo-btn__icon" aria-hidden="true">＋</span>
                        <span class="add-photo-btn__text">Add photo</span>
                    </button>
                </div>
            {/if}
        </section>

        {#if !$newImageUrl}
            {#if $profile.images.length > 0}
                {#each $profile.images as img (img.id)}
                    <section class="card">
                        <div class="section stack">
                            <div class="photo-wrap">
                                <img src={img.urls.medium} class="photo" alt="" />
                            </div>

                            <div class="toolbar">
                                <div class="toolbar__group">
                                    {#if !img.is_avatar}
                                        <button
                                            type="button"
                                            class="btn btn--ghost"
                                            on:click={() => handleSetAvatar(img.id)}
                                            disabled={$photosState === "settingAvatar" || $photosState === "deleting" || $photosState === "uploading"}
                                        >
                                            {$photosState === "settingAvatar" ? "Setting profile picture…" : "Set as profile picture"}
                                        </button>

                                        <button
                                            type="button"
                                            class="btn btn--danger"
                                            on:click={() => handleDelete(img.id)}
                                            disabled={$photosState === "deleting" || $photosState === "settingAvatar" || $photosState === "uploading"}
                                        >
                                            {$photosState === "deleting" ? "Deleting…" : "Delete"}
                                        </button>
                                    {:else}
                                        <span class="pill pill--success photos-pill">Profile picture</span>
                                    {/if}
                                </div>

                                <p class="hint">{timeAgo(img.created_at)}</p>
                            </div>
                        </div>
                    </section>
                {/each}
            {:else}
                <p class="no-photos">No photos uploaded yet.</p>
            {/if}
        {/if}
    </div>
</div>

<style>
    .photos__upload {
        gap: var(--space-3);
    }

    .photos__add {
        display: flex;
        justify-content: flex-end;
    }

    .add-photo-btn {
        width: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);

        padding: 0.9rem 1rem;
        border-radius: var(--radius-lg);
        border: 1px dashed color-mix(in oklab, var(--border-color) 70%, var(--text-muted));
        background: color-mix(in oklab, var(--bg-surface) 92%, var(--border-color));
        color: var(--text-primary);

        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
    }

    .add-photo-btn:hover {
        background: var(--bg-hover);
        border-color: color-mix(in oklab, var(--border-color) 85%, var(--text-muted));
        transform: translateY(-1px);
    }

    .add-photo-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
    }

    .add-photo-btn__icon {
        font-size: 1.25rem;
        line-height: 1;
        font-weight: 800;
    }

    .add-photo-btn__text {
        font-weight: 650;
        letter-spacing: 0.2px;
    }

    .photos__confirm {
        gap: var(--space-3);
    }

    .photo-wrap {
        width: 100%;
        border-radius: var(--radius-lg);
        overflow: hidden;
        background: color-mix(in oklab, var(--bg-surface) 88%, var(--border-color));
    }

    .photo {
        width: 100%;
        aspect-ratio: 1 / 1;
        height: auto;
        object-fit: cover;

        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
        display: block;
    }

    .photos-pill {
        font-weight: 650;
    }

    .no-photos {
        text-align: center;
        color: var(--text-muted);
    }
</style>
