<script lang="ts">
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import type { Socket } from 'socket.io-client';
	import type { Writable } from 'svelte/store';
	import type { IStoreData, IGetTokenResponseData } from '../../types';

	import Alice from '../../assets/vectors/avatars/regular/alice.svg';
	import Bob from '../../assets/vectors/avatars/regular/bob.svg';
	import Circle from '../../assets/vectors/doodles/circle.svg';
	import Grid from '../../assets/vectors/doodles/grid.svg';
	import Triangle from '../../assets/vectors/doodles/triangle.svg';

	import { ArrowLongRight, Icon } from 'svelte-hero-icons';

	import FAKE_DATA from '../../fake-data';

	const globalState = getContext<Writable<IStoreData>>('globalState');
	const socket = getContext<Writable<Socket<any>>>('socket');

	// (event): handle authenticating as alice or bob.
	async function handleGetToken(username: string) {
		try {
			const response = await fetch('http://localhost:3000/api/auth/get-token', {
				mode: 'cors',
				credentials: 'omit',
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: username })
			});

			// parse result
			const result: IGetTokenResponseData = await response.json();

			// handle response
			if (response.status === 200) {
				if (result.user && result.token) {
					// set the user on global state and load data from client store
					globalState.set({
						...FAKE_DATA,
						loading: false,
						user: { ...result.user, status: 'Offline', authToken: result.token }
					});
				}
				// redirect to chat
				goto('/chat');
			} else {
				console.error(response.status, result.message ? result.message : '');
			}
		} catch (error) {
			if (error instanceof TypeError) console.error('network error encountered ', error);
			else throw error;
		}
	}
</script>

<section class="page-container">
	<img class="shape circle-left" src={Circle} alt="circle shape" />
	<img class="shape circle-right" src={Circle} alt="circle shape" />
	<img class="shape triangle-left" src={Triangle} alt="triangle shape" />
	<img class="shape triangle-right" src={Triangle} alt="triangle shape" />

	<header class="page-header">
		<h1 class="heading-1 title">Select Your Profile</h1>
		<p class="body-1 description">
			Select either Alice or Bob to begin testing messaging you can always change the profile later
			by exiting the app. the first session you login the browser session will be set as the main
			session.
		</p>
	</header>

	<div class="login-container">
		<div class="grid-pattern-wrapper">
			<button
				on:click={async () => await handleGetToken('Alice')}
				class="account"
				aria-label="login as Alice"
			>
				<img class="avatar" src={Alice} alt="Alice" />
				<p class="body-2 name">Alice</p>
				<Icon style="color:rgba(0, 0, 0, 0.6);" src={ArrowLongRight} solid size="24" />
			</button>
			<img class="grid-pattern-1" src={Grid} alt="grid-pattern" />
		</div>

		<div class="grid-pattern-wrapper">
			<button
				on:click={async () => await handleGetToken('Bob')}
				class="account"
				aria-label="login as Bob"
			>
				<img class="avatar" src={Bob} alt="Bob" />
				<p class="body-2 name">Bob</p>
				<Icon style="color:rgba(0, 0, 0, 0.6);" src={ArrowLongRight} solid size="24" />
			</button>
			<img class="grid-pattern-2" src={Grid} alt="grid-pattern" />
		</div>
	</div>

	<footer class="footer-container">
		<p class="body-1">
			Avatars by
			<a
				href="https://www.freepik.com/free-vector/avatar-set-isolated-white-background_7082033.htm#fromView=image_search_similar&page=1&position=6&uuid=50c135fe-aabd-4e51-9697-c2a4c729d6a3"
			>
				www.freepik.com
			</a>
		</p>
	</footer>
</section>

<style>
	.page-container {
		background: url('../../assets/vectors/doodles/x-pattern.svg');
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		height: 100vh;
	}

	.shape {
		position: absolute;
		z-index: -1;
	}

	.shape.circle-left {
		left: 1%;
		top: 55%;
	}

	.shape.circle-right {
		left: 75%;
		top: 15%;
	}

	.shape.triangle-left {
		left: 14.7%;
		top: 10%;
	}

	.shape.triangle-right {
		left: 88%;
		top: 47%;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 60%;
		padding-top: 2rem;
	}

	.title {
		text-align: center;
		margin-bottom: 0.75rem;
	}

	.description {
		text-align: center;
	}

	.login-container {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 9.375rem;
	}

	.grid-pattern-wrapper {
		position: relative;
	}

	.account {
		display: flex;
		flex-direction: column;
		align-items: center;
		border-radius: 0.75rem;
		padding: 2.5rem 4.375rem;
		box-shadow: 0 0.3125rem 0.9375rem rgba(0, 0, 0, 0.1);
		transition: box-shadow 200ms ease;
		background: #ffffff;
	}

	.account:hover {
		box-shadow: 0 0.625rem 1.875rem rgba(0, 0, 0, 0.2);
	}

	.account .avatar,
	.account .name {
		margin-bottom: 1.5rem;
	}

	.grid-pattern-1 {
		position: absolute;
		z-index: -1;
		bottom: 73%;
		right: 10%;
	}

	.grid-pattern-2 {
		position: absolute;
		z-index: -1;
		top: 73%;
		left: 10%;
	}

	.footer-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1.5rem 0rem;
		width: 100%;
		border-top: 0.0625rem solid rgba(0, 0, 0, 0.1);
	}

	/**** Tablet Screens ****/
	@media only screen and (width < 56.25rem) {
		.shape.circle-left {
			left: 0;
			top: 73%;
		}

		.shape.circle-right {
			left: 75%;
			top: 15%;
		}

		.shape.triangle-left {
			left: 10%;
			top: 10%;
		}

		.shape.triangle-right {
			left: 83.5%;
			top: 47%;
		}
	}

	/**** Mobile Screens ****/
	@media only screen and (width < 37.5rem) {
		.page-container {
			padding: 1rem;
			box-sizing: border-box;
		}

		.page-header {
			width: 100%;
		}

		.login-container {
			flex-direction: column;
			gap: 1.5rem;
			width: 100%;
		}

		.login-container .grid-pattern-wrapper {
			width: 100%;
		}

		.account {
			flex-direction: row;
			justify-content: start;
			align-items: center;
			padding: 1.75rem 1.5rem;
			width: 100%;
		}

		.account .avatar,
		.account .name {
			margin-bottom: 0;
		}

		.account .avatar {
			width: 3.125rem;
			margin-right: 1.5rem;
		}

		.account .name {
			margin-right: auto;
		}

		.grid-pattern-1 {
			top: 55%;
			right: 15%;
		}

		.grid-pattern-2 {
			display: none;
		}

		.shape.circle-left {
			left: 0;
			top: 78%;
		}

		.shape.circle-right {
			left: 50%;
			top: 35%;
		}

		.shape.triangle-left {
			left: 0;
			top: 25%;
		}

		.shape.triangle-right {
			left: 60%;
			top: 70%;
		}
	}
</style>
