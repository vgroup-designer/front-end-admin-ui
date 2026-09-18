import { config } from '../config.js';
import { getAccessToken } from '../shopifyAuth.js';

function adminApiUrl(path) {
  return `https://${config.SHOPIFY_STORE_DOMAIN}/admin/api/${config.SHOPIFY_API_VERSION}/${path}`;
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
