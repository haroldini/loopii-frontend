
<script>
    import { onDestroy } from "svelte";
    import { get } from "svelte/store";
    import {
        loops,
        loopsTotal,
        selectedLoop,
        loopsStatus,
        loopsState,
        loadInitialLoops,
        loadMoreLoops,
        refreshLoopsStore,
        adjustNewLoopsCount,
        confirmLoopDelete,
        resetLoopDeleteConfirmPreference,
    } from "$lib/stores/loops.js";

    import { updateLoopState } from "$lib/api/loop.js";
    import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

    // Remove selected loop and reset delete-confirm preference on component destroy
    onDestroy(() => {
        selectedLoop.set(null);
        resetLoopDeleteConfirmPreference();
    });

	// Open a loop’s expanded profile
	async function expandProfile(loopEntry) {
		const { loop, profile } = loopEntry;
		selectedLoop.set({ loop, profile });

		// Mark as seen if not already
		if (!loop.is_seen) {
			try {
				// Optimistically update badge count
				adjustNewLoopsCount();

				// Optimistically update local state
				loops.update((arr) =>
					arr.map((item) =>
						item.loop.id === loop.id
							? { ...item, loop: { ...item.loop, is_seen: true } }
							: item
					)
				);

				await updateLoopState(loop.id, { is_seen: true });
			} catch (err) {
				console.error("Failed to mark loop as seen:", err);

				// Revert local loop state on error
				adjustNewLoopsCount(1);
				loops.update((arr) =>
					arr.map((item) =>
						item.loop.id === loop.id
							? { ...item, loop: { ...item.loop, is_seen: false } }
							: item
					)
				);
			}
		}
	}

    async function handleFav({ detail }) {
        const { loopId } = detail;
        // optimistically update store
        loops.update(arr => {
            const newArr = arr.map(item =>
                item.loop.id === loopId
                    ? { ...item, loop: { ...item.loop, is_favourite: !item.loop.is_favourite } }
                    : item
            );
            return newArr;
        });
        // also update selectedLoop if it's the one being viewed
        selectedLoop.update(sel => {
            if (!sel || sel.loop.id !== loopId) return sel;
            return {
                ...sel,
                loop: {
                    ...sel.loop,
                    is_favourite: !sel.loop.is_favourite,
                },
            };
        });

        try {
            const loop = get(loops).find(l => l.loop.id === loopId);
            await updateLoopState(loopId, { is_fav: loop.loop.is_favourite });
        } catch (err) {
            console.error("Failed to update favourite:", err);
            // revert the store update on error
            loops.update(arr =>
                arr.map(item =>
                    item.loop.id === loopId
                        ? { ...item, loop: { ...item.loop, is_favourite: !item.loop.is_favourite } }
                        : item
                )
            );
            // also revert selectedLoop if needed
            selectedLoop.update(sel => {
                if (!sel || sel.loop.id !== loopId) return sel;
                return {
                    ...sel,
                    loop: {
                        ...sel.loop,
                        is_favourite: !sel.loop.is_favourite,
                    },
                };
            });
        }
    }

    async function handleUnloop({ detail }) {
        const { loopId } = detail;

        // Close expanded profile if it's this loop
        const current = get(selectedLoop);
        if (current?.loop?.id === loopId) {
            selectedLoop.set(null);
        }

        // Let the store handle confirmation, deletion, and toasts
        confirmLoopDelete(loopId);
    }

    function close() {
        selectedLoop.set(null);
    }
</script>


<svelte:head>
    <title>loopii • Loops</title>
</svelte:head>


<div class="page">
	<header class="bar bar--header">
		<div class="bar__inner">
			<div class="bar__title">
				<h3>Loops</h3>
				{#if $loopsStatus === "loaded" && $loops.length > 0 && !$selectedLoop}
					<p class="hint">Showing {$loops.length} of {$loopsTotal}</p>
                {:else if $loopsStatus === "loaded" && $loops.length === 0 && !$selectedLoop}
                    <p class="hint">You don't have any loops yet.</p>
                {:else if $loopsStatus === "loading"}
                    <p class="hint">Loading...</p>
                {:else if $loopsStatus === "error"}
                    <p class="hint">Error loading loops</p>
				{/if}
			</div>

			<div class="bar__actions">
				{#if $selectedLoop}
					<button type="button" on:click={close}>Back</button>
				{/if}
				<button type="button" on:click={refreshLoopsStore} disabled={$loopsStatus === "loading" || $loopsState.loading}>
					{$loopsStatus === "loading" ? "Loading" : "Refresh"}
				</button>
			</div>
		</div>
	</header>

	<div class="content stack">
		{#if $selectedLoop}
			<ProfileCardExpanded
				profile={$selectedLoop.profile}
				loop={$selectedLoop.loop}
				onAvatarClick={close}
				on:toggleFav={handleFav}
				on:unloop={handleUnloop}
			/>
		{:else}
			{#if $loopsStatus === "loading"}
				<p>Loading...</p>
			{:else if $loopsStatus === "error"}
				<p>Error loading loops</p>
			{:else if $loopsStatus === "loaded" && $loops.length > 0}
				<div class="grid grid-2">
					{#each $loops as { loop, profile }}
						<ProfileCardPreview
							profile={profile}
							loop={loop}
							on:toggleFav={handleFav}
							on:unloop={handleUnloop}
							on:expand={() => expandProfile({ loop, profile })}
						/>
					{/each}
				</div>

				{#if !$loopsState.end}
					<button on:click={loadMoreLoops} disabled={$loopsState.loading}>
						{$loopsState.loading ? "Loading…" : "Load More"}
					</button>
				{/if}
			{/if}
		{/if}
	</div>
</div>
