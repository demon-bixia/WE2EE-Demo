<script lang="ts">
	import type { IStoreData } from '../types';
	import type { Socket } from 'socket.io-client';

	import { goto } from '$app/navigation';
	import { io } from 'socket.io-client';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import './layout.css';

	export let data: IStoreData;

	const globalState = writable<IStoreData>({
		loading: true,
		logEntries: [],
		messages: []
	});
	$: globalState.set(data);

	setContext('globalState', globalState);

	const socket = writable<Socket<any>>(undefined);
	setContext('socket', socket);

	onMount(async () => {
		// if user is not authenticated then redirect to /login
		if (!$globalState.user && window.location.pathname !== '/login') {
			await goto('/login');
		} else if ($globalState.user && window.location.pathname !== '/chat') {
			await goto('/chat');
		}

		// connect to socket server if user is logged-in
		if ($globalState.user !== undefined) {
			$socket = io('http://localhost:3000', {
				extraHeaders: {
					authorization: `bearer ${$globalState.user.authToken}`
				}
			});
		}

		// reconnect if the user is logged in and the connection is not active
		socket.subscribe((value) => {
			if ($globalState.user) {
				if ($socket && !$socket.active) {
					$socket.connect();
				}
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
