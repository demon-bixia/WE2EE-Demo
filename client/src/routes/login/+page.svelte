<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { IStoreData, IGetTokenResponseData } from '../../types';

	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';

	import Alice from '../../assets/vectors/avatars/regular/alice.svg';
	import Bob from '../../assets/vectors/avatars/regular/bob.svg';
	import Circle from '../../assets/vectors/doodles/circle.svg';
	import Grid from '../../assets/vectors/doodles/grid.svg';
	import Triangle from '../../assets/vectors/doodles/triangle.svg';

	import { ArrowLongRight, Icon } from 'svelte-hero-icons';

	import './page.css';

	const globalState = getContext<Writable<IStoreData>>('globalState');

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
					// set the data collect from the localStorage
					const data = JSON.parse(
						window.localStorage.getItem(`${result.user.username}Data`) || '{}'
					);
					// set the user on global state and load data from client store
					globalState.set({
						...$globalState,
						...data,
						loading: false,
						user: { ...result.user, authToken: result.token }
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

<section class="login-container">
	<img class="shape circle-left" src={Circle} alt="circle shape" />
	<img class="shape circle-right" src={Circle} alt="circle shape" />
	<img class="shape triangle-left" src={Triangle} alt="triangle shape" />
	<img class="shape triangle-right" src={Triangle} alt="triangle shape" />

	<header class="login-header">
		<h1 class="heading-1 login-title">Select Your Profile</h1>
		<p class="body-1 login-description" style="text-align: center;">
			Select either Alice or Bob to begin testing messaging you can always change the profile later
			by exiting the app. the first session you login the browser session will be set as the main
			session.
		</p>
	</header>

	<div class="login-cards">
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
