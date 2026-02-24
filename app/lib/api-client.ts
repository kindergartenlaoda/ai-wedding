/**
 * Authenticated fetch helper for client-side API calls.
 * Uses cookies (NextAuth session) - no need to pass Authorization header.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
