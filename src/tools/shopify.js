import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { shopifyRequest } from '../shopify/client.js';

// No specific scope required beyond a valid access token
export const getShopInfo = tool(
  'get_shop_info',
  "Fetch the connected Shopify store's basic profile (name, domain, plan, currency, timezone).",
  {},
  async () => {
    const data = await shopifyRequest('shop.json');
    return {
      content: [{ type: 'text', text: JSON.stringify(data.shop, null, 2) }],
    };
  },
);

// Requires scope: read_orders
export const listOrders = tool(
  'list_orders',
  'List recent Shopify orders, optionally filtered by fulfillment/financial status.',
  {
    limit: z.number().int().min(1).max(50).default(10).describe('Number of orders to return (max 50)'),
    status: z.enum(['open', 'closed', 'cancelled', 'any']).default('open').describe('Order status filter'),
  },
  async ({ limit, status }) => {
    const data = await shopifyRequest(`orders.json?limit=${limit}&status=${status}`);
    return {
      content: [{ type: 'text', text: JSON.stringify(data.orders, null, 2) }],
    };
  },
);

export const shopifyTools = [getShopInfo, listOrders];
