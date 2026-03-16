<script lang="ts">
	import '../app.css';
	import { initProgress } from '$lib/state/progress-store';
	import { onMount } from 'svelte';
	import { inject } from '@vercel/analytics';

	let { children } = $props();

	onMount(() => {
		initProgress();
		inject();
	});
</script>

{@render children()}
