const devFallbackApiUrl = 'http://localhost:8004';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const resolvedApiUrl = configuredApiUrl || (import.meta.env.DEV ? devFallbackApiUrl : '');

if (!resolvedApiUrl) {
	throw new Error('VITE_API_URL must be set for production builds.');
}

export const API_URL = resolvedApiUrl.replace(/\/$/, '');
