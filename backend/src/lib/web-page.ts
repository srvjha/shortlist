import { env } from "../config/env.js";

// Reads a public page as plain text through Jina Reader. Jina fetches it on its side, so a URL a user typed is never
// requested from our own network. Empty when the page can't be read.
export async function readWebPage(url: string, maxChars = 30_000) {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/plain", ...(env.JINA_API_KEY && { Authorization: `Bearer ${env.JINA_API_KEY}` }) },
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  return response?.ok ? (await response.text()).trim().slice(0, maxChars) : "";
}
