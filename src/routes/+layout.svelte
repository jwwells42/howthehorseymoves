<script lang="ts">
	import '../app.css';
	import { initProgress } from '$lib/state/progress-store';
	import { onMount } from 'svelte';
	import NavBar from '$lib/components/nav/NavBar.svelte';

	let { children } = $props();

	onMount(() => {
		initProgress();
	});
</script>

<NavBar />
{@render children()}
