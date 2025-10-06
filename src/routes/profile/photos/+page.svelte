
<script>
	import { onMount } from "svelte";
	import { get } from "svelte/store";
	import { goto } from "$app/navigation";
	import { profile } from "$lib/stores/profile";
	import ImagePicker from "$lib/components/ImagePicker.svelte";
	import { uploadProfileImage, setProfileAvatar, deleteProfileImage, setImageAccessLevel } from "$lib/api/image";
	import { writable, derived } from "svelte/store";


    // State
    const photosState = writable("idle");
    // "idle" 
    // "settingAvatar" | "deleting" | "uploading" | "settingAccess"
    // "avatarSet" | "deleted" | "uploaded" | "accessSet"
    // "errorSettingAvatar" | "errorDeleting" | "errorUploading" | "errorSettingAccess"
    const updatingAccess = writable(new Set()); 

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
                        access_level: img.id === imageId ? 0 : img.access_level
                    }))
                )
            }));
            photosState.set("avatarSet");
        } catch (err) {
            photosState.set("errorSettingAvatar");
            console.error("Error setting avatar:", err);
        }
    }


    // Handle deleting an image
	async function handleDelete(imageId) {
		if (!confirm("Delete this image?")) return;
		try {
            photosState.set("deleting");
			await deleteProfileImage(imageId);
            profile.update(p => ({
                ...p,
                images: sortImages(
                    (p.images || []).filter(img => img.id !== imageId)
                )
            }));
            photosState.set("deleted");
		} catch (err) {
			console.error("Error deleting image:", err);
            photosState.set("errorDeleting");
		}
	}


    // Handle confirming upload of new image
    async function handleUpload() {
        const file = get(newImageFile);
        const setAsAvatar = document.getElementById("newImageAsAvatar")?.checked;
        const accessLevel = parseInt(document.getElementById("newImageAccessLevel")?.value ?? "0");

        if (!file) return;
        try {
            photosState.set("uploading");
            const uploaded = await uploadProfileImage(file, accessLevel);

            profile.update(p => {
                if (!p) return p;
                const updatedImages = sortImages([uploaded, ...(p.images || [])]);
                return { ...p, images: updatedImages };
            });

            // Optionally set as avatar
            if (setAsAvatar) {
                photosState.set("settingAvatar");
                await handleSetAvatar(uploaded.id);
            } else {
                photosState.set("uploaded");
            }

        } catch (err) {
            console.error("Upload failed:", err);
            photosState.set("errorUploading");
        } finally {
            resetPicker();
        }
    }


    // Handle access level change
    async function handleAccessLevelChange(imageId, newLevel) {
        updatingAccess.update(s => new Set(s).add(imageId));
        try {
            photosState.set("settingAccess");
            await setImageAccessLevel(imageId, newLevel);
            profile.update(p => ({
                ...p,
                images: p.images.map(i =>
                    i.id === imageId ? { ...i, access_level: newLevel } : i
                )
            }));
            photosState.set("accessSet");
        } catch (err) {
            console.error("Error updating access level:", err);
            photosState.set("errorSettingAccess");
        } finally {
            updatingAccess.update(s => {
                const newSet = new Set(s);
                newSet.delete(imageId);
                return newSet;
            });
        }
    }


    // Watch "Set as Avatar" checkbox and sync dropdown dynamically
    function handleAvatarToggle() {
        const checkbox = document.getElementById("newImageAsAvatar");
        const select = document.getElementById("newImageAccessLevel");
        if (checkbox?.checked) {
            select.value = "0";
            select.disabled = true;
        } else {
            select.disabled = false;
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


<div class="container bordered">
	<h3>Edit Photos</h3>
	<nav>
		<button type="button" on:click={() => goto("/profile")}>Back to Profile</button>
	</nav>
</div>


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
                    on:change={handleAvatarToggle}
                />
                <label for="newImageAsAvatar">Set as Avatar</label>
            </div>
            <div class="access-select">
                <select
                    id="newImageAccessLevel"
                    disabled={document.getElementById("newImageAsAvatar")?.checked}
                >
                    <option value={0} selected>Public</option>
                    <option value={1}>Loops</option>
                    <option value={2}>Only You</option>
                </select>
            </div>
            <button type="button" on:click={handleUpload} disabled={$photosState === "uploading"}>
                { $photosState === "uploading" ? "Uploading..." : "Upload Photo" }
            </button>
            <button type="button" on:click={resetPicker}>Cancel</button>
		{:else}
            <button type="button" on:click={() => imagePicker.open()}>Upload New Photo</button>
		{/if}
    </nav>

    <!-- Status -->
    {#if $photosState === "uploading"}
        <p class="blue">Uploading photo...</p>
    {:else if $photosState === "settingAvatar"}
        <p class="blue">Setting avatar...</p>
    {:else if $photosState === "deleting"}
        <p class="blue">Deleting photo...</p>

    {:else if $photosState === "uploaded"}
        <p class="green">Photo uploaded!</p>
    {:else if $photosState === "avatarSet"}
        <p class="green">Avatar updated!</p>
    {:else if $photosState === "deleted"}
        <p class="green">Photo deleted!</p>

    {:else if $photosState === "errorUploading"}
        <p class="red">Error uploading photo.</p>
    {:else if $photosState === "errorSettingAvatar"}
        <p class="red">Error setting avatar.</p>
    {:else if $photosState === "errorDeleting"}
        <p class="red">Error deleting photo.</p>
    {/if}
</div>


{#if $profile.images.length > 0}
	{#each $profile.images as img (img.id)}
    <div class="container bordered">
        <img src={img.urls.medium} class="photo" alt="" />
        <nav>
            {#if !img.is_avatar}
                <button on:click={() => handleSetAvatar(img.id)}>Set as Avatar</button>
            {:else}
                <button class="green" disabled>Current Avatar</button>
            {/if}

            <!-- Access level edit -->
            <div class="access-select">
            <select
                id="accessLevel{img.id}"
                bind:value={img.access_level}
                disabled={img.is_avatar || $updatingAccess.has(img.id)}
                on:change={(e) => handleAccessLevelChange(img.id, +e.target.value)}
            >
                <option value={0}>Public</option>
                <option value={1}>Loops</option>
                <option value={2}>Only You</option>
            </select>

                {#if $updatingAccess.has(img.id)}
                    <span class="spinner"></span>
                {/if}
            </div>

            <button
                on:click={() => handleDelete(img.id)}
                disabled={img.is_avatar}>
                {img.is_avatar ? "Cannot Delete Avatar" : "Delete"}
            </button>
            <p>Uploaded: {formatDate(img.created_at)}</p>
        </nav>
    </div>
	{/each}
{:else}
	<p class="no-photos">No photos uploaded yet.</p>
{/if}


<style>
	.photo {
		width: 100%;
		height: auto;
		border-radius: 8px;
        pointer-events: none;
	}
	.no-photos {
		text-align: center;
		color: #666;
	}

    .access-select {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .spinner {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        border: 2px solid #ccc;
        border-top-color: #333;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        flex-shrink: 0;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
