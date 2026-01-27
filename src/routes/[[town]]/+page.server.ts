import {
	fetchForecastData,
	fetchHourlyForecastData,
	fetchIcons,
	type IconMappings,
	fetchTowns,
	type Town,
	fetchBulletins,
	type DayData
} from '$lib/api';
import { createTownSlug } from '$lib/slug';
import { error } from '@sveltejs/kit';

let iconsCache: IconMappings | null = null;
let townsCache: Town[] | null = null;

export const load = async ({ params }) => {
	let { town: slug } = params;
	if (!slug) {
		slug = 'trento';
	}

	slug = createTownSlug(slug);

	if (!iconsCache) {
		iconsCache = await fetchIcons();
	}

	if (!townsCache) {
		townsCache = await fetchTowns();
	}

	const town = townsCache.find((town) => town.slug === slug);

	if (!town) {
		console.log(`Town with slug "${slug}" not found.`);
		error(404);
	}

	const [forecast, hourlyForecast, bulletins] = await Promise.all([
		fetchForecastData(town.id),
		fetchHourlyForecastData(town.id),
		fetchBulletins()
	]);

	// Organize data by day
	const days: DayData[] = forecast.map((dailyForecast, dayIndex) => {
		// Get 8 hourly entries for this day (3-hour intervals = 24 hours)
		const hourlyStart = dayIndex * 8;
		const hourlyForecasts = hourlyForecast.slice(hourlyStart, hourlyStart + 8);

		// Find bulletin that applies to this day
		const bulletin = bulletins.find((b) => {
			// Use date-only strings to avoid timezone issues
			const dayStr = dailyForecast.date.toISOString().split('T')[0];
			const startStr = b.start.toISOString().split('T')[0];
			const endStr = b.end.toISOString().split('T')[0];

			return dayStr >= startStr && dayStr <= endStr;
		});

		return {
			date: dailyForecast.date,
			dailyForecast: {
				skyCondition: dailyForecast.skyCondition,
				temperatureMinimum: dailyForecast.temperatureMinimum,
				temperatureMaximum: dailyForecast.temperatureMaximum
			},
			hourlyForecasts,
			bulletin
		};
	});

	return {
		town,
		icons: iconsCache,
		days
	};
};
