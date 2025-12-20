
<script>
	import { onDestroy } from "svelte";
	import { get } from "svelte/store";

	import {
		loopRequests,
		loopRequestsTotal,
		selectedRequest,
		loopRequestsStatus,
		loopRequestsState,
		initLoopRequestsStore,
		loadMoreLoopRequests,
		refreshLoopRequestsStore,
		adjustNewRequestsCount,
	} from "$lib/stores/loopRequests.js";

	import { evaluatePeer } from "$lib/api/feed.js";
	import ProfileCardPreview from "$lib/components/ProfileCardPreview.svelte";
	import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";
	import { addToast } from "$lib/stores/popups.js";


    // Remove selected request on component destroy
	onDestroy(() => {
		selectedRequest.set(null);
	});

    // Open a request’s expanded profile
	function expandRequest(entry) {
		const { decision, profile } = entry;
		selectedRequest.set({ decision, profile });
	}

	function close() {
		selectedRequest.set(null);
	}


    // Handle accepting a loop request
	async function handleAccept(entry) {
		const { profile } = entry;
		const prevRequests = get(loopRequests);
		const prevTotal = get(loopRequestsTotal);

		// Optimistically remove all requests from this profile
		loopRequests.update((arr) => arr.filter((item) => item.profile.id !== profile.id));
		loopRequestsTotal.set(Math.max(0, prevTotal - 1));
		adjustNewRequestsCount();

		if (get(selectedRequest)?.profile.id === profile.id) {
			selectedRequest.set(null);
		}

		try {
			const res = await evaluatePeer(profile.id, true);
			if (!res || (res.looped !== true && !res.decision)) {
				console.error("Unexpected response from evaluatePeer on accept:", res);
			}
		} catch (err) {
			console.error("Failed to accept request:", err);
			// Revert on error
			loopRequests.set(prevRequests);
			loopRequestsTotal.set(prevTotal);
			adjustNewRequestsCount(1);
			addToast({
				text: "Something went wrong while accepting the request.",
				autoHideMs: 5000,
			});
		}
	}

    // Handle declining a loop request
	async function handleDecline(entry) {
		const { profile } = entry;
		const prevRequests = get(loopRequests);
		const prevTotal = get(loopRequestsTotal);

		// Optimistically remove all requests from this profile
		loopRequests.update((arr) => arr.filter((item) => item.profile.id !== profile.id));
		loopRequestsTotal.set(Math.max(0, prevTotal - 1));
		adjustNewRequestsCount();

		if (get(selectedRequest)?.profile.id === profile.id) {
			selectedRequest.set(null);
		}

		try {
			const res = await evaluatePeer(profile.id, false);
			if (!res || res.looped !== false) {
				console.error("Unexpected response from evaluatePeer on decline:", res);
			}
			addToast({
				text: "Loop request declined.",
				autoHideMs: 3000,
			});
		} catch (err) {
			console.error("Failed to decline request:", err);
			// Revert on error
			loopRequests.set(prevRequests);
			loopRequestsTotal.set(prevTotal);
			adjustNewRequestsCount(1);
			addToast({
				text: "Failed to decline request.",
				autoHideMs: 5000,
			});
		}
	}

	function acceptSelected() {
		const current = get(selectedRequest);
		if (!current) return;
		handleAccept(current);
	}

	function declineSelected() {
		const current = get(selectedRequest);
		if (!current) return;
		handleDecline(current);
	}
</script>


<svelte:head>
	<title>loopii • Requests</title>
</svelte:head>


<div class="page">
    <header class="bar bar--header">
        <div class="bar__inner">
            <div class="bar__title">
                <h3>Requests</h3>

                {#if $loopRequestsStatus === "loaded" && $loopRequests.length > 0 && !$selectedRequest}
                    <p class="text-hint">Showing {$loopRequests.length} of {$loopRequestsTotal}</p>
                {:else if $loopRequestsStatus === "loaded" && $loopRequests.length === 0 && !$selectedRequest}
                    <p class="text-hint">You don't have any requests at the moment.</p>
                {:else if $loopRequestsStatus === "loading"}
                    <p class="text-hint">Loading...</p>
                {:else if $loopRequestsStatus === "error"}
                    <p class="text-hint text-danger">We couldn't load your requests.</p>
                {:else if $selectedRequest}
                    <p class="text-hint">Showing {$selectedRequest.profile.username}</p>
                {/if}
            </div>

            <div class="bar__actions">
                {#if $selectedRequest}
                    <button type="button" class="btn btn--ghost" on:click={close}>
                        Back
                    </button>
                {/if}

                <button
                    type="button"
                    class="btn btn--ghost"
                    on:click={refreshLoopRequestsStore}
                    disabled={$loopRequestsStatus === "loading" || $loopRequestsState.loading}
                >
                    {$loopRequestsStatus === "loading" ? "Loading…" : "Refresh"}
                </button>
            </div>
        </div>
    </header>

    <!-- Expanded card view -->
    {#if $selectedRequest}
        <div class="page page--viewport">
            <div class="content stack content--scroll">
                <ProfileCardExpanded
                    profile={$selectedRequest.profile}
                    request={$selectedRequest.decision}
                    onAvatarClick={close}
                />
            </div>
        </div>

        <div class="bar bar--actionbar">
            <div class="bar__inner">
                <div class="actionbar">
                    <button type="button" class="btn btn--danger" on:click={declineSelected}>
                        Decline
                    </button>
                    <button type="button" class="btn btn--success" on:click={acceptSelected}>
                        Accept
                    </button>
                </div>
            </div>
        </div>
        
    <!-- Requests grid view -->
    {:else}
        <div class="content stack gutter">
            {#if $loopRequestsStatus === "loading"}
                <p class="text-hint">Loading...</p>
            {:else if $loopRequestsStatus === "error"}
                <p class="text-hint text-danger">We couldn't load your requests. Please refresh or try again later.</p>
            {:else if $loopRequestsStatus === "loaded" && $loopRequests.length > 0}
                <div class="grid grid-2">
                    {#each $loopRequests as entry}
                        {#if entry?.profile}
                            <div class="stack u-aspect-square">
                                <ProfileCardPreview
                                    profile={entry.profile}
                                    request={entry.decision}
                                    on:expand={() => expandRequest(entry)}
                                    on:accept={() => handleAccept(entry)}
                                    on:decline={() => handleDecline(entry)}
                                />
                            </div>
                        {/if}
                    {/each}
                </div>

                {#if !$loopRequestsState.end}
                    <button
                        type="button"
                        class="btn btn--ghost"
                        on:click={loadMoreLoopRequests}
                        disabled={$loopRequestsState.loading}
                    >
                        {$loopRequestsState.loading ? "Loading…" : "Load More"}
                    </button>
                {/if}
            {/if}
        </div>
    {/if}
</div>
