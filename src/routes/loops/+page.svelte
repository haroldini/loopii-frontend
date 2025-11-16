
<script>
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
    } from "$lib/stores/loops.js";

    import { updateLoopState, deleteLoop } from "$lib/api/loop.js";
    import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

    // Open a loop’s expanded profile
    async function expandProfile(loopEntry) {
        const { loop, profile } = loopEntry;
        selectedLoop.set({ loop, profile });

        // Mark as seen if not already
        if (!loop.is_seen) {
            try {
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
        const prev = get(loops);
        loops.update((arr) => arr.filter((item) => item.loop.id !== loopId));
        loopsTotal.update((n) => Math.max(0, n - 1));
        // Close expanded profile if it was the one being viewed
        if (get(selectedLoop)?.id === get(loops).find(l => l.loop.id === loopId)?.profile.id) {
            selectedLoop.set(null);
        }
        try {
            await deleteLoop(loopId);
        } catch (err) {
            console.error("Failed to delete loop:", err);
            // revert on error
            loops.set(prev);
        }
    }

    function close() {
        selectedLoop.set(null);
    }
</script>


<svelte:head>
    <title>loopii • Loops</title>
</svelte:head>


<div class="container bordered">
    <h3>Your Loops</h3>

    {#if $loopsStatus === "loading"}
        <p>Loading...</p>

    {:else if $loopsStatus === "error"}
        <p>Error loading loops</p>
        <button on:click={refreshLoopsStore}>Refresh</button>

    {:else if $loopsStatus === "loaded" && $loops.length === 0}
        <p>You don't have any loops yet.</p>
        <button on:click={refreshLoopsStore}>Refresh</button>

    {:else if $selectedLoop}
        <ProfileCardExpanded
            profile={$selectedLoop.profile}
            loop={$selectedLoop.loop}
            onAvatarClick={close}
            on:toggleFav={handleFav}
            on:unloop={handleUnloop}
        />
    
    {:else if $loopsStatus === "loaded" && $loops.length > 0}
        <p>Showing { $loops.length } of { $loopsTotal } loops</p>
        <button on:click={refreshLoopsStore}>Refresh</button>
    {/if}
</div>

<!-- Loops content -->
{#if $loopsStatus === "loaded" && $loops.length > 0 && !$selectedLoop}
    <div class="container bordered">

        <!-- Profile Cards Grid -->
        <div class="grid grid-2">
            {#each $loops as { loop, profile }}
                <div style="aspect-ratio: 1 / 1;">
                    <ProfileCardPreview
                        profile={profile}
                        loop={loop}
                        on:toggleFav={handleFav}
                        on:unloop={handleUnloop}
                        on:expand={() => expandProfile({ loop, profile })}
                    />
                </div>
            {/each}
        </div>

        <!-- Load More Button -->
        {#if !$loopsState.end}
            <button on:click={loadMoreLoops} disabled={$loopsState.loading}>
                {$loopsState.loading ? "Loading…" : "Load More"}
            </button>
        {/if}
    </div>
{/if}
    
