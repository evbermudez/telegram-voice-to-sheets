export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = body?.error?.message || body?.description || response.statusText;
    throw new Error(`${response.status} ${detail}`);
  }

  return body;
}
