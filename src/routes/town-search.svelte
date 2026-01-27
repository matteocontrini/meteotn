<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Town } from '$lib/api';
	import { getRecentTowns, addRecentTown, type RecentTown } from '$lib/recent-towns';
	import { onMount } from 'svelte';

	interface Props {
		towns: Town[];
	}

	let { towns }: Props = $props();

	let searchQuery = $state('');
	let isSearchFocused = $state(false);
	let recentTowns = $state<RecentTown[]>([]);
	let searchResults = $derived(
		searchQuery.trim().length >= 2
			? towns
				.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
				.sort((a, b) => a.name.localeCompare(b.name))
			: []
	);

	onMount(() => {
		recentTowns = getRecentTowns();
	});

	function selectTown(townSlug: string) {
		const town = towns.find(t => t.slug === townSlug);
		if (town) {
			addRecentTown(town);
			recentTowns = getRecentTowns();
		}
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

<div class="max-w-xs mx-auto mt-10 md:mt-0 relative">
	<div class="relative">
		<input
			type="text"
			placeholder="Cerca una località..."
			bind:value={searchQuery}
			onfocus={() => (isSearchFocused = true)}
			onblur={handleSearchBlur}
			class="w-full px-3 py-2 pr-10 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
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

	{#if recentTowns.length > 0}
		<div class="mt-3 flex flex-wrap justify-center gap-2">
			{#each recentTowns as recent (recent.slug)}
				<button
					type="button"
					onclick={() => selectTown(recent.slug)}
					class="px-2 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
				>
					<span class="font-medium">{recent.name}</span>
					<span class="text-slate-500 text-xs">{recent.elevation} m</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
