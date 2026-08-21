<script lang="ts">
	import type { HourlyForecast } from '$lib/api';
	import { bisector, extent, max, range } from 'd3-array';
	import { scaleLinear, scaleTime } from 'd3-scale';
	import { curveMonotoneX, line } from 'd3-shape';

	interface Props {
		hours: HourlyForecast[];
		dayBoundaries?: Date[];
		maxima?: HourlyForecast[];
		rainColors: string[];
		label: string;
	}

	let { hours, dayBoundaries = [], maxima = [], rainColors, label }: Props = $props();
	let hovered = $state<HourlyForecast | null>(null);

	const width = 960;
	const height = 280;
	const margin = { top: 18, right: 52, left: 52 };
	const plotBottom = 232;
	const unitY = 260;
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

	function handlePointerMove(event: PointerEvent) {
		const svg = event.currentTarget as SVGSVGElement;
		const bounds = svg.getBoundingClientRect();
		const svgX = ((event.clientX - bounds.left) / bounds.width) * width;
		const targetTime = x.invert(svgX);
		const index = bisector((hour: HourlyForecast) => hour.time).center(hours, targetTime);
		hovered = hours[index] ?? null;
	}

	function clamp(value: number, minimum: number, maximum: number): number {
		return Math.min(maximum, Math.max(minimum, value));
	}
</script>

<svg
	viewBox={`0 0 ${width} ${height}`}
	role="img"
	aria-label={label}
	onpointermove={handlePointerMove}
	onpointerleave={() => (hovered = null)}
>
	{#each temperatureTicks as tick (tick)}
		{@const tickY = temperature(tick)}
		<line x1={margin.left} x2={width - margin.right} y1={tickY} y2={tickY} class="axis-grid" />
		<text x={margin.left - 8} y={tickY + 4} text-anchor="end" class="axis-number">{tick}°</text>
	{/each}
	{#each precipitationTicks as tick (tick)}
		<text x={width - margin.right + 8} y={precipitation(tick) + 4} class="axis-number">{tick}</text>
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

	<path d={temperatureLine} class="temperature-line" />

	{#each maxima as hour (hour.time)}
		<circle cx={x(hour.time)} cy={temperature(hour.temperature)} r="5" class="maximum-point" />
		<text
			x={x(hour.time)}
			y={temperature(hour.temperature) - 10}
			text-anchor="middle"
			class="maximum-label">{Math.round(hour.temperature)}°</text
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
	<text x={margin.left - 8} y={unitY} text-anchor="end" class="temperature-unit">°C</text>
	<text x={width - 12} y={unitY} text-anchor="end" class="rain-unit">mm/3h</text>

	{#if hovered}
		{@const hoverX = x(hovered.time)}
		{@const hoverY = temperature(hovered.temperature)}
		{@const temperatureBadgeX = clamp(hoverX + 9, margin.left, width - margin.right - 46)}
		{@const temperatureBadgeY = clamp(hoverY - 30, margin.top, plotBottom - 22)}
		{@const timeBadgeX = clamp(hoverX - 28, margin.left, width - margin.right - 56)}
		{@const rainBadgeY = clamp(precipitation(hovered.rainFall) - 10, margin.top, plotBottom - 20)}
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
			<rect width="56" height="20" rx="5" />
			<text x="28" y="14" text-anchor="middle">{formatHour(hovered.time)}</text>
		</g>

		<g
			class="hover-badge rain-badge"
			transform={`translate(${width - margin.right + 4}, ${rainBadgeY})`}
		>
			<rect width="44" height="20" rx="5" />
			<text x="22" y="14" text-anchor="middle">{hovered.rainFall}</text>
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

<style>
	svg {
		display: block;
		width: 100%;
		height: auto;
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
		stroke: #ef4444;
		stroke-width: 5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.maximum-point,
	.hover-point {
		fill: #ef4444;
		stroke: white;
		stroke-width: 2;
	}

	.maximum-label {
		fill: #b91c1c;
		font-size: 14px;
		font-weight: 700;
		paint-order: stroke;
		stroke: #f8fafc;
		stroke-width: 3px;
	}

	.baseline {
		stroke: #94a3b8;
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
