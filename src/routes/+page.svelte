
<script>
    import { goto } from "$app/navigation";
    import { initPeerStore, peer, peerStatus, handleDecision, refreshPeerStore } from "$lib/stores/feed.js";
    import ProfileCard from "$lib/components/ProfileCard.svelte";
    import ProfileCardExpanded from "$lib/components/ProfileCardExpanded.svelte";

    // Initialize the peer store (fetches batch + sets first peer)
    $: if ($peerStatus === "unloaded") {
        initPeerStore();
    }

    let expanded = false;

    function open() {
        expanded = true;
    }

    function close() {
        expanded = false;
    }
</script>


<svelte:head>
    <title>loopii • Find Loops</title>
</svelte:head>


<div class="page" class:page--has-actionbar={$peerStatus !== "loading" && $peerStatus !== "error" && $peerStatus !== "hidden" && $peerStatus !== "empty"}>
	<header class="bar bar--header">
		<div class="bar__inner">
			<div class="bar__title">
				<h3>loopii</h3>
			</div>
			<div class="bar__actions">
				<button on:click={refreshPeerStore} disabled={$peerStatus === "loading"}>
					{$peerStatus === "loading" ? "Loading" : "Refresh"}
				</button>
				<button on:click={() => goto("/profile/search-preferences")}>Preferences</button>
			</div>
		</div>
	</header>

	<div class="content stack">
		{#if $peerStatus === "loading"}
			<p>Loading next profile...</p>
		{:else if $peerStatus === "error"}
			<p>An error occurred while loading the feed. Please try refreshing.</p>
		{:else if $peerStatus === "hidden"}
			<p>Your profile is hidden. Update your visibility settings to see other profiles.</p>
		{:else if $peerStatus === "empty"}
			<p>We couldn't find any matching profiles. Try refreshing or expanding your search preferences.</p>
		{:else if expanded}
			<ProfileCardExpanded profile={$peer} onAvatarClick={close} />
		{:else}
			<ProfileCard profile={$peer} on:expand={open} />
		{/if}
	</div>

	{#if $peerStatus !== "loading" && $peerStatus !== "error" && $peerStatus !== "hidden" && $peerStatus !== "empty"}
		<div class="bar bar--actionbar">
			<div class="bar__inner">
				<div class="actionbar">
					<button on:click={() => { handleDecision(false); if (expanded) close(); }}>Skip</button>
					<button on:click={() => { handleDecision(true); if (expanded) close(); }}>Like</button>
				</div>
			</div>
		</div>
	{/if}
</div>
