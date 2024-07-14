<script lang="ts">
	import Modal from '$lib/components/Modal/Modal.svelte';
	import { CircleStack, Icon } from 'svelte-hero-icons';

	export let openErrorModal: boolean;
</script>

<Modal open={openErrorModal}>
	<div class="allow-indexedDB-dialog">
		<Icon style="color:#407BFF;stroke-width:1;" src={CircleStack} size="52" />
		<div class="dialog-details">
			<h1 class="heading-2">Unable To Access Database</h1>
			<p class="body-1">
				This app needs access to IndexedDB in order to store the cryptographic keys used by the
				protocol. Please refresh and give permission.
			</p>
		</div>
	</div>
</Modal>
