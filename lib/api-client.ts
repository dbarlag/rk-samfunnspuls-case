/**
 * Server-side wrapper rundt vårt eget API.
 *
 * Frontend-pages (server components) bruker disse helperne for å hente
 * data — aldri direkte DB-kall. Det matcher oppgavens datafyt-spec:
 *   Åpen data → DB → /api/* → Frontend
 *
 * `getBaseUrl()` håndterer tre miljøer:
 *   - Lokal dev: http://localhost:3000 (eller port satt av Next.js)
 *   - Vercel: process.env.VERCEL_URL (sett automatisk av Vercel)
 *   - Custom: process.env.NEXT_PUBLIC_BASE_URL (manuell override)
 */

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    // Server-side fetch til samme host. Bruk default cache så Next kan
    // re-bruke responser under build (357 sider kaller samme endepunkter).
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(
      `API ${path} returned ${res.status}: ${await res.text()}`,
    );
  }
  return (await res.json()) as T;
}
