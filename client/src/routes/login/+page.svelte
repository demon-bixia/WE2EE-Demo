<script lang="ts">
	import { Icon, ArrowLongRight } from 'svelte-hero-icons';
	import Alice from '../../assets/vectors/avatars/alice.svg';
	import Bob from '../../assets/vectors/avatars/bob.svg';
	import XPattern from '../../assets/vectors/doodles/x-pattern.svg';
	import Grid from '../../assets/vectors/doodles/grid.svg';
	import Circle from '../../assets/vectors/doodles/circle.svg';
	import Triangle from '../../assets/vectors/doodles/triangle.svg';
</script>

<div class="page-container">
	<img class="x-pattern" src={XPattern} alt="x pattern" />
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
			<button class="account" aria-label="login as Alice">
				<img class="avatar" src={Alice} alt="alice" />
				<p class="body-2 name">Alice</p>
				<Icon style="color:rgba(0, 0, 0, 0.6);" src={ArrowLongRight} solid size="24" />
			</button>
			<img class="grid-pattern-1" src={Grid} alt="grid-pattern" />
		</div>

		<div class="grid-pattern-wrapper">
			<button class="account" aria-label="login as Bob">
				<img class="avatar" src={Bob} alt="bob" />
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
</div>

<style>
	.page-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
	}

	.x-pattern {
		position: absolute;
		width: 100%;
		height: 100%;
		z-index: -1;
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
		padding-top: 32px;
	}

	.title {
		text-align: center;
		margin-bottom: 12px;
	}

	.description {
		text-align: center;
	}

	.login-container {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.login-container {
		gap: 150px;
	}

	.grid-pattern-wrapper {
		position: relative;
	}

	.account {
		display: flex;
		flex-direction: column;
		align-items: center;
		border-radius: 12px;
		padding: 40px 70px;
		box-shadow: 0 0.3125rem 0.9375rem rgba(0, 0, 0, 0.1);
		transition: box-shadow 200ms ease;
		background: #ffffff;
	}

	.account:hover {
		box-shadow: 0 0.625rem 1.875rem rgba(0, 0, 0, 0.1);
	}

	.account .avatar,
	.account .name {
		margin-bottom: 24px;
	}

	.account .icon {
		color: red;
	}

	.grid-pattern-1 {
		position: absolute;
		z-index: -1;
		bottom: 71%;
		right: 10%;
	}

	.grid-pattern-2 {
		position: absolute;
		z-index: -1;
		top: 71%;
		left: 10%;
	}

	.footer-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 24px 0px;
		width: 100%;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
	}
</style>