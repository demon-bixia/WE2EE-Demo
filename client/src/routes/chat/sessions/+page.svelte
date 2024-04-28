<script lang="ts">
	import { Check, Icon, XMark } from 'svelte-hero-icons';
</script>

<section class="sessions-container">
	<header class="page-header">
		<h1 class="heading-1 title">Manage Your Sessions</h1>
		<p class="body-1 description">
			Below is a list of browser session related to this account, here you can manage them.
		</p>
	</header>

	<div class="sessions">
		<div class="session">
			<p class="session-id">ID: 02948758290</p>
			<div class="controls">
				<p class="main-session-indicator body-1">Main</p>
				<button class="remove-button"> Remove </button>
			</div>
		</div>
		<div class="session">
			<p class="session-id">ID: 02948758290</p>
			<div class="controls">
				<button class="remove-button"> Remove </button>
			</div>
		</div>
		<div class="session">
			<p class="session-id">ID: 02948758290</p>
			<div class="controls">
				<p class="request-session-indicator body-1">Request</p>
				<button class="icon-button">
					<Icon style="color:rgba(0, 0, 0, 0.6);" src={Check} solid size="16" />
				</button>
				<button class="icon-button">
					<Icon style="color:rgba(0, 0, 0, 0.6);" src={XMark} solid size="16" />
				</button>
			</div>
		</div>
	</div>
	<a href="/chat" class="close-button">Go Back</a>
</section>

<style>
	.sessions-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		border-right: 0.0625rem solid rgba(0, 0, 0, 0.1);
		padding: 4rem 0;
		gap: 2rem;
	}

	.page-header .title,
	.page-header .description {
		text-align: center;
	}

	.sessions {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		overflow-x: hidden;
	}

	.sessions .session {
		padding: 1rem;
		border: 0.0625rem solid rgba(0, 0, 0, 0.1);
		border-radius: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-sizing: border-box;
		height: 4.0625rem;
		width: 100%;
		gap: 9rem;
	}

	.sessions .session .controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.sessions .session .controls .remove-button {
		border: 0.0625rem solid rgba(0, 0, 0, 0.1);
		border-radius: 0.75rem;
		padding: 0.25rem 0.75rem;
		transition: all 200ms ease;
	}

	.sessions .session .controls .remove-button:hover {
		border: 0.0625rem solid var(--light-red);
		color: var(--red);
	}

	.sessions .session .controls .remove-button:focus {
		box-shadow: 0 0 0.0625rem 0.1875rem var(--light-red);
		border: 0.0625rem solid var(--light-red);
		color: var(--red);
		outline: none;
	}

	.sessions .session .controls .icon-button {
		border: 0.0625rem solid rgba(0, 0, 0, 0.1);
		border-radius: 0.5rem;
		padding: 0.25rem;
		transition: all 200ms ease;
	}

	.sessions .session .controls .icon-button:hover {
		border: 0.0625rem solid rgba(89, 126, 212, 0.5);
	}

	.sessions .session .controls .icon-button:focus {
		outline: none;
		box-shadow: 0 0 0.0625rem 0.1875rem rgba(89, 126, 212, 0.2);
	}

	.sessions .session .controls .main-session-indicator {
		color: var(--blue);
	}

	.sessions .session .controls .request-session-indicator {
		color: var(--green);
	}

	.close-button {
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 1rem;
		color: rgba(0, 0, 0, 0.6);
		padding: 1rem;
		width: 12.5rem;
		border-radius: 1rem;
		text-decoration: none;
		border: 0.0625rem solid rgba(0, 0, 0, 0.1);
		transition: all 200ms ease;
	}

	.close-button:hover {
		border: 0.0625rem solid var(--light-red);
		color: var(--red);
	}

	.close-button:focus {
		box-shadow: 0 0 0.0625rem 0.1875rem var(--light-red);
		border: 0.0625rem solid var(--light-red);
		color: var(--red);
		outline: none;
	}

	/**** Tablet Screens ****/
	@media only screen and (width < 56.25rem) {
	}

	/**** Mobile Screens ****/
	@media only screen and (width < 37.5rem) {
		.sessions-container {
			padding: 1.5rem;
		}

		.page-header {
			width: 100%;
		}

		.sessions {
			width: 100%;
		}

		.sessions .session {
			gap: 0;
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
