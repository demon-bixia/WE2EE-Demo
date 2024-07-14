<script lang="ts">
	import type Protocol from '$lib/WE2EE';
	import type { ISocketClient } from '../../../types';

	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	import ConnectionManager from '$lib/components/SocketClient/ConnectionManager.svelte';
	import KeysManager from '$lib/components/SocketClient/KeysManager.svelte';
	import Receiver from '$lib/components/SocketClient/Receiver.svelte';
	import Sender from '$lib/components/SocketClient/Sender.svelte';
	import KeysDeriver from '$lib/components/SocketClient/KeysDeriver.svelte';

	const protocol = writable<Protocol>(undefined);
	setContext('protocol', protocol);

	const socketClient = writable<ISocketClient>({});
	setContext('socketClient', socketClient);
</script>

<Sender />
<Receiver />
<KeysDeriver />
<KeysManager />
<ConnectionManager />
<slot></slot>
