/**
 * Server-side wrapper rundt vårt eget API.
 *
 * Server components bruker disse helperne for å hente data via vårt
 * publiserte API istedenfor service-laget direkte. Det matcher
 * oppgavens datafyt-spec: Åpen data → DB → /api/* → Frontend.
 *
 * Krever absolutt URL fordi server-side fetch ikke har en current
 * page å være relativ til. `getBaseUrl()` håndterer tre miljøer.
 */

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `API ${path} returned ${res.status}: ${await res.text()}`,
    );
  }
  return (await res.json()) as T;
}
