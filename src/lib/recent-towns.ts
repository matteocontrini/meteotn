import type { Town } from './api';

const STORAGE_KEY = 'meteotn-recent-towns';
const MAX_RECENT_TOWNS = 4;

export type RecentTown = {
	slug: string;
	name: string;
	elevation: number;
};

export function getRecentTowns(): RecentTown[] {
	if (typeof window === 'undefined') return [];

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];
		return JSON.parse(stored);
	} catch {
		return [];
	}
}

export function addRecentTown(town: Town): void {
	if (typeof window === 'undefined') return;

	try {
		const recent = getRecentTowns();

		// Remove if already exists (to move it to the front)
		const filtered = recent.filter((t) => t.slug !== town.slug);

		// Add to front
		const updated = [
			{ slug: town.slug, name: town.name, elevation: town.elevation },
			...filtered
		].slice(0, MAX_RECENT_TOWNS);

		localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
	} catch (e) {
		console.error('Failed to save recent town:', e);
	}
}

export function clearRecentTowns(): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (e) {
		console.error('Failed to clear recent towns:', e);
	}
}
