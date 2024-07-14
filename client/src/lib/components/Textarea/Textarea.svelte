<script lang="ts">
	import './Textarea.css';

	export let textareaValue: string = '';
	export let placeholderText: string = '';
	export let handleDetectFocus: () => void = () => {};
	export let handleDetectBlur: () => void = () => {};
	export let handleKeyup: () => void = () => {};
</script>

<textarea
	bind:value={textareaValue}
	on:focus={handleDetectFocus}
	on:blur={handleDetectBlur}
	on:keyup={handleKeyup}
	class="textarea"
	placeholder={placeholderText}
/>
