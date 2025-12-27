
<script>
    import { onDestroy } from "svelte";
    import { get } from "svelte/store";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js"; 
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
                <h2 class="text-heading">Loops</h2>

                {#if $loopsStatus === "loaded" && $loops.length > 0 && !$selectedLoop}
                    <p class="text-hint">Showing {$loops.length} of {$loopsTotal}</p>
                {:else if $selectedLoop}
                    <p class="text-hint">Showing {$selectedLoop.profile.username}</p>
                {/if}
            </div>
            
            
            <div class="bar__actions">
                {#if !$selectedLoop}
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        class:is-loading={$loopsStatus === "loading" || $loopsState.loading}
                        on:click={refreshLoopsStore}
                        disabled={$loopsStatus === "loading" || $loopsState.loading}
                        aria-label="Refresh"
                    >
                        <Icon icon={UI_ICONS.refresh} class="btn__icon" />
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon btn__spinner" />
                    </button>
                {:else}
                    <button
                        type="button"
                        class="btn btn--ghost btn--icon"
                        on:click={close}
                        aria-label="Close"
                    >
                        <Icon 
                            icon={UI_ICONS.chevronDown}
                            class="btn__icon"
                        />
                    </button>
                {/if}
            </div>
        </div>
    </header>

    <!-- Expanded card view -->
    {#if $selectedLoop}
        <div class="page page--viewport">
            <div class="content stack content--scroll">
                <ProfileCardExpanded
                profile={$selectedLoop.profile}
                loop={$selectedLoop.loop}
                onAvatarClick={close}
                on:toggleFav={handleFav}
                on:unloop={handleUnloop}
                />
            </div>
        </div>
        
    <!-- Loops grid view -->
    {:else}
        <div class="content stack gutter">
            {#if $loopsStatus === "loading"}
                <div class="page__center">
                    <Icon 
                        icon={UI_ICONS.animLoading}
                        class="page__icon"
                    />
                </div>

            {:else if $loopsStatus === "error"}
                <div class="page__center">
                    <Icon icon={UI_ICONS.refreshError} class="icon--medium" />
                    <p class="text-center u-space-above">We couldn't load your loops right now.</p>
                    <p class="text-hint text-center">Please try again in a moment.</p>
                </div>

            {:else if $loopsStatus === "loaded" && $loops.length === 0}
                <div class="page__center">
                    <Icon icon={UI_ICONS.loopsEmpty} class="icon--medium" />
                    <p class="text-center u-space-above">You don't have any loops yet.</p>
                    <p class="text-hint text-center">Loops from profiles you've added will appear here.</p>
                </div>
                
            {:else if $loopsStatus === "loaded" && $loops.length > 0}
                <div class="grid grid-3">
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
                    <button
                        type="button"
                        class="btn btn--block btn--ghost"
                        class:is-loading={$loopsStatus === "loading" || $loopsState.loading}
                        on:click={loadMoreLoops}
                        disabled={$loopsStatus === "loading" || $loopsState.loading}
                        aria-label="Load More"
                    >
                        <Icon icon={UI_ICONS.chevronDown} class="btn__icon--large" />
                        <Icon icon={UI_ICONS.animSpinner} class="btn__icon--large btn__spinner" />
                    </button>
                {/if}
            {/if}
        </div>  
    {/if}
</div>
