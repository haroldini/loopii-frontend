
<script>
    import { onMount } from "svelte";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js";
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
    <title>loopii • Photos</title>
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
                    class="btn btn--ghost btn--icon"
                    on:click={() => goto("/profile")}
                >
                    <Icon icon={UI_ICONS.arrowLeft} class="btn__icon" />
                </button>
            </div>
        </div>
    </header>

    <div class="content stack gutter">
        <section class="stack">
            <div>
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
                <div class="stack">
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

                    <div class="actions actions--end actions--first-left">
                        <button
                            type="button"
                            class="btn btn--ghost"
                            on:click={resetPicker}
                            disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                        >
                            <Icon icon={UI_ICONS.close} class="btn__icon" />
                            <span class="btn__label">Cancel</span>
                        </button>
                        <button
                            type="button"
                            class="btn btn--ghost"
                            on:click={() => imagePicker.replaceImage()}
                            disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            class="btn btn--primary"
                            on:click={handleUpload}
                            class:is-loading={$photosState === "uploading" || $photosState === "settingAvatar"}
                            disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                        >
                            <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                            <Icon icon={UI_ICONS.upload} class="btn__icon" />
                            <span class="btn__label">Upload</span>
                        </button>
                    </div>
                </div>
            {:else}
                <button
                    type="button"
                    class="btn btn--large u-border-dashed"
                    on:click={() => imagePicker.open()}
                    class:is-loading={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                    disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                >
                    {#if $photosState === "uploading" || $photosState === "settingAvatar"}
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                        <span class="btn__label">Saving...</span>
                    {:else}
                        <Icon icon={UI_ICONS.imageAdd} class="btn__icon" />
                        <span class="btn__label">Add photo</span>
                    {/if}
                </button>
            {/if}
        </section>

        {#if !$newImageUrl}
            {#if $profile.images.length > 0}
                <div class="grid grid-2">
                    {#each $profile.images as img (img.id)}
                        <section class="card">
                            <div class="section stack">
                                <img class="photos__photo" src={img.urls.medium} alt="" />

                                <div class="toolbar">
                                    <div class="toolbar__group">
                                        {#if !img.is_avatar}
                                            <button
                                                type="button"
                                                class="btn btn--danger btn--icon"
                                                on:click={() => handleDelete(img.id)}
                                                disabled={$photosState === "deleting" || $photosState === "settingAvatar" || $photosState === "uploading"}
                                                aria-label="Delete photo"
                                            >
                                                <Icon icon={UI_ICONS.delete} class="btn__icon" />
                                            </button>
                                            <button
                                                type="button"
                                                class="btn btn--ghost"
                                                class:is-loading={$photosState === "settingAvatar"}
                                                on:click={() => handleSetAvatar(img.id)}
                                                disabled={$photosState === "settingAvatar" || $photosState === "deleting" || $photosState === "uploading"}
                                                aria-label="Set as profile picture"
                                            >
                                                <Icon icon={UI_ICONS.imagePfpSet} class="btn__icon" />
                                                <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />    
                                            </button>
                                        {:else}
                                            <button
                                                type="button"
                                                class="btn btn--ghost btn--icon"
                                                disabled
                                                aria-label="Current profile picture">

                                                <Icon icon={UI_ICONS.imagePfp} class="btn__icon text-success" />
                                            </button>
                                        {/if}
                                    </div>

                                    <p class="text-hint">{timeAgo(img.created_at)}</p>
                                </div>
                            </div>
                        </section>
                    {/each}
                </div>
            {:else}
                <p class="page__center">No photos uploaded yet.</p>
            {/if}
        {/if}
    </div>
</div>

<style>
    .photos__photo {
        width: 100%;
        aspect-ratio: 1 / 1;
        height: auto;
        object-fit: cover;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
        display: block;
        border-radius: var(--radius-md);
    }
</style>
