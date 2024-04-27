<script lang="ts">
	import type { IStoreData, IMessage } from '../types';
	import type { Socket } from 'socket.io-client';
	import type { writable } from 'svelte/store';

	import { writable } from 'svelte/store';
	import { setContext, getContext } from 'svelte';
	import { io } from 'socket.io-client';


	const globalState = getContext<Writable<IStoreData>>('globalState');

	const socket = writable<Socket<any>>(undefined);
	setContext('socket', socket);

	/**
	*
	*  a function thar connects to the socket server and adds event handlers.
	*/
	async function connect() {	
		// if the user is loggedin connect to socket server.
		if ($globalState.user && $globalState.user.authToken) {
			$socket = io('http://localhost:3000', {
				extraHeaders: {authorization: `bearer ${$globalState.user.authToken}`}
			})
			// ** Add event handlers ** //
			// (event) handles new connection
			$socket.on('connect', () => {
				console.log('connected to socket server');
			});
			// (event) handles receiving a new message
			$socket.on('message', (message: IMessage) => {
				$globalState.messages = [...$globalState.messages, message];
			});
			// (event) handles receiving a list of messages that were queued in the server
			$socket.on('queued-messages', (messages: IMessage[]) => {
				$globalState.messages = [...$globalState.messages, ...messages];
			});
		}
	}
	setContext('connect', connect);

	/**
	* 
	* a function that disconnects from the socket server and removes all event handlers.
	*/
	function disconnect() {
		if ($socket) {
			$socket.disconnect();
			$socket.off('connect');
			$socket.off('message');
			$socket = undefined;
		}
		console.log('disconnected from socket server');
	}
	setContext('disconnect', disconnect);

	// when the $globalState.user value changes
	// attempt to reconnect;
	globalState.subscribe(async (value: IStoreData) => {
		if(value.user && !$socket) {
			await connect();
		}
	});
</script>

<slot></slot>

