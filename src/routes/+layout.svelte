<script lang="ts">
	import '../app.css';
	import { initProgress } from '$lib/state/progress-store';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		initProgress();
	});
</script>

{@render children()}
