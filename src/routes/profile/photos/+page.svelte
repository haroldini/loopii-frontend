
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
                <h3>Edit Photos</h3>
            </div>

            <div class="bar__actions">
                <button
                    type="button"
                    on:click={() => goto("/profile")}
                    disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                >
                    Back
                </button>
            </div>
        </div>
    </header>

    <div class="content stack">
        <div class="container bordered">
            <h3>{ $newImageUrl ? "Confirm New Photo" : "Upload New Photo" }</h3>
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
            <nav>
                {#if $newImageUrl}
                    <div>
                        <input
                            type="checkbox"
                            id="newImageAsAvatar"
                            disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                        />
                        <label for="newImageAsAvatar">Set as Avatar</label>
                    </div>

                    <button
                        type="button"
                        on:click={handleUpload}
                        disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                    >
                        {#if $photosState === "uploading"}
                            Uploading...
                        {:else if $photosState === "settingAvatar"}
                            Setting avatar...
                        {:else}
                            Upload Photo
                        {/if}
                    </button>
                    <button
                        type="button"
                        on:click={resetPicker}
                        disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                    >
                        Cancel
                    </button>
                {:else}
                    <button
                        type="button"
                        on:click={() => imagePicker.open()}
                        disabled={$photosState === "uploading" || $photosState === "settingAvatar" || $photosState === "deleting"}
                    >
                        Upload New Photo
                    </button>
                {/if}
            </nav>
        </div>

        {#if $profile.images.length > 0}
            {#each $profile.images as img (img.id)}
                <div class="container bordered">
                    <img src={img.urls.medium} class="photo" alt="" />
                    <nav>
                        {#if !img.is_avatar}
                            <button
                                on:click={() => handleSetAvatar(img.id)}
                                disabled={$photosState === "settingAvatar" || $photosState === "deleting" || $photosState === "uploading"}
                            >
                                {$photosState === "settingAvatar" ? "Setting avatar..." : "Set as Avatar"}
                            </button>
                        {:else}
                            <button class="green" disabled>Current Avatar</button>
                        {/if}

                        <button
                            on:click={() => handleDelete(img.id)}
                            disabled={img.is_avatar || $photosState === "deleting" || $photosState === "settingAvatar" || $photosState === "uploading"}
                        >
                            {img.is_avatar ? "Cannot Delete Avatar" : ($photosState === "deleting" ? "Deleting..." : "Delete")}
                        </button>
                        <p>{timeAgo(img.created_at)}</p>
                    </nav>
                </div>
            {/each}
        {:else}
            <p class="no-photos">No photos uploaded yet.</p>
        {/if}
    </div>
</div>


<style>
    .photo {
        width: 100%;
        height: auto;
        border-radius: 8px;
        pointer-events: none;
    }

    .no-photos {
        text-align: center;
        color: var(--text-2);
    }
</style>
