<script>
	import favicon from '$lib/assets/favicon.svg';
	import { ENVIRONMENT } from '$lib/index.js';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>loopii | {ENVIRONMENT} mode</title>
</svelte:head>


<h1>LOOPII</h1>
<p>Navigation Here</p>

{@render children?.()}
