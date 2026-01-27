<script lang="ts">
	import Forecast from '../forecast.svelte';

	let { data } = $props();
	let icons = $derived(data.icons);
	let forecast = $derived(data.forecast);
	let hourlyForecast = $derived(data.hourlyForecast);
	let town = $derived(data.town);
	let todayBulletin = $derived(data.todayBulletin);
</script>

<div class="container">
	<div class="my-12 flex items-baseline gap-4 justify-center">
		<h1 class="inline-block text-5xl font-light">
			{town.name}
		</h1>

		<span class="text-slate-500 text-lg">
			{town.elevation} m
		</span>
	</div>

	<Forecast {icons} {forecast} {hourlyForecast} />

	{#if todayBulletin}
		<div class="mt-5 bg-slate-50 px-6 py-5 rounded-xl">
			<h2 class="font-medium">
				Bollettino meteorologico (provincia di Trento)
			</h2>

			<p class="mt-2">
				{todayBulletin.content}
			</p>

			<p class="mt-2 text-sm text-slate-500">
				Ultimo aggiornamento: {new Intl.DateTimeFormat('it-IT', {
				day: '2-digit',
				month: 'long',
				hour: '2-digit',
				minute: '2-digit'
			}).format(todayBulletin.lastUpdate)}
			</p>
		</div>
	{/if}

	<!--	<div class="flex">-->
	<!--		<iframe-->
	<!--			src="https://meteo.report/precipitation_widget/?mode=l"-->
	<!--			width="350"-->
	<!--			height="560"-->
	<!--			frameborder="0"-->
	<!--		>-->
	<!--		</iframe>-->

	<!--		<iframe-->
	<!--			src="https://meteo.report/model_widget/?mode=l"-->
	<!--			width="350"-->
	<!--			height="560"-->
	<!--			frameborder="0"-->
	<!--		>-->
	<!--		</iframe>-->
	<!--	</div>-->
</div>
