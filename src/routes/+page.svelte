<script>
    import { page } from '$app/state';


    import { fetchMessage } from '$lib/index.js';
    import { ENVIRONMENT } from '$lib/index.js';

    // Function to handle test button click
    let message = '';
    async function handleClick() {
        try {
            message = await fetchMessage();
        } catch {
            message = 'Failed to get message.';
        }
    }
</script>

<h2>INDEX</h2>
<button on:click={handleClick}>Ping Backend</button>
<p>{message}</p>
