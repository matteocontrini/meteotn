<script lang="ts">
	import type { DayData, IconMappings } from '$lib/api';
	import ForecastCharts from './forecast-charts-d3.svelte';

	interface Props {
		icons: IconMappings;
		days: DayData[];
		selectedDayIndex?: number;
	}

	// TODO: icon name for "alt"

	let { icons, days, selectedDayIndex = $bindable(0) }: Props = $props();

	let selectedDay = $derived(days[selectedDayIndex]);
	let scrollContainer: HTMLDivElement;

	function selectDay(index: number) {
		selectedDayIndex = index;
	}

	// Scroll to current time slot when selecting today, or to start for other days
	$effect(() => {
		if (!scrollContainer) return;

		if (selectedDayIndex === 0) {
			// Scroll to current time slot for today
			const currentSlot = scrollContainer.querySelector('[data-current-slot]') as HTMLElement;
			if (currentSlot) {
				// Calculate scroll position relative to container
				const scrollLeft = currentSlot.offsetLeft - scrollContainer.offsetLeft;
				scrollContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
			}
		} else {
			// Scroll to beginning for other days
			scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
		}
	});

	function formatDayOfWeek(date: Date): string {
		return new Intl.DateTimeFormat('it-IT', {
			weekday: 'long',
			timeZone: 'Europe/Rome'
		}).format(date);
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('it-IT', {
			day: 'numeric',
			month: 'long',
			timeZone: 'Europe/Rome'
		}).format(date);
	}

	function isToday(date: Date): boolean {
		const formatter = new Intl.DateTimeFormat('en-CA', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			timeZone: 'Europe/Rome'
		});
		return formatter.format(date) === formatter.format(new Date());
	}

	function formatHour(date: Date): string {
		return new Intl.DateTimeFormat('it-IT', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/Rome'
		}).format(date);
	}

	// Check if a time slot is the current one (within the 3-hour window)
	function isCurrentTimeSlot(time: Date): boolean {
		const now = new Date();
		const threeHoursLater = new Date(time.getTime() + 3 * 60 * 60 * 1000);
		return now >= time && now < threeHoursLater;
	}

	// Check if time is between 18:00 and 06:00 (night time) in Italian timezone
	function isNightTime(date: Date): boolean {
		// Extract hour in Europe/Rome timezone
		const italianHour = new Intl.DateTimeFormat('it-IT', {
			hour: 'numeric',
			hour12: false,
			timeZone: 'Europe/Rome'
		}).format(date);
		const hour = parseInt(italianHour, 10);
		return hour >= 18 || hour < 6;
	}

	// Get the appropriate icon (night or day) based on time
	function getIcon(skyCondition: string, date: Date): string {
		const iconData = icons[skyCondition];
		if (isNightTime(date) && iconData.night) {
			return iconData.night;
		}
		return iconData.day;
	}

	// Rainfall intensity for 3-hour period (mm)
	// Returns number of drops to fill (0-4)
	function getRainfallIntensity(mm: number): number {
		/*
		Based on the following ChatGPT analysis of 2025 data for Trento:

		- Finestre 3h con pioggia (>0): 1127
		- Distribuzione (solo finestre piovose):
		- 10° percentile: 0,2 mm
		- 25°: 0,4 mm
		- 50° (mediana): 1,2 mm
		- 75°: 3,8 mm
		- 90°: 8,0 mm
		- 95°: 11,34 mm
		- 99°: 18,54 mm
		- Massimo su 3 ore: 35,2 mm
		 */

		if (mm === 0) return 0;
		if (mm < 4) return 1;
		if (mm < 8) return 2;
		if (mm < 12) return 3;
		return 4;
	}

	function getSunshineDisplayHours(hours: number): number {
		return Math.round(hours * 2) / 2;
	}
</script>

<ForecastCharts {days} {icons} />

