const trentinoVenueId = 'fba93146-7192-4190-adab-605435fdeea1';

type ApiTimeEntry = {
	id: number;
	start: string;
};

export type TimeIdMappings = Record<number, string>;

export async function fetchTimeIdMappings() {
	const url = 'https://meteo.report/var/data/forecasts/bulletin.json';
	const res = await fetch(url);
	const data = await res.json();

	// Convert array to Record with time IDs as keys
	return data['1440'].reduce((acc: TimeIdMappings, curr: ApiTimeEntry) => {
		acc[curr.id] = curr.start;
		return acc;
	}, {} as TimeIdMappings);
}

type ApiIconEntry = {
	id: string;
	icon_day: string;
	icon_night: string;
};

export type IconMappings = Record<string, { day: string; night: string }>;

export async function fetchIcons() {
	const url = 'https://manager.meteo.report/api/sky_conditions/';
	const res = await fetch(url);
	const data = await res.json();
	// Convert array to Record with icon IDs as keys
	return data.reduce((acc: IconMappings, curr: ApiIconEntry) => {
		acc[curr.id] = {
			day: curr.icon_day,
			night: curr.icon_night
		};
		return acc;
	}, {} as IconMappings) as IconMappings;
}

type ApiDailyForecastEntry = {
	rain_fall: number;
	wind_gust: number;
	fresh_snow: number;
	snow_level: number;
	wind_speed: number;
	sky_condition: string;
	freezing_level: number;
	wind_direction: number;
	rain_probability: number;
	sunshine_duration: number;
	temperature_maximum: number;
	temperature_minimum: number;
};

type ApiHourlyForecastEntry = {
	temperature: number;
	rain_fall: number;
	wind_gust: number;
	fresh_snow: number;
	snow_level: number;
	wind_speed: number;
	sky_condition: string;
	freezing_level: number;
	wind_direction: number;
	rain_probability: number;
	sunshine_duration: number;
};

export type DayForecast = {
	date: Date;
	skyCondition: string;
	temperatureMinimum: number;
	temperatureMaximum: number;
};

export type HourlyForecast = {
	time: Date;
	temperature: number;
	skyCondition: string;
	rainProbability: number;
	rainFall: number;
	freshSnow: number;
	sunshineDuration: number;
	windSpeed: number;
	windGust: number;
	windDirection: number;
	snowLevel: number;
	freezingLevel: number;
};

export type DayData = {
	date: Date;
	dailyForecast: {
		skyCondition: string;
		temperatureMinimum: number;
		temperatureMaximum: number;
	};
	hourlyForecasts: HourlyForecast[];
	bulletin?: Bulletin;
};

export async function fetchForecastData(venueId: string) {
	const url = `https://meteo.report/var/data/forecasts/${venueId}.json`;
	const res = await fetch(url);
	const data = await res.json();

	const start = new Date(data.start);

	return Object.keys(data['1440'] as Record<string, ApiDailyForecastEntry>).map(
		(key, index) =>
			({
				date: new Date(start.getTime() + index * 24 * 60 * 60 * 1000),
				skyCondition: data['1440'][key].sky_condition.toLowerCase(),
				temperatureMinimum: data['1440'][key].temperature_minimum,
				temperatureMaximum: data['1440'][key].temperature_maximum
			}) as DayForecast
	);
}

export async function fetchHourlyForecastData(venueId: string) {
	const url = `https://meteo.report/var/data/forecasts/${venueId}.json`;
	const res = await fetch(url);
	const data = await res.json();

	const start = new Date(data.start);

	return Object.keys(data['180'] as Record<string, ApiHourlyForecastEntry>).map(
		(key, index) =>
			({
				time: new Date(start.getTime() + index * 3 * 60 * 60 * 1000),
				temperature: data['180'][key].temperature,
				skyCondition: data['180'][key].sky_condition.toLowerCase(),
				rainProbability: data['180'][key].rain_probability,
				rainFall: data['180'][key].rain_fall,
				freshSnow: data['180'][key].fresh_snow,
				sunshineDuration: data['180'][key].sunshine_duration,
				windSpeed: data['180'][key].wind_speed,
				windGust: data['180'][key].wind_gust,
				windDirection: data['180'][key].wind_direction,
				snowLevel: data['180'][key].snow_level,
				freezingLevel: data['180'][key].freezing_level
			}) as HourlyForecast
	);
}

type ApiVenueEntry = {
	id: string;
	elevation: number;
	lat: number;
	lon: number;
	name_deu: string;
	name_eng: string;
	name_ita: string;
	name_lld: string;
	id_venue_type: string;
	id_region: string;
	/*
	 "neighbors": {
			"stations": {
					"fc712a13-de08-40e9-86bb-053654df98ec": 5.919597150829918,
					"271a96e6-85a2-4344-8ec7-27a8410786d6": 8.620260249174157,
					"1586c771-505c-49db-9b3b-32b83df63202": 12.180616573407981
			},
			"towns": {... },
			"webcams": { ... }
		}
	 */
	neighbors: Record<'stations' | 'towns' | 'webcams', Record<string, number>>;
};

export type NearbyVenue = {
	id: string;
	distance: number;
};

export type Town = {
	id: string;
	name: string;
	slug: string;
	elevation: number;
	latitude: number;
	longitude: number;
	nearbyStations: NearbyVenue[];
	nearbyTowns: NearbyVenue[];
	nearbyWebcams: NearbyVenue[];
};

export async function fetchTowns() {
	const url = 'https://manager.meteo.report/api/venues/';
	const res = await fetch(url);
	const data = await res.json();
	return data
		.filter(
			(entry: ApiVenueEntry) => entry.id_venue_type === '2' && entry.id_region === trentinoVenueId
		)
		.map(
			(entry: ApiVenueEntry) =>
				({
					id: entry.id,
					name: entry.name_ita,
					elevation: entry.elevation,
					latitude: entry.lat,
					longitude: entry.lon,
					slug: entry.name_ita.toLowerCase().replace(/\s+/g, '-'),
					nearbyStations: Object.entries(entry.neighbors.stations).map(([id, distance]) => ({
						id,
						distance
					})),
					nearbyTowns: Object.entries(entry.neighbors.towns).map(([id, distance]) => ({
						id,
						distance
					})),
					nearbyWebcams: Object.entries(entry.neighbors.webcams).map(([id, distance]) => ({
						id,
						distance
					}))
				}) as Town
		) as Town[];
}

type ApiBulletinEntry = {
	id: number;
	id_time_layout: number;
	start: string;
	end: string;
	author: string;
	id_venue: string;
	last_update: string;
	value: string;
};

export type Bulletin = {
	start: Date;
	end: Date;
	lastUpdate: Date;
	content: string;
};

export async function fetchBulletins() {
	const url = 'https://meteo.report/var/data/bulletins/it/bulletins.json';
	const res = await fetch(url);
	const data = await res.json();
	return data
		.filter((entry: ApiBulletinEntry) => entry.id_venue === trentinoVenueId)
		.map(
			(entry: ApiBulletinEntry) =>
				({
					start: new Date(entry.start),
					end: new Date(entry.end),
					lastUpdate: new Date(entry.last_update),
					content: entry.value
				}) as Bulletin
		) as Bulletin[];
}
