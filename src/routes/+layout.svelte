<script lang="ts">
	import '../app.css';
	import { initProgress } from '$lib/state/progress-store';
	import { initSound } from '$lib/state/sound';
	import { onMount } from 'svelte';
	import NavBar from '$lib/components/nav/NavBar.svelte';

	let { children } = $props();

	onMount(() => {
		initProgress();
		initSound();
	});
</script>

<NavBar />
{@render children()}
