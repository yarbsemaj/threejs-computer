<script lang="ts">
	import Typewriter from 'svelte-typewriter';
	import type { TypedItem } from './types';
	export let className: string = '';
	export let typedLines: Array<TypedItem>;
</script>

<Typewriter mode="loopRandom" wordInterval={3000} interval={[300, 200, 100, 50]}>
	{#each typedLines as typeLine}
		{#if typeLine.url}
			<a class={`hover:underline decoration-wavy ${className}`} href={typeLine.url}>{typeLine.text}</a>
		{:else}
			<div class={className}>{typeLine.text}</div>
		{/if}
	{/each}
</Typewriter>

<style lang="css">
	:root {
		--cursor-width: 2px;
		--cursor-color: #00aa00;
	}
</style>
