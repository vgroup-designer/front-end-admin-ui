import { config } from './config.js';

const EXPIRY_BUFFER_MS = 60_000;

let cachedToken = null;
let pendingRequest = null;

function tokenUrl() {
  return `https://${config.SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`;
}

async function requestAccessToken() {
  const response = await fetch(tokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.SHOPIFY_CLIENT_ID,
      client_secret: config.SHOPIFY_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify OAuth token request failed (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt - EXPIRY_BUFFER_MS > Date.now()) {
    return cachedToken.accessToken;
  }

  if (!pendingRequest) {
    pendingRequest = requestAccessToken()
      .then((token) => {
        cachedToken = token;
        return token.accessToken;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }

  return pendingRequest;
}
