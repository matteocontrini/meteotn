<script lang="ts">
	import { onMount } from 'svelte';
	import Forecast from '../forecast.svelte';
	import TownSearch from '../town-search.svelte';
	import { addRecentTown } from '$lib/recent-towns';

	let { data } = $props();
	let icons = $derived(data.icons);
	let days = $derived(data.days);
	let town = $derived(data.town);
	let towns = $derived(data.towns);

	let selectedDayIndex = $state(0);
	let selectedDay = $derived(days[selectedDayIndex]);

	onMount(() => {
		if (town) {
			addRecentTown(town);
		}
	});
</script>

<div class="container">
	<div class="mt-12 px-4 flex items-baseline gap-4 justify-center flex-wrap">
		<h1 class="inline-block text-5xl font-light text-center leading-[1.1]">
			{town.name}
		</h1>

		<span class="text-slate-500 text-lg">
			{town.elevation} m
		</span>
	</div>

	<TownSearch {towns} />

	<Forecast {icons} {days} bind:selectedDayIndex />

	{#if selectedDay.bulletin}
		<div class="mt-5 bg-slate-50 px-6 py-5 rounded-xl">
			<h2 class="font-medium text-lg">
				Bollettino meteorologico - {new Intl.DateTimeFormat('it-IT', {
				day: '2-digit',
				month: 'long',
				year: 'numeric'
			}).format(selectedDay.bulletin.start)}
			</h2>

			<p class="mt-3">
				{selectedDay.bulletin.content}
			</p>

			<p class="mt-3 text-xs text-slate-500">
				Il bollettino è scritto da un meteorologo e vale per l'intera provincia.
			</p>

			<p class="text-xs text-slate-500">
				Ultimo aggiornamento: {new Intl.DateTimeFormat('it-IT', {
				day: '2-digit',
				month: 'long',
				hour: '2-digit',
				minute: '2-digit'
			}).format(selectedDay.bulletin.lastUpdate)}.
			</p>
		</div>
	{/if}

	<div class="flex mt-8 bg-slate-50 px-6 py-5 rounded-xl gap-6 flex-wrap justify-center">
		<iframe src="https://meteo.report/precipitation_widget/?mode=l"
						width="350"
						height="560"
						frameborder="0"
						title="Radar precipitazioni"
		>
		</iframe>

		<iframe src="https://meteo.report/model_widget/?mode=l"
						width="350"
						height="560"
						frameborder="0"
						title="Previsione precipitazioni"
		>
		</iframe>
	</div>

	<div>
		<p class="my-12 text-sm text-slate-500 text-center">
			I dati meteo sono forniti dalla provincia autonoma di Trento nell'ambito del
			<a href="https://www.meteotrentino.it/previsioni/bollettino-euregio/" class="underline">progetto Euregio TINIA</a>.
		</p>
	</div>
</div>
