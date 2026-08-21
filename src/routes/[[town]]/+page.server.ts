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

	const dateKey = (date: Date) =>
		new Intl.DateTimeFormat('en-CA', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			timeZone: 'Europe/Rome'
		}).format(date);

	// Organize data by day
	const allDays: DayData[] = forecast.map((dailyForecast) => {
		const hourlyForecasts = hourlyForecast.filter(
			(hourly) => dateKey(hourly.time) === dateKey(dailyForecast.date)
		);

		// Find bulletin that applies to this day
		const bulletin = bulletins.find((b) => {
			return dailyForecast.date >= b.start && dailyForecast.date <= b.end;
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
	const today = dateKey(new Date());
	const days = allDays.filter((day) => dateKey(day.date) >= today);

	return {
		town,
		towns: townsCache,
		icons: iconsCache,
		days
	};
};
