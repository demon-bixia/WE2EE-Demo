<script lang="ts">
	import type { IStoreData } from '../types';

	import { goto } from '$app/navigation';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';

	import LoadingIndicator from '$lib/components/LoadingIndicator/LoadingIndicator.svelte';
	import SocketClient from '$lib/components/SocketClient/SocketClient.svelte';

	import './layout.css';

	const globalState = writable<IStoreData>({
		IDBPermissionDenied: false,
		loading: true,
		protocolLog: true,
		logEntries: [],
		messages: []
	});
	setContext('globalState', globalState);

	/**
	 * Adds log entries to the end of the logEntries array.
	 */
	function log(logEntry: { title: string; more?: { [key: string]: string | number } }) {
		const currentTime = new Date();
		const hours = currentTime.getHours().toString().padStart(2, '0');
		const minutes = currentTime.getMinutes().toString().padStart(2, '0');
		const formattedTime = `${hours}:${minutes}`;
		globalState.set({
			...$globalState,
			logEntries: [...$globalState.logEntries, { time: formattedTime, ...logEntry }]
		});
	}
	setContext('log', log);

	onMount(async () => {
		// Set the data collect from the localStorage
		const data = JSON.parse(window.localStorage.getItem(`appData`) || 'null');
		if (data) {
			globalState.set(data);
		}

		// Subscribe to changes in state and update localStorage
		globalState.subscribe((value) => {
			window.localStorage.setItem(`appData`, JSON.stringify(value));
		});

		// If user is not authenticated then redirect to /login
		if (!$globalState.user && window.location.pathname !== '/login') await goto('/login');
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
	<SocketClient>
		{#if !$globalState.loading}
			<slot></slot>
		{:else}
			<div class="page-loading-container">
				<LoadingIndicator />
			</div>
		{/if}
	</SocketClient>
</main>
