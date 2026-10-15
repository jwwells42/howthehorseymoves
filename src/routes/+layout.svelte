<script lang="ts">
	import '../app.css';
	import { initProgress } from '$lib/state/progress-store';
	import { initSound } from '$lib/state/sound';
	import { startSync } from '$lib/sync/client';
	import { onMount } from 'svelte';
	import NavBar from '$lib/components/nav/NavBar.svelte';

	let { children } = $props();

	onMount(() => {
		initProgress();
		initSound();
		// Ask the browser not to clear this site's saved progress when the
		// disk gets full (it may say no; nothing changes if it does)
		navigator.storage?.persist?.().catch(() => {});
		void startSync();
	});
</script>

<NavBar />
{@render children()}