<div
	class="mt-10 grid gap-0 md:mt-12 md:gap-3"
	style:grid-template-columns={`repeat(${days.length}, minmax(0, 1fr))`}
>
	{#each days as day, index (day.date)}
		<button
			type="button"
			onclick={() => selectDay(index)}
			aria-pressed={index === selectedDayIndex}
			class="flex cursor-pointer flex-col items-center rounded-none p-2 first:rounded-l-xl last:rounded-r-xl md:rounded-xl md:p-4
				{index === selectedDayIndex
				? 'border-2 border-sky-500 bg-sky-100'
				: 'border-2 border-transparent border-r-slate-200 bg-slate-50 last:border-r-transparent hover:border-slate-300 hover:bg-slate-100 md:border-r-transparent'}"
		>
			<span class="text-xs font-medium md:hidden md:text-base">
				{#if isToday(day.date)}
					Oggi
				{:else}
					{formatDayOfWeek(day.date).substring(0, 3)}
				{/if}
			</span>
			<span class="hidden font-medium md:block">
				{#if isToday(day.date)}
					oggi
				{:else}
					{formatDayOfWeek(day.date)}
				{/if}
			</span>
			<span class="text-2xl leading-7 font-medium md:hidden">{day.date.getDate()}</span>
			<span class="hidden leading-6 md:block">{formatDate(day.date)}</span>
			<img
				src="https://meteo.report/images/icons/{icons[day.dailyForecast.skyCondition].day}"
				alt="TODO"
				class="my-2 size-12 md:my-5 md:size-16"
			/>
			<div class="flex w-full flex-col gap-1 font-medium md:w-auto md:flex-row md:gap-2">
				<div
					class="rounded bg-sky-800 py-0.5 text-center text-base font-semibold text-white md:rounded-lg md:px-2.5 md:py-1 md:text-xl md:font-medium"
				>
					{day.dailyForecast.temperatureMinimum}°
				</div>
				<div
					class="rounded bg-red-800 py-0.5 text-center text-base font-semibold text-white md:rounded-lg md:px-2.5 md:py-1 md:text-xl md:font-medium"
				>
					{day.dailyForecast.temperatureMaximum}°
				</div>
			</div>
		</button>
	{/each}
</div>

<div
	bind:this={scrollContainer}
	class="mt-5 flex grid-cols-8 overflow-x-auto rounded-xl bg-slate-50 md:grid"
>
	{#each selectedDay.hourlyForecasts as hour, index (hour.time)}
		{@const isCurrent = isCurrentTimeSlot(hour.time)}
		{@const isNextCurrent =
			index < 7 && isCurrentTimeSlot(selectedDay.hourlyForecasts[index + 1].time)}
		{@const sunshineDisplay = getSunshineDisplayHours(hour.sunshineDuration)}
		<div
			data-current-slot={isCurrent || undefined}
			class="flex shrink-0 flex-col items-center border-r p-4 last:border-0
            {isCurrent
				? 'border-sky-200 bg-sky-100'
				: isNextCurrent
					? 'border-sky-200'
					: 'border-slate-200'}"
		>
			<span class="font-medium">{formatHour(hour.time)}</span>
			<img
				src="https://meteo.report/images/icons/{getIcon(hour.skyCondition, hour.time)}"
				alt="TODO"
				class="my-3 size-12"
			/>
			<span class="text-xl font-medium">{Math.round(hour.temperature)}°</span>

			<span class="mt-5 text-center text-xs leading-4 text-slate-500 uppercase"> Pioggia </span>

			<div class="relative mt-2">
				<div class="h-4 w-20 rounded bg-sky-600/20"></div>
				<div
					class="absolute top-0 left-0 h-4 rounded bg-sky-600"
					style="width: {hour.rainProbability}%"
				></div>
				<span
					class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium {hour.rainProbability >=
					40
						? 'text-white drop-shadow'
						: 'text-sky-700'}"
				>
					{hour.rainProbability}%
				</span>
			</div>

			<span class="mt-5 text-center text-xs leading-3 text-slate-500 uppercase"> Intensità </span>

			<span class="mt-1 text-center text-xs leading-4 text-slate-500">
				({new Intl.NumberFormat('it-IT', {
					style: 'unit',
					unit: 'millimeter',
					unitDisplay: 'short'
				}).format(hour.rainFall)})
			</span>

			<div class="mt-2 flex">
				{#each Array.from({ length: 4 }) as _, index}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 20 20"
						fill={index < getRainfallIntensity(hour.rainFall) ? '#0284c7' : 'none'}
						stroke="#0284c7"
						stroke-width="2"
						stroke-linejoin="round"
					>
						<path d="M10 1.5 C7.5 6,4.5 9,4.5 13 a5.5 5.5 0 0 0 11 0 c0-4-3-7-5.5-11.5z" />
					</svg>
				{/each}
			</div>

			<span class="mt-5 text-center text-xs leading-3 text-slate-500 uppercase">
				Soleggiamento
			</span>

			<div class="mt-2 flex">
				{#each Array.from({ length: 3 }) as _, index}
					{@const isFullSun = sunshineDisplay >= index + 1}
					{@const isHalfSun = !isFullSun && sunshineDisplay >= index + 0.5}
					{@const sunHalfId = `sun-half-${hour.time.getTime()}-${index}`}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 20 20"
						fill="none"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						{#if isHalfSun}
							<defs>
								<clipPath id={sunHalfId}>
									<rect x="0" y="0" width="10" height="20" />
								</clipPath>
							</defs>
							<circle cx="10" cy="10" r="4.5" fill="#FBC700" clip-path={`url(#${sunHalfId})`} />
						{:else}
							<circle cx="10" cy="10" r="4.5" fill={isFullSun ? '#FBC700' : 'none'} />
						{/if}
						<path
							stroke={isFullSun ? '#E38039' : '#6E6E6E'}
							d="M10 2v2M10 16v2M2 10h2M16 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M15.4 4.6 14 6M6 14 4.6 15.4"
						/>
						<circle stroke={isFullSun ? '#E38039' : '#6E6E6E'} cx="10" cy="10" r="4.5" />
						{#if isHalfSun}
							<path
								stroke="#E38039"
								clip-path={`url(#${sunHalfId})`}
								d="M10 2v2M10 16v2M2 10h2M16 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M15.4 4.6 14 6M6 14 4.6 15.4"
							/>
							<circle stroke="#E38039" clip-path={`url(#${sunHalfId})`} cx="10" cy="10" r="4.5" />
						{/if}
					</svg>
				{/each}
			</div>

			<span class="mt-5 text-center text-xs leading-3 text-slate-500 uppercase"> Vento </span>

			<div class="mt-2 flex">
				<img
					src="https://meteo.report/images/arrowup1.png"
					alt="wind direction"
					style="transform: rotate({hour.windDirection}deg);"
					class="mr-1 size-4"
				/>
				<span class="text-sm font-medium">{Math.round(hour.windSpeed)} km/h</span>
			</div>

			<span class="mt-5 text-center text-xs leading-3 text-slate-500 uppercase"> Raffiche </span>

			<div class="mt-2 flex">
				<span class="text-sm font-medium">{Math.round(hour.windGust)} km/h</span>
			</div>

			<span class="mt-5 text-center text-xs leading-3 text-slate-500 uppercase"> Quota neve </span>

			<div class="mt-2 flex">
				<span class="text-sm font-medium">{Math.round(hour.snowLevel)} m</span>
			</div>

			<span class="mt-5 text-center text-xs leading-3 text-slate-500 uppercase">
				Zero termico
			</span>

			<div class="mt-2 flex">
				<span class="text-sm font-medium">{Math.round(hour.freezingLevel)} m</span>
			</div>
		</div>
	{/each}
</div>
