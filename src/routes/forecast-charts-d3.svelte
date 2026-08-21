<script lang="ts">
	import type { DayData, HourlyForecast, IconMappings } from '$lib/api';
	import WeatherChartD3 from './weather-chart-d3.svelte';

	interface Props {
		days: DayData[];
		icons: IconMappings;
	}

	let { days, icons }: Props = $props();
	let weekHours = $derived(days.flatMap((day) => day.hourlyForecasts));
	let boundaries = $derived.by(() =>
		days
			.slice(1)
			.map((day) => day.hourlyForecasts[0]?.time ?? null)
			.filter((date): date is Date => date !== null)
	);
	let maxima = $derived(
		days
			.map((day) =>
				day.hourlyForecasts.reduce<HourlyForecast | null>(
					(highest, hour) => (!highest || hour.temperature > highest.temperature ? hour : highest),
					null
				)
			)
			.filter((hour): hour is HourlyForecast => hour !== null)
	);
	let minima = $derived(
		days
			.map((day) =>
				day.hourlyForecasts.reduce<HourlyForecast | null>(
					(lowest, hour) => (!lowest || hour.temperature < lowest.temperature ? hour : lowest),
					null
				)
			)
			.filter((hour): hour is HourlyForecast => hour !== null)
	);
	const originalPalette = [
		'#b29afb',
		'#4076ed',
		'#31ae60',
		'#93d232',
		'#fbd230',
		'#f97316',
		'#dc2626',
		'#b91c1c',
		'#a21caf'
	];
	function formatDay(date: Date): string {
		return new Intl.DateTimeFormat('it-IT', {
			weekday: 'short',
			day: 'numeric',
			timeZone: 'Europe/Rome'
		}).format(date);
	}

	function formatHour(date: Date): string {
		return new Intl.DateTimeFormat('it-IT', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/Rome'
		}).format(date);
	}

	function isNightTime(date: Date): boolean {
		const hour = Number(
			new Intl.DateTimeFormat('it-IT', {
				hour: 'numeric',
				hour12: false,
				timeZone: 'Europe/Rome'
			}).format(date)
		);
		return hour >= 18 || hour < 6;
	}

	function getIcon(hour: HourlyForecast): string {
		const mapping = icons[hour.skyCondition];
		return isNightTime(hour.time) && mapping.night ? mapping.night : mapping.day;
	}

	function hourTitle(hour: HourlyForecast): string {
		const time = formatHour(hour.time);
		return hour.windSpeed >= 10 || hour.windGust >= 40
			? `${time} · vento ${Math.round(hour.windSpeed)} km/h · raffiche ${Math.round(hour.windGust)} km/h`
			: time;
	}
</script>

{#if weekHours.length > 0}
	<div class="mt-10 md:mt-12">
		<section>
			<div class="rounded-xl border border-slate-200">
				<div class="plot-aligned pt-3">
					<div class="grid" style:grid-template-columns={`repeat(${days.length}, minmax(0, 1fr))`}>
						{#each days as day (day.date)}
							<div class="min-w-0 overflow-hidden">
								<div class="px-1 pb-1.5 text-center text-xs font-medium md:text-sm">
									<span class="block w-full truncate">{formatDay(day.date)}</span>
									<span class="block w-full truncate text-[11px] text-slate-500 sm:text-xs">
										{day.dailyForecast.temperatureMinimum}° / {day.dailyForecast
											.temperatureMaximum}°
									</span>
								</div>
								<div
									class="grid pb-1"
									style:grid-template-columns={`repeat(${day.hourlyForecasts.length}, minmax(0, 1fr))`}
								>
									{#each day.hourlyForecasts as hour (hour.time)}
										<div class="flex min-w-0 flex-col items-center" title={hourTitle(hour)}>
											<img
												src="https://meteo.report/images/icons/{getIcon(hour)}"
												alt="Previsione delle {formatHour(hour.time)}"
												class="aspect-square w-full max-w-7 object-contain"
											/>
											<span class="flex h-3 items-center justify-center">
												{#if hour.windSpeed >= 10 || hour.windGust >= 40}
													<i
														aria-hidden="true"
														class="inline-block leading-none font-bold not-italic {hour.windGust >=
														80
															? 'text-fuchsia-700'
															: hour.windGust >= 60
																? 'text-rose-600'
																: hour.windGust >= 40
																	? 'text-amber-600'
																	: 'text-sky-600'}"
														style:font-size={`${Math.min(12, 8 + hour.windSpeed / 5)}px`}
														style:opacity={Math.min(1, 0.55 + hour.windSpeed / 40)}
														style:transform={`rotate(${hour.windDirection}deg)`}>↑</i
													>
												{/if}
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
				<WeatherChartD3
					hours={weekHours}
					dayBoundaries={boundaries}
					{maxima}
					{minima}
					rainColors={originalPalette}
					label="Temperatura e precipitazioni nei prossimi giorni"
				/>
			</div>
		</section>

		<div class="mt-3 space-y-2 px-1 text-sm text-slate-600">
			<div class="flex flex-wrap items-center gap-x-5 gap-y-2">
				<span class="inline-flex items-center gap-2"
					><i
						class="h-0.5 w-5"
						style="background: linear-gradient(to right, #3b82f6, #ef4444)"
						aria-hidden="true"
					></i>
					Temperatura</span
				>
				<span class="inline-flex items-center gap-2">
					<i class="h-1.5 w-4 border border-blue-200" aria-hidden="true"></i>
					Probabilità di precipitazioni
				</span>
				<span class="inline-flex items-center gap-2">
					<i class="flex overflow-hidden rounded-[1px]" aria-hidden="true">
						{#each originalPalette as color (color)}
							<b class="h-3 w-1.5" style:background-color={color}></b>
						{/each}
					</i>
					Precipitazioni: debole → intensa (mm/3h)
				</span>
			</div>
			<div class="flex flex-wrap items-center gap-x-5 gap-y-2">
				<span class="inline-flex items-center gap-2">
					<i
						class="inline-block rotate-45 text-xs leading-none font-bold text-sky-600 not-italic"
						aria-hidden="true">↑</i
					>
					Vento
				</span>
				<span class="inline-flex items-center gap-1 whitespace-nowrap">
					Raffiche:
					<span
						class="inline-flex items-center gap-1.5 font-medium"
						aria-label="Raffiche: 40, 60 e 80 o più chilometri orari"
					>
						<span class="text-amber-600">40</span>
						<span class="text-rose-600">60</span>
						<span class="text-fuchsia-700">80+</span>
						<span class="font-normal">km/h</span>
					</span>
				</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.plot-aligned {
		padding-right: 5.4167%;
		padding-left: 5.4167%;
	}
</style>
