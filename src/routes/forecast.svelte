<script lang="ts">
	import type { DayForecast, HourlyForecast, IconMappings } from '$lib/api';

	interface Props {
		icons: IconMappings;
		forecast: DayForecast[];
		hourlyForecast: HourlyForecast[];
	}

	// TODO: icon name for "alt"

	let { icons, forecast, hourlyForecast }: Props = $props();

	function formatDayOfWeek(date: Date): string {
		return new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(date);
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' }).format(date);
	}

	function formatHour(date: Date): string {
		return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(date);
	}

	// Check if a time slot is the current one (within the 3-hour window)
	function isCurrentTimeSlot(time: Date): boolean {
		const now = new Date();
		const threeHoursLater = new Date(time.getTime() + 3 * 60 * 60 * 1000);
		return now >= time && now < threeHoursLater;
	}

	// Rainfall intensity for 3-hour period (mm)
	// Returns number of drops to fill (0-4)
	function getRainfallIntensity(mm: number): number {
		if (mm === 0) return 0;
		if (mm <= 6) return 1;
		if (mm <= 12) return 2;
		if (mm <= 18) return 3;
		return 4;
	}
</script>

<div class="mt-12 grid grid-cols-6 gap-3">
	{#each forecast as day, index (day.date)}
		<div
			class="flex flex-col items-center  p-4 rounded-xl {index === 0 ? 'bg-sky-100 border-2 border-sky-500' : 'bg-slate-50'}">
			<span class="font-medium">
				{#if index === 0}
					oggi
				{:else}
					{formatDayOfWeek(day.date)}
				{/if}
			</span>
			<span class="leading-6">{formatDate(day.date)}</span>
			<img src="https://meteo.report/images/icons/{icons[day.skyCondition].day}"
					 alt="TODO"
					 class="size-16 my-5" />
			<div class="flex gap-2 font-medium">
				<div class="bg-sky-800 rounded-lg text-white text-xl text-center px-2.5 py-1">{day.temperatureMinimum}°</div>
				<div class="bg-red-800 rounded-lg text-white text-xl text-center px-2.5 py-1">{day.temperatureMaximum}°</div>
			</div>
		</div>
	{/each}
</div>

<div class="mt-5 bg-slate-50 rounded-xl grid grid-cols-8">
	{#each hourlyForecast.slice(0, 8) as hour, index (hour.time)}
		{@const isCurrent = isCurrentTimeSlot(hour.time)}
		{@const isNextCurrent = index < 7 && isCurrentTimeSlot(hourlyForecast[index + 1].time)}
		<div
			class="p-4 flex flex-col items-center border-r last:border-0
            {isCurrent ? 'bg-sky-100 border-sky-200' : isNextCurrent ? 'border-sky-200' : 'border-slate-200'}">
			<span class="font-medium">{formatHour(hour.time)}</span>
			<img src="https://meteo.report/images/icons/{icons[hour.skyCondition].day}"
					 alt="TODO"
					 class="size-12 my-3" />
			<span class="text-xl font-medium">{Math.round(hour.temperature)}°</span>

			<span class="mt-5 text-slate-500 text-xs leading-3 text-center uppercase">
				Pioggia
			</span>
			<div class="mt-2 relative">
				<div class="h-4 w-20 bg-sky-600/20 rounded">
				</div>
				<div class="absolute left-0 top-0 h-4 bg-sky-600 rounded" style="width: {hour.rainProbability}%"></div>
				<span class="absolute font-medium text-xs left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-700">
					{hour.rainProbability}%
				</span>
			</div>

			<div class="mt-2 flex">
				{#each Array.from({ length: 4 }) as _, index}
					<svg xmlns="http://www.w3.org/2000/svg"
							 width="16" height="16"
							 viewBox="0 0 20 20"
							 fill={index < getRainfallIntensity(hour.rainFall) ? "#0284c7" : "none"}
							 stroke="#0284c7"
							 stroke-width="2"
							 stroke-linejoin="round">
						<path d="M10 1.5 C7.5 6,4.5 9,4.5 13 a5.5 5.5 0 0 0 11 0 c0-4-3-7-5.5-11.5z" />
					</svg>
				{/each}
			</div>

			<span class="mt-5 text-slate-500 text-xs leading-3 text-center uppercase">
				Neve fresca
			</span>

			<div class="mt-2 flex">
				<span class="font-medium text-sm">{Math.round(hour.freshSnow * 100)} cm</span>
			</div>

			<span class="mt-5 text-slate-500 text-xs leading-3 text-center uppercase">
				Ore di sole
			</span>

			<div class="mt-2 flex">
				{#each Array.from({ length: 3 }) as _, index}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"
							 fill="none" stroke={hour.sunshineDuration > index ? "#E38039" : "#6E6E6E"} stroke-width="2"
							 stroke-linecap="round" stroke-linejoin="round">
						<circle cx="10" cy="10" r="4.5" fill={hour.sunshineDuration > index ? "#FBC700" : "none"} />
						<path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M15.4 4.6 14 6M6 14 4.6 15.4" />
						<circle cx="10" cy="10" r="4.5" />
					</svg>
				{/each}
			</div>

			<span class="mt-5 text-slate-500 text-xs leading-3 text-center uppercase">
				Vento
			</span>

			<div class="mt-2 flex">
				<img src="https://meteo.report/images/arrowup1.png"
						 alt="wind direction"
						 style="transform: rotate({hour.windDirection}deg);"
						 class="size-4 mr-1" />
				<span class="font-medium text-sm">{Math.round(hour.windSpeed)} km/h</span>
			</div>

			<span class="mt-5 text-slate-500 text-xs leading-3 text-center uppercase">
				Raffiche
			</span>

			<div class="mt-2 flex">
				<span class="font-medium text-sm">{Math.round(hour.windGust)} km/h</span>
			</div>

			<span class="mt-5 text-slate-500 text-xs leading-3 text-center uppercase">
				Quota neve
			</span>

			<div class="mt-2 flex">
				<span class="font-medium text-sm">{Math.round(hour.snowLevel)} m</span>
			</div>

			<span class="mt-5 text-slate-500 text-xs leading-3 text-center uppercase">
				Zero termico
			</span>

			<div class="mt-2 flex">
				<span class="font-medium text-sm">{Math.round(hour.freezingLevel)} m</span>
			</div>
		</div>
	{/each}
</div>
