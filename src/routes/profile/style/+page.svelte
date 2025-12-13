
<script>
    import { goto } from "$app/navigation";
</script>


<svelte:head>
	<title>loopii • Customization</title>
</svelte:head>


<div class="container bordered">
	<h3>Customization</h3>
	<nav>
		<button type="button" on:click={() => goto("/profile")}>Back to Profile</button>
	</nav>
</div>
