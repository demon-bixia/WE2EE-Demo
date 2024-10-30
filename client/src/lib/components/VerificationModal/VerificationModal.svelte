<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { IStoreData } from '../../../types';

	import Modal from '$lib/components/Modal/Modal.svelte';
	import Textarea from '$lib/components/Textarea/Textarea.svelte';
	import {
		XMark,
		XCircle,
		Icon,
		ArrowsPointingIn,
		ArrowsPointingOut,
		CheckCircle
	} from 'svelte-hero-icons';

	import { getContext } from 'svelte';

	import './VerificationModal.css';

	export let openVerificationModal: boolean;
	export let handleCloseVerificationModal: () => void;
	export let username: string = '';

	const globalState = getContext<Writable<IStoreData>>('globalState');

	let activeSection: 'verification' | 'codes' = 'verification';
	// (event) changes the active modal section
	function handleChangeSection(section: 'verification' | 'codes') {
		activeSection = section;
	}

	let verificationCodes: { username: string; codes: string[] } | undefined =
		$globalState.verificationCodes
			? $globalState.verificationCodes.find((codes) => codes.username === username)
			: undefined;
	let expandedCodes: { [key: number]: boolean } = {};
	// (event) expands and shrinks verification codes
	function handleToggleCode(index: number) {
		expandedCodes[index] = typeof expandedCodes[index] === 'boolean' ? !expandedCodes[index] : true;
	}

	let textareaValue: string = '';
	let verified = 'empty';
	// (event) verifies the identity of the entered verification code
	function handleIdentityVerification() {
		if (verificationCodes && textareaValue) {
			const found = verificationCodes.codes.find((code) => code === textareaValue);
			found ? (verified = 'Verified') : (verified = 'Unknown');
		} else {
			verified = 'Empty';
		}
	}

	// When the $globalState.verification codes value changes update the codes.
	globalState.subscribe(async (value: IStoreData) => {
		if (value.user && $globalState.verificationCodes) {
			verificationCodes = $globalState.verificationCodes.find(
				(codes) => codes.username === username
			);
		}
	});
</script>

<Modal open={openVerificationModal}>
	<header class="header">
		{#if activeSection === 'verification'}
			<!--verification header-->
			<div>
				<h6 class="title heading-2">Confirm Identity of user</h6>
				<p class="body-1 description">
					Ask the other side to for their verification code and paste it below.
				</p>
			</div>
		{:else if activeSection === 'codes'}
			<!--code list header-->
			<div>
				<h6 class="heading-2 title">List of sessions</h6>
				<p class="body-1 description">Manually compare the verification code of these sessions.</p>
			</div>
		{/if}
		<button class="close-button" on:click={handleCloseVerificationModal}>
			<Icon style="color:rgba(0, 0, 0, 0.6);" src={XMark} solid size="16" />
		</button>
	</header>

	<div class="body">
		{#if activeSection === 'verification'}
			<!--verification section-->
			<div>
				<div class="title">
					<p class="body-1">Verification code:</p>
					{#if verified === 'Verified'}
						<p class="badge badge-green body-1">
							verified <Icon style="color:#00be06;" src={CheckCircle} solid size="16" />
						</p>
					{:else if verified === 'Unknown'}
						<p class="badge badge-red body-1">
							unknown <Icon style="color:#ff7171;" src={XCircle} solid size="16" />
						</p>
					{/if}
				</div>
				<Textarea
					bind:textareaValue
					handleKeyup={handleIdentityVerification}
					placeholderText={'e.g. 09123812093812'}
				/>
			</div>
		{:else if activeSection === 'codes'}
			<!--code list section-->
			<div>
				<div class="title">
					<p class="body-1">Verification codes:</p>
				</div>
				<ul class="code-list">
					{#if $globalState.verificationCodes}
						{#if verificationCodes}
							{#each verificationCodes.codes as code, index}
								<li class="code">
									{#if expandedCodes[index]}
										<p class="body-1">{code}</p>
									{:else}
										<p class="body-1">{code.slice(-10)}</p>
									{/if}
									<div>
										<button class="expand-button" on:click={() => handleToggleCode(index)}>
											{#if expandedCodes[index]}
												<Icon
													style="color:rgba(0, 0, 0, 0.6);"
													src={ArrowsPointingIn}
													solid
													size="18"
												/>
											{:else}
												<Icon
													style="color:rgba(0, 0, 0, 0.6);"
													src={ArrowsPointingOut}
													solid
													size="18"
												/>
											{/if}
										</button>
									</div>
								</li>
							{/each}
						{/if}
					{/if}
				</ul>
			</div>
		{/if}
	</div>

	{#if activeSection === 'verification'}
		<button class="navigation-button" on:click={() => handleChangeSection('codes')}>
			All Codes
		</button>
	{:else if activeSection === 'codes'}
		<button class="navigation-button" on:click={() => handleChangeSection('verification')}>
			Back
		</button>
	{/if}
</Modal>
