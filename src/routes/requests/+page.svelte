
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


<div class="container bordered">
	<h3>Requests</h3>

	{#if $loopRequestsStatus === "loading"}
		<p>Loading...</p>

	{:else if $loopRequestsStatus === "error"}
		<p>Error loading requests</p>
		<button on:click={refreshLoopRequestsStore}>Refresh</button>

	{:else if $loopRequestsStatus === "loaded" && $loopRequests.length === 0}
		<p>You don't have any requests yet.</p>
		<button on:click={refreshLoopRequestsStore}>Refresh</button>

	{:else if $selectedRequest}
		<ProfileCardExpanded
			profile={$selectedRequest.profile}
			onAvatarClick={close}
		/>

		<div class="actions">
			<button on:click={acceptSelected}>Accept</button>
			<button on:click={declineSelected}>Decline</button>
		</div>

	{:else if $loopRequestsStatus === "loaded" && $loopRequests.length > 0}
		<p>Showing {$loopRequests.length} of {$loopRequestsTotal} requests</p>
		<button on:click={refreshLoopRequestsStore}>Refresh</button>
	{/if}
</div>


{#if $loopRequestsStatus === "loaded" && $loopRequests.length > 0 && !$selectedRequest}
	<div class="container">
		<div class="grid grid-2">
			{#each $loopRequests as entry}
				{#if entry?.profile}
					<div style="aspect-ratio: 1 / 1;">
						<ProfileCardPreview
							profile={entry.profile}
							on:expand={() => expandRequest(entry)}
						/>
						<div class="actions-inline">
							<button on:click={() => handleAccept(entry)}>Accept</button>
							<button on:click={() => handleDecline(entry)}>Decline</button>
						</div>
					</div>
				{/if}
			{/each}
		</div>

		{#if !$loopRequestsState.end}
			<button on:click={loadMoreLoopRequests} disabled={$loopRequestsState.loading}>
				{$loopRequestsState.loading ? "Loading…" : "Load More"}
			</button>
		{/if}
	</div>
{/if}


<style>
	.actions {
		margin-top: 1rem;
		display: flex;
		gap: 0.5rem;
	}

	.actions-inline {
		margin-top: 0.5rem;
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}
</style>
