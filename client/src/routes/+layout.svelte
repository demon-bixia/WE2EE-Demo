<script lang="ts">
	import type { IStoreData, ILogEntry } from '../types';

	import { goto } from '$app/navigation';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';

	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import SocketServer from '$lib/components/SocketServer.svelte';

	import './layout.css';

	const globalState = writable<IStoreData>({
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
		// if user is not authenticated then redirect to /login
		if (!$globalState.user && window.location.pathname !== '/login') await goto('/login');
		else if ($globalState.user && window.location.pathname !== '/chat') await goto('/chat');

		// set the data collect from the localStorage
		if ($globalState.user) {
			const data = JSON.parse(
				window.localStorage.getItem(`${$globalState.user.username}Data`) || 'null'
			);
			if (data) {
				globalState.set(data);
			}
		}

		// subscribe to changes in state and update localStorage
		globalState.subscribe((value) => {
			if ($globalState.user) {
				window.localStorage.setItem(`${$globalState.user.username}Data`, JSON.stringify(value));
			}
		});

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
