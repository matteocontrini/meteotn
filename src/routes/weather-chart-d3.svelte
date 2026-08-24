<script lang="ts">
	import { TZDate } from '@date-fns/tz';
	import type { HourlyForecast } from '$lib/api';
	import { bisector, extent, max, range } from 'd3-array';
	import { scaleLinear, scaleTime } from 'd3-scale';
	import { curveMonotoneX, line } from 'd3-shape';

	interface Props {
		hours: HourlyForecast[];
		dayBoundaries?: Date[];
		maxima?: HourlyForecast[];
		minima?: HourlyForecast[];
		showSunshine?: boolean;
		rainColors: string[];
		label: string;
	}

	let {
		hours,
		dayBoundaries = [],
		maxima = [],
		minima = [],
		showSunshine = false,
		rainColors,
		label
	}: Props = $props();
	let hovered = $state<HourlyForecast | null>(null);
	let renderedWidth = $state(960);
	let svgElement: SVGSVGElement;
	let touchActive = false;

	const width = 960;
	const height = 292;
	const margin = { top: 18, right: 52, left: 52 };
	const plotBottom = 232;
	const unitY = 282;
	const plotWidth = width - margin.left - margin.right;
	const forecastInterval = 3 * 60 * 60 * 1000;
	// Known MeteoSwiss hourly intensity bands, multiplied by three because each TINIA
	// precipitation value is accumulated over a three-hour window. Bands above orange
	// extend the palette for extreme totals; their thresholds are our extrapolation.
	let rainBands = $derived([
		{ from: 0, to: 3, color: rainColors[0] },
		{ from: 3, to: 6, color: rainColors[1] },
		{ from: 6, to: 12, color: rainColors[2] },
		{ from: 12, to: 18, color: rainColors[3] },
		{ from: 18, to: 30, color: rainColors[4] },
		{ from: 30, to: 45, color: rainColors[5] },
		{ from: 45, to: 75, color: rainColors[6] },
		{ from: 75, to: 120, color: rainColors[7] },
		{ from: 120, to: Number.POSITIVE_INFINITY, color: rainColors[8] }
	]);

	let x = $derived.by(() => {
		const [first, last] = extent(hours, (hour) => hour.time) as [Date, Date];
		return scaleTime()
			.domain([first, new Date(last.getTime() + forecastInterval)])
			.range([margin.left, width - margin.right]);
	});
	let temperature = $derived.by(() => {
		const values = extent(hours, (hour) => hour.temperature) as [number, number];
		const spread = Math.max(1, values[1] - values[0]);
		const padding = Math.max(1, spread * 0.12);
		const minimum = Math.floor((values[0] - padding) / 5) * 5;
		const maximum = Math.ceil((values[1] + padding) / 5) * 5;
		return scaleLinear().domain([minimum, maximum]).range([plotBottom, margin.top]);
	});
	let maximumRain = $derived(
		Math.max(12, Math.ceil((max(hours, (hour) => hour.rainFall) ?? 0) / 2) * 2)
	);
	let precipitation = $derived(
		scaleLinear().domain([0, maximumRain]).range([plotBottom, margin.top])
	);
	let temperatureTicks = $derived.by(() => {
		const [minimum, maximum] = temperature.domain();
		return range(minimum, maximum + 0.1, 5);
	});
	let precipitationTicks = $derived(range(0, maximumRain + 0.1, 2));
	let temperatureLine = $derived(
		line<HourlyForecast>()
			.x((hour) => x(hour.time))
			.y((hour) => temperature(hour.temperature))
			.curve(curveMonotoneX)(hours) ?? ''
	);
	let barWidth = $derived(
		x(new Date(hours[0].time.getTime() + forecastInterval)) - x(hours[0].time)
	);
	let timeTicks = $derived.by(() => {
		const [start, end] = x.domain();
		const localStart = new TZDate(start, 'Europe/Rome');
		const cursor = new TZDate(
			localStart.getFullYear(),
			localStart.getMonth(),
			localStart.getDate(),
			0,
			'Europe/Rome'
		);
		const candidates: Date[] = [];
		while (cursor <= end) {
			if (cursor >= start) candidates.push(new Date(cursor.getTime()));
			cursor.setHours(cursor.getHours() + 12);
		}

		const renderedPlotWidth = renderedWidth * (plotWidth / width);
		const forecastDays = Math.max(1, (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
		const includeNoon = renderedPlotWidth / forecastDays >= 120;

		return candidates.filter((tick) => {
			const localTick = new TZDate(tick, 'Europe/Rome');
			const tickX = x(tick);
			return (
				(includeNoon || localTick.getHours() === 0) &&
				tickX >= margin.left + 24 &&
				tickX <= width - margin.right - 24
			);
		});
	});
	let nowX = $derived.by(() => {
		const now = new Date();
		const [start, end] = x.domain();
		return now >= start && now <= end ? x(now) : null;
	});

	function rainSegments(value: number) {
		return rainBands
			.filter((band) => value > band.from)
			.map((band) => ({ ...band, to: Math.min(value, band.to) }));
	}

	function formatHour(date: Date): string {
		return new Intl.DateTimeFormat('it-IT', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/Rome'
		}).format(date);
	}

	function formatSunshineDuration(hours: number): string {
		return new Intl.NumberFormat('it-IT', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).format(hours);
	}

	function sunshineOpacity(hours: number): number {
		const proportion = clamp(hours / 3, 0, 1);
		if (proportion <= 2 / 3) return proportion * 0.36;

		const nearFull = (proportion - 2 / 3) * 3;
		return 0.24 + nearFull ** 2 * 0.36;
	}

	function hourAtClientX(clientX: number): HourlyForecast | null {
		const bounds = svgElement.getBoundingClientRect();
		const svgX = ((clientX - bounds.left) / bounds.width) * width;
		const targetTime = x.invert(svgX);
		const index = bisector((hour: HourlyForecast) => hour.time).center(hours, targetTime);
		return hours[index] ?? null;
	}

	function hourAtPointer(event: PointerEvent): HourlyForecast | null {
		return hourAtClientX(event.clientX);
	}

	function handlePointerDown(event: PointerEvent) {
		if (event.pointerType === 'touch') touchActive = true;
		hovered = hourAtPointer(event);
	}

	function handlePointerMove(event: PointerEvent) {
		// A touch move usually means the user is scrolling the forecast horizontally.
		if (event.pointerType !== 'touch') hovered = hourAtPointer(event);
	}

	function handlePointerLeave(event: PointerEvent) {
		if (event.pointerType !== 'touch') hovered = null;
	}

	function handlePointerEnd(event: PointerEvent) {
		if (event.pointerType === 'touch') endTouch();
	}

	function handleTouchMove(event: TouchEvent) {
		const touch = event.touches[0];
		if (touchActive && touch) hovered = hourAtClientX(touch.clientX);
	}

	function endTouch() {
		touchActive = false;
		hovered = null;
	}

	function clamp(value: number, minimum: number, maximum: number): number {
		return Math.min(maximum, Math.max(minimum, value));
	}
</script>

<svelte:window ontouchmove={handleTouchMove} ontouchend={endTouch} ontouchcancel={endTouch} />

<div class="chart">
	<svg
		bind:this={svgElement}
		bind:clientWidth={renderedWidth}
		viewBox={`0 0 ${width} ${height}`}
		role="img"
		aria-label={label}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerEnd}
		onpointerleave={handlePointerLeave}
	>
		<defs>
			<linearGradient
				id="temperature-gradient"
				gradientUnits="userSpaceOnUse"
				x1="0"
				x2="0"
				y1={plotBottom}
				y2={margin.top}
			>
				<stop offset="0%" stop-color="#3b82f6" />
				<stop offset="100%" stop-color="#ef4444" />
			</linearGradient>
		</defs>
		{#if showSunshine}
			<g class="sunshine-layer" aria-hidden="true">
				{#each hours as hour (hour.time)}
					<rect
						x={x(hour.time)}
						y={margin.top}
						width={barWidth}
						height={plotBottom - margin.top}
						fill="#facc15"
						opacity={sunshineOpacity(hour.sunshineDuration)}
					/>
				{/each}
			</g>
		{/if}

		{#each temperatureTicks as tick (tick)}
			{@const tickY = temperature(tick)}
			<line x1={margin.left} x2={width - margin.right} y1={tickY} y2={tickY} class="axis-grid" />
		{/each}
		{#each dayBoundaries as boundary (boundary)}
			<line x1={x(boundary)} x2={x(boundary)} y1={margin.top} y2={plotBottom} class="day-divider" />
		{/each}

		{#each hours as hour (hour.time)}
			{#if hour.rainProbability > 0}
				<rect
					x={x(hour.time)}
					y={plotBottom + 3}
					width={barWidth}
					height="5"
					opacity={0.15 + (hour.rainProbability / 100) * 0.85}
					class="probability-bar"
				>
					<title>Probabilità di precipitazioni: {hour.rainProbability}%</title>
				</rect>
			{/if}
		{/each}

		{#each hours as hour (hour.time)}
			<g>
				<title
					>{formatHour(hour.time)} · {hour.rainFall} mm · probabilità {hour.rainProbability}%</title
				>
				{#each rainSegments(hour.rainFall) as segment (segment.from)}
					<rect
						x={x(hour.time)}
						y={precipitation(segment.to)}
						width={barWidth}
						height={precipitation(segment.from) - precipitation(segment.to)}
						fill={segment.color}
						class="rain"
					/>
				{/each}
			</g>
		{/each}

		<path d={temperatureLine} class="temperature-line" stroke="url(#temperature-gradient)" />

		{#each maxima as hour (hour.time)}
			<circle cx={x(hour.time)} cy={temperature(hour.temperature)} r="5" class="maximum-point" />
			<text
				x={x(hour.time)}
				y={temperature(hour.temperature) - 10}
				text-anchor="middle"
				class="maximum-label">{hour.temperature}°</text
			>
		{/each}
		{#each minima as hour (hour.time)}
			<circle cx={x(hour.time)} cy={temperature(hour.temperature)} r="5" class="minimum-point" />
			<text
				x={x(hour.time)}
				y={temperature(hour.temperature) + 20}
				text-anchor="middle"
				class="minimum-label">{hour.temperature}°</text
			>
		{/each}

		{#if nowX !== null}
			<line x1={nowX} x2={nowX} y1={margin.top} y2={plotBottom} class="now-line" />
			<text x={nowX + 6} y={margin.top + 12} class="now-label">ora</text>
		{/if}

		<line
			x1={margin.left}
			x2={width - margin.right}
			y1={plotBottom}
			y2={plotBottom}
			class="baseline"
		/>
		{#each timeTicks as tick (tick)}
			<line x1={x(tick)} x2={x(tick)} y1={plotBottom + 10} y2={plotBottom + 14} class="time-tick" />
			<text x={x(tick)} y={plotBottom + 28} text-anchor="middle" class="time-tick-label">
				{formatHour(tick)}
			</text>
		{/each}
		{#if hovered}
			{@const hoverX = x(hovered.time)}
			{@const hoverY = temperature(hovered.temperature)}
			{@const temperatureBadgeX = clamp(hoverX + 9, margin.left, width - margin.right - 46)}
			{@const temperatureBadgeY = clamp(hoverY - 30, margin.top, plotBottom - 22)}
			{@const timeBadgeWidth = showSunshine ? 126 : 56}
			{@const timeBadgeX = clamp(
				hoverX - timeBadgeWidth / 2,
				margin.left,
				width - margin.right - timeBadgeWidth
			)}
			<line x1={hoverX} x2={hoverX} y1={margin.top} y2={plotBottom} class="hover-line" />
			<circle cx={hoverX} cy={hoverY} r="5" class="hover-point" />

			<g
				class="hover-badge temperature-badge"
				transform={`translate(${temperatureBadgeX}, ${temperatureBadgeY})`}
			>
				<rect width="46" height="22" rx="5" />
				<text x="23" y="15" text-anchor="middle">{hovered.temperature}°</text>
			</g>

			<g class="hover-badge time-badge" transform={`translate(${timeBadgeX}, ${plotBottom + 11})`}>
				<rect width={timeBadgeWidth} height="20" rx="5" />
				<text x={timeBadgeWidth / 2} y="14" text-anchor="middle">
					{formatHour(hovered.time)}{#if showSunshine}
						· sole {formatSunshineDuration(hovered.sunshineDuration)} h
					{/if}
				</text>
			</g>
		{/if}

		<rect
			x={margin.left}
			y={margin.top}
			width={plotWidth}
			height={plotBottom - margin.top}
			fill="transparent"
			class="hit-area"
		/>
	</svg>

	<svg class="temperature-axis" viewBox={`0 0 ${margin.left} ${height}`} aria-hidden="true">
		<rect width={margin.left} {height} class="axis-background" />
		{#each temperatureTicks as tick (tick)}
			{@const tickY = temperature(tick)}
			<text x={margin.left - 8} y={tickY + 4} text-anchor="end" class="axis-number">{tick}°</text>
		{/each}
		<text x={margin.left - 8} y={unitY} text-anchor="end" class="temperature-unit">°C</text>
	</svg>

	<svg
		class="rain-axis"
		viewBox={`${width - margin.right} 0 ${margin.right} ${height}`}
		aria-hidden="true"
	>
		<rect x={width - margin.right} width={margin.right} {height} class="axis-background" />
		{#each precipitationTicks as tick (tick)}
			<text x={width - margin.right + 8} y={precipitation(tick) + 4} class="axis-number"
				>{tick}</text
			>
		{/each}
		{#each rainSegments(maximumRain) as segment (segment.from)}
			<rect
				x={width - 20}
				y={precipitation(segment.to)}
				width="7"
				height={precipitation(segment.from) - precipitation(segment.to)}
				fill={segment.color}
			/>
		{/each}
		<text x={width - 8} y={unitY} text-anchor="end" class="rain-unit">mm/3h</text>
		{#if hovered}
			{@const rainBadgeY = clamp(precipitation(hovered.rainFall) - 10, margin.top, plotBottom - 20)}
			<g
				class="hover-badge rain-badge"
				transform={`translate(${width - margin.right + 4}, ${rainBadgeY})`}
			>
				<rect width="44" height="20" rx="5" />
				<text x="22" y="14" text-anchor="middle">{hovered.rainFall}</text>
			</g>
		{/if}
	</svg>
</div>

<style>
	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.chart {
		display: grid;
	}

	.chart > svg {
		grid-area: 1 / 1;
	}

	.temperature-axis,
	.rain-axis {
		position: sticky;
		width: 5.4167%;
		height: 100%;
		pointer-events: none;
	}

	.temperature-axis {
		left: 0;
		justify-self: start;
	}

	.rain-axis {
		right: 0;
		justify-self: end;
	}

	.axis-background {
		fill: white;
		fill-opacity: 0.96;
	}

	.axis-grid {
		stroke: #e2e8f0;
	}

	.day-divider {
		stroke: #cbd5e1;
		stroke-dasharray: 3 6;
	}

	.axis-number {
		fill: #64748b;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	.rain {
		opacity: 0.88;
	}

	.probability-bar {
		fill: #60a5fa;
		stroke: #60a5fa;
		stroke-width: 0.8;
	}

	.temperature-line {
		fill: none;
		stroke-width: 5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.maximum-point,
	.minimum-point,
	.hover-point {
		stroke: white;
		stroke-width: 2;
	}

	.maximum-point,
	.hover-point {
		fill: #ef4444;
	}

	.minimum-point {
		fill: #3b82f6;
	}

	.maximum-label,
	.minimum-label {
		font-size: 14px;
		font-weight: 700;
		paint-order: stroke;
		stroke: #f8fafc;
		stroke-width: 3px;
	}

	.maximum-label {
		fill: #b91c1c;
	}

	.minimum-label {
		fill: #1d4ed8;
	}

	.baseline {
		stroke: #94a3b8;
	}

	.time-tick {
		stroke: #94a3b8;
	}

	.time-tick-label {
		fill: #64748b;
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}

	.temperature-unit,
	.rain-unit {
		font-size: 13px;
		font-weight: 600;
	}

	.temperature-unit {
		fill: #ef4444;
	}

	.rain-unit {
		fill: #2563eb;
	}

	.now-line {
		stroke: #0f172a;
		stroke-width: 2;
		stroke-dasharray: 4 4;
	}

	.now-label {
		fill: #0f172a;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.hover-line {
		stroke: #475569;
		stroke-width: 1;
	}

	.hover-badge {
		pointer-events: none;
	}

	.hover-badge rect {
		fill: #0f172a;
	}

	.hover-badge text {
		fill: white;
		font-size: 12px;
		font-weight: 700;
	}

	.temperature-badge rect {
		fill: #dc2626;
	}

	.rain-badge rect {
		fill: #2563eb;
	}

	.hit-area {
		cursor: crosshair;
	}
</style>
