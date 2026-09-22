import type { Handle } from '@sveltejs/kit';
import * as logger from '$lib/server/logger';

export const handle: Handle = async ({ event, resolve }) => {
	const ip =
		event.request.headers.get('x-forwarded-for')?.split(',')[0] || event.getClientAddress();
	logger.info(`${ip} - ${event.request.method} ${event.url.pathname + event.url.search}`);

	return resolve(event);
};
