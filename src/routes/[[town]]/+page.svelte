<script lang="ts">
	import Forecast from '../forecast.svelte';

	let { data } = $props();
	let icons = $derived(data.icons);
	let days = $derived(data.days);
	let town = $derived(data.town);

	let selectedDayIndex = $state(0);
	let selectedDay = $derived(days[selectedDayIndex]);
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

	<Forecast {icons} {days} bind:selectedDayIndex />

	{#if selectedDay.bulletin}
		<div class="mt-5 bg-slate-50 px-6 py-5 rounded-xl">
			<h2 class="font-medium">
				Bollettino meteorologico (provincia di Trento) - {new Intl.DateTimeFormat('it-IT', {
					day: '2-digit',
					month: 'long',
					year: 'numeric'
				}).format(selectedDay.bulletin.start)}
			</h2>

			<p class="mt-2">
				{selectedDay.bulletin.content}
			</p>

			<p class="mt-2 text-sm text-slate-500">
				Ultimo aggiornamento: {new Intl.DateTimeFormat('it-IT', {
					day: '2-digit',
					month: 'long',
					hour: '2-digit',
					minute: '2-digit'
				}).format(selectedDay.bulletin.lastUpdate)}
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
