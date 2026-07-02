/** Client-side fetch that always sends session cookies to protected API routes. */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include'
  })
}
