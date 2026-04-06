import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from '../schema';
import { API_URL } from '../config/env';

/**
 * Create an openapi-fetch client pre-configured with the Baldin API base URL.
 *
 * Auth is injected per-request via the `token` parameter on each service call
 * rather than through middleware, so multiple tokens (or unauthenticated
 * requests) can coexist without race conditions.
 */
export function createApiClient(token?: string) {
  const client = createClient<paths>({ baseUrl: API_URL });

  if (token) {
    const authMiddleware: Middleware = {
      async onRequest({ request }) {
        request.headers.set('Authorization', `Bearer ${token}`);
        return request;
      },
    };
    client.use(authMiddleware);
  }

  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
