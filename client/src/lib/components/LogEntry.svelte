<script lang="ts">
	import { ChevronDown, ChevronUp, DocumentDuplicate, Icon } from 'svelte-hero-icons';
	import { slide } from 'svelte/transition';

	export let data: {
		date: string;
		title: string;
		more?: { [key: string]: string | number };
	};

	let showMoreDetails = false;
	// (event) toggle the more details section
	function handleToggleMoreDetails() {
		showMoreDetails = !showMoreDetails;
	}

	let copyButtonsIndexes: number[] = [];
	// (event) when a value is copied indicate that it's copied
	function handleCopyValue(copyButtonIndex: number) {
		if (!copyButtonsIndexes.includes(copyButtonIndex)) {
			copyButtonsIndexes = [...copyButtonsIndexes, copyButtonIndex];
		}

		console.log(copyButtonsIndexes);

		setTimeout(() => {
			let indexOfCopyIndex = copyButtonsIndexes.indexOf(copyButtonIndex);
			copyButtonsIndexes = copyButtonsIndexes.splice(indexOfCopyIndex, indexOfCopyIndex);
		}, 1000);
	}
</script>

<div class="entry-container">
	<div class="top">
		<div class="basic-info">
			<p class="date body-1">{data.date}</p>
			<div class="circle-container">
				<span class="circle"></span>
				<div class="connector"></div>
			</div>
			<p class="title heading-2">{data.title}</p>
		</div>
		{#if data.more}
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

	{#if data.more && showMoreDetails}
		<div class="more-details" transition:slide>
			<div class="empty-space-date"></div>
			<div class="empty-space-circle"></div>
			<div class="detail-container">
				{#each Object.entries(data.more) as [key, value], index}
					<div class="detail">
						<p class="key body-1">{key}</p>
						<p class="value body-1">{value}</p>
						<button class="copy-button" on:click={() => handleCopyValue(index)}>
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

<style>
	.entry-container {
		display: flex;
		flex-direction: column;
		position: relative;
	}

	:global(.entry-container:not(:last-child)) {
		padding-bottom: 48px;
	}

	:global(.entry-container:last-child .connector) {
		display: none;
	}

	.top {
		display: flex;
	}

	.basic-info {
		flex: 1;
		display: flex;
		gap: 12px;
	}

	.date {
		flex-basis: 10%;
		line-height: normal;
	}

	.circle-container {
		flex-basis: 5%;
		min-width: 16px;
		max-width: 16px;
		display: flex;
	}

	.circle {
		flex-basis: 5%;
		min-width: 16px;
		max-width: 16px;
		height: 16px;
		border: 1px solid rgba(0, 0, 0, 0.4);
		border-radius: 100%;
		box-sizing: border-box;
	}

	.connector {
		position: absolute;
		height: calc(100% - 16px);
		width: 1px;
		top: 16px;
		left: 61.5px;
		background-color: rgba(0, 0, 0, 0.2);
	}

	.title {
		min-width: 10%;
		flex-basis: 75%;
		line-height: normal;
		min-width: 1px;
		flex: 1;
	}

	.details-button {
		flex-basis: 10%;
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 16px;
		color: var(--blue);
		height: min-content;
		border-radius: 4px;
		line-height: normal;
	}

	.details-button:hover {
		color: var(--dark-blue);
	}

	.details-button:focus {
		color: var(--dark-blue);
		outline: none;
	}

	.more-details {
		display: flex;
		gap: 12px;
	}

	.detail-container {
		flex-basis: 85%;
		display: flex;
		flex-direction: column;
		padding-top: 16px;
		gap: 4px;
	}

	.detail {
		display: flex;
		justify-content: space-between;
	}

	.empty-space-date {
		flex-basis: 10%;
	}

	.empty-space-circle {
		flex-basis: 5%;
		min-width: 16px;
		max-width: 16px;
		width: 16px;
	}

	.detail .key {
		flex-basis: 10%;
	}

	.copy-button {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0 5px;
		gap: 5px;
		font-size: 16px;
		color: rgba(0, 0, 0, 0.6);
		height: min-content;
		border-radius: 4px;
		transition: all 100ms ease;
		width: 70px;
	}

	.copy-button:hover {
		background: var(--light-gray);
	}

	.copy-button:focus {
		outline: none;
		background: var(--light-gray);
	}
</style>
