import slugify from '@sindresorhus/slugify';

export const createTownSlug = (value: string) => slugify(value);
