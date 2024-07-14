<script lang="ts">
	import type { ILogEntry } from '../../../types';

	import { ChevronDown, ChevronUp, DocumentDuplicate, Icon } from 'svelte-hero-icons';
	import { slide } from 'svelte/transition';

	import './LogEntry.css';

	export let entry: ILogEntry;

	let showMoreDetails = false;
	// (event) toggle the more details section
	function handleToggleMoreDetails() {
		showMoreDetails = !showMoreDetails;
	}

	let copyButtonsIndexes: number[] = [];
	// (event) when a value is copied indicate that it's copied
	function handleCopyValue(buttonIndex: number, copyValue: string | number) {
		if (!copyButtonsIndexes.includes(buttonIndex)) {
			copyButtonsIndexes = [...copyButtonsIndexes, buttonIndex];
		}

		navigator.clipboard.writeText(String(copyValue));

		setTimeout(() => {
			let indexOfCopyIndex = copyButtonsIndexes.indexOf(buttonIndex);
			copyButtonsIndexes = copyButtonsIndexes.splice(indexOfCopyIndex, indexOfCopyIndex);
		}, 1000);
	}
</script>

<div class="entry-container">
	<div class="top">
		<div class="basic-info">
			<p class="date body-1">{entry.time}</p>
			<div class="circle-container">
				<span class="circle"></span>
				<div class="connector"></div>
			</div>
			<p class="title heading-2">{entry.title}</p>
		</div>
		{#if entry.more}
			<button class="details-button" on:click={handleToggleMoreDetails}>
				details
				{#if showMoreDetails}
					<Icon style="color:#597ED4;" src={ChevronUp} solid size="16" />
				{:else}
					<Icon style="color:#597ED4;" src={ChevronDown} solid size="16" />
				{/if}
			</button>
		{/if}
	</div>

	{#if entry.more && showMoreDetails}
		<div class="more-details" transition:slide>
			<div class="empty-space-date"></div>
			<div class="empty-space-circle"></div>
			<div class="detail-container">
				{#each Object.entries(entry.more) as [key, value], index}
					<div class="detail">
						<p class="key body-1">{key}</p>
						<p class="value body-1">{typeof value === 'number' ? value : value.slice(0, 10)}</p>
						<button class="copy-button" on:click={() => handleCopyValue(index, value)}>
							{#if copyButtonsIndexes.includes(index)}
								copied!
							{:else}
								copy
								<Icon style="color:rgba(0, 0, 0, 0.6);" src={DocumentDuplicate} solid size="16" />
							{/if}
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
