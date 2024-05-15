<script>
	import Dragon from '../assets/vectors/dragon.svg';
</script>

<section class="page-container">
	<div class="error-container">
		<img class="error-image" src={Dragon} alt="dragon" />
		<div class="error-details">
			<h1 class="heading-1 title">Something went wrong</h1>
			<p class="body-1 description">
				Try refreshing the page, or going to the home page. If that didn't work consider opening an
				issue on the <a href="https://github.com/demon-bixia/University-Project-Demo/issues"
					>repository</a
				>.
			</p>
		</div>
	</div>

	<footer class="footer-container">
		<p class="body-1">
			<a
				href="https://www.freepik.com/free-vector/dragon-concept-illustration_25026370.htm#fromView=search&page=1&position=38&uuid=a9baa7d3-3522-4d13-b604-80606abd9b69"
				>Dragon image by storyset</a
			> on Freepik
		</p>
	</footer>
</section>

<style>
	.page-container {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
	}

	.error-container {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.error-details {
		max-width: 450px;
	}

	.title {
		margin-bottom: 8px;
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
		.page-container {
			padding: 16px;
		}

		.error-container {
			flex-direction: column;
		}

		.error-image {
			width: 350px;
			margin-bottom: 24px;
		}

		.title {
			text-align: center;
		}

		.description {
			text-align: center;
		}
	}
</style>
