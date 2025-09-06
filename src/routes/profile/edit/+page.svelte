
<script>
    import { goto } from "$app/navigation";
</script>


<svelte:head>
    <title>loopii • Edit Profile</title>
</svelte:head>


<h1>Edit Profile</h1>

<button type="button" on:click={() => goto("/profile")}>
    ← Back to profile
</button>