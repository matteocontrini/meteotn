<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Town } from '$lib/api';

	interface Props {
		towns: Town[];
	}

	let { towns }: Props = $props();

	let searchQuery = $state('');
	let isSearchFocused = $state(false);
	let searchResults = $derived(
		searchQuery.trim().length >= 2
			? towns
				.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
				.sort((a, b) => a.name.localeCompare(b.name))
			: []
	);

	function selectTown(townSlug: string) {
		searchQuery = '';
		isSearchFocused = false;
		goto(`/${townSlug}`);
	}

	function handleSearchBlur() {
		// Delay to allow click events on results
		setTimeout(() => {
			isSearchFocused = false;
		}, 200);
	}
</script>

<div class="max-w-md mx-auto mt-10 md:mt-12 relative">
	<div class="relative">
		<input
			type="text"
			placeholder="Cerca una località..."
			bind:value={searchQuery}
			onfocus={() => (isSearchFocused = true)}
			onblur={handleSearchBlur}
			class="w-full px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
		/>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
	</div>

	{#if isSearchFocused && searchResults.length > 0}
		<div
			class="absolute z-10 w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto"
		>
			{#each searchResults as result (result.slug)}
				<button
					type="button"
					onclick={() => selectTown(result.slug)}
					class="w-full cursor-pointer text-left px-4 py-3 hover:bg-slate-50 flex justify-between items-center border-b last:border-b-0 border-slate-100"
				>
					<span class="font-medium">{result.name}</span>
					<span class="text-slate-500 text-sm">{result.elevation} m</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if isSearchFocused && searchQuery.trim().length >= 2 && searchResults.length === 0}
		<div
			class="absolute z-10 w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-lg px-4 py-3 text-slate-500 text-center"
		>
			Nessuna località trovata
		</div>
	{/if}
</div>
