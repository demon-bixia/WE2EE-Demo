<script lang="ts">
	import { goto } from '$app/navigation';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import type { IStoreData } from '../types';
	import './layout.css';

	export let data: IStoreData;

	const globalState = writable<IStoreData>({ loading: true, logEntries: [], messages: [] });
	$: globalState.set(data);

	setContext('globalState', globalState);

	onMount(async () => {
		// if user is not authenticated then redirect to /login
		if (!$globalState.user && window.location.pathname !== '/login') {
			await goto('/login');
		} else if ($globalState.user && window.location.pathname !== '/chat') {
			await goto('/chat');
		}

		// after a second of mounting disable the loading indicator.
		setTimeout(() => {
			globalState.set({ ...$globalState, loading: false });
		}, 1000);
	});
</script>

<svelte:head>
	<title>E2EE Demo</title>
	<meta name="description" content="A demo of instant messaging web application using e2ee. " />
</svelte:head>

<main>
	{#if !$globalState.loading}
		<slot></slot>
	{:else}
		<div class="page-loading-container">
			<LoadingIndicator />
		</div>
	{/if}
</main>

<style>
	.page-loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		width: 100%;
	}
</style>
