<script lang="ts">
	import { Check, Icon, XMark } from 'svelte-hero-icons';

	import './page.css';
</script>

<section class="sessions-container">
	<header class="sessions-header">
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
