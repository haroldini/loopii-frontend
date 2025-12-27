
<script>
	import { onDestroy } from "svelte";
	import { get } from "svelte/store";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js"; 
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
		} catch (err) {
			console.error("Failed to decline request:", err);
			// Revert on error
			loopRequests.set(prevRequests);
			loopRequestsTotal.set(prevTotal);
			adjustNewRequestsCount(1);
			addToast({
				text: "Something went wrong while declining the request.",
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
                <h3 class="text-heading">Requests</h3>
                {#if $loopRequestsStatus === "loaded" && $loopRequests.length > 0 && !$selectedRequest}
                    <p class="text-hint">Showing {$loopRequests.length} of {$loopRequestsTotal}</p>
                {:else if $selectedRequest}
                    <p class="text-hint">Showing {$selectedRequest.profile.username}</p>
                {/if}
            </div>

            <div class="bar__actions">
				{#if !$selectedRequest}
					<button
						type="button"
						class="btn btn--ghost btn--icon"
						class:is-loading={$loopRequestsStatus === "loading" || $loopRequestsState.loading}
						on:click={refreshLoopRequestsStore}
						disabled={$loopRequestsStatus === "loading" || $loopRequestsState.loading}
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
    {#if $selectedRequest}
        <div class="page page--viewport">
            <div class="content stack content--scroll">
                <ProfileCardExpanded
                    profile={$selectedRequest.profile}
                    decision={$selectedRequest.decision}
                    onAvatarClick={close}
                />
            </div>
        </div>

        <div class="bar bar--actionbar">
            <div class="bar__inner">
                <div class="actionbar">
                    <button
                        type="button"
                        class="btn btn--danger btn--mini btn--round"
                        on:click={declineSelected}
                    >
                        <Icon 
				            icon={UI_ICONS.close}
                            class="btn__icon btn__icon--large"
                        />
                    </button>

                    <button
                        type="button"
                        class="btn btn--success btn--mini btn--round"
                        on:click={acceptSelected}
                    >
                        <Icon 
				            icon={UI_ICONS.heart}
                            class="btn__icon btn__icon--large"
                        />
                    </button>
                </div>
            </div>
        </div>
        
    <!-- Requests grid view -->
    {:else}
        <div class="content stack gutter">

            {#if $loopRequestsStatus === "loading"}
                <div class="page__center">
                    <Icon 
                        icon={UI_ICONS.animLoading}
                        class="page__icon"
                    />
                </div>

            {:else if $loopRequestsStatus === "error"}
                <div class="page__center">
                    <Icon icon={UI_ICONS.refreshError} class="icon--medium" />
                    <p class="text-center u-space-above">We couldn't load your requests right now.</p>
                    <p class="text-hint text-center">Please try again in a moment.</p>
                </div>
			
			{:else if $loopRequestsStatus === "loaded" && $loopRequests.length === 0}
				<div class="page__center">
					<Icon icon={UI_ICONS.loopsEmpty} class="icon--medium" />
					<p class="text-center u-space-above">You don't have any loop requests.</p>
					<p class="text-hint text-center">When someone sends you a request, it will appear here.</p>
				</div>
			
            {:else if $loopRequestsStatus === "loaded" && $loopRequests.length > 0}
                <div class="grid grid-3">
                    {#each $loopRequests as entry}
                        {#if entry?.profile}
                            <div class="stack u-aspect-square">
                                <ProfileCardPreview
                                    profile={entry.profile}
                                    decision={entry.decision}
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
                        class="btn btn--block btn--ghost"
                        class:is-loading={$loopRequestsState === "loading" || $loopRequestsState.loading}
                        on:click={loadMoreLoopRequests}
                        disabled={$loopRequestsStatus === "loading" || $loopRequestsState.loading}
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
