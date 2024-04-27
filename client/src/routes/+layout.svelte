<script lang="ts">
	import type { IStoreData } from '../types';
	import type { Socket } from 'socket.io-client';

	import { goto } from '$app/navigation';
	import { io } from 'socket.io-client';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';

	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import SocketServer from '$lib/components/SocketServer.svelte';

	import './layout.css';


	export let data: IStoreData;

	const globalState = writable<IStoreData>({
		loading: true,
		logEntries: [],
		messages: []
	});
	setContext('globalState', globalState);
	globalState.set(data);

	onMount(async () => {
		// if user is not authenticated then redirect to /login
		if (!$globalState.user && window.location.pathname !== '/login')  await goto('/login');
		else if ($globalState.user && window.location.pathname !== '/chat') await goto('/chat');
		// stop loading after a second of redirecting
		setTimeout(() => {
			$globalState.loading = false;
		}, 1000);
	});
</script>

<svelte:head>
	<title>E2EE Demo</title>
	<meta name="description" content="A demo of instant messaging web application using e2ee. " />
</svelte:head>

<main>
	<SocketServer>
		{#if !$globalState.loading}
			<slot></slot>
		{:else}
			<div class="page-loading-container">
				<LoadingIndicator />
			</div>
		{/if}
	</SocketServer>
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
