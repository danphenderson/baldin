const TOKEN_KEY = 'baldin_token';

export function clearStoredAuthToken(): void {
  const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
  if (!storage || typeof storage.removeItem !== 'function') {
    return;
  }

  storage.removeItem(TOKEN_KEY);
}
