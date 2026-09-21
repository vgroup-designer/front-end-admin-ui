import { config } from '../config.js';
import { getAccessToken } from '../shopifyAuth.js';

function adminApiUrl(path) {
  return `https://${config.SHOPIFY_STORE_DOMAIN}/admin/api/${config.SHOPIFY_API_VERSION}/${path}`;
}

function nextPageUrl(linkHeader) {
  if (!linkHeader) {
    return null;
  }
  const next = linkHeader.split(',').find((part) => part.includes('rel="next"'));
  return next ? next.trim().match(/<(.*)>/)[1] : null;
}

export async function shopifyRequest(path, { method = 'GET', body } = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(adminApiUrl(path), {
    method,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Shopify API request failed (${response.status}): ${await response.text()}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Follows Link-header (rel="next") cursor pagination to collect every page under `key`.
// Needed for endpoints like products.json where REST filter params (e.g. `title`) aren't
// honored by Shopify, so the full list must be fetched and filtered client-side.
export async function shopifyRequestAll(path, key) {
  const accessToken = await getAccessToken();
  const results = [];
  let url = adminApiUrl(path);

  while (url) {
    const response = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    });

    if (!response.ok) {
      throw new Error(`Shopify API request failed (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    results.push(...data[key]);
    url = nextPageUrl(response.headers.get('link'));
  }

  return results;
}
