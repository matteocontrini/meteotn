import {
	fetchForecastData,
	fetchHourlyForecastData,
	fetchIcons,
	type IconMappings,
	fetchTowns,
	type Town,
	fetchBulletins
} from '$lib/api';
import { error } from '@sveltejs/kit';

let iconsCache: IconMappings | null = null;
let townsCache: Town[] | null = null;

export async function load({ params }) {
	let { town: slug } = params;
	if (!slug) {
		slug = 'trento';
	}

	slug = slug.toLowerCase();

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

	const forecast = await fetchForecastData(town.id);
	const hourlyForecast = await fetchHourlyForecastData(town.id);

	const bulletins = await fetchBulletins();
	const todayBulletin = bulletins.find((bulletin) => {
		const now = new Date();
		return bulletin.start <= now && bulletin.end >= now;
	});

	return {
		town,
		icons: iconsCache,
		todayBulletin,
		forecast,
		hourlyForecast
	};
}
