import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { shopifyRequestAll } from '../shopify/client.js';
import { computeSalesSummary } from '../shopify/salesAnalytics.js';

async function fetchOrdersInRange(startIso, endIso) {
  const params = new URLSearchParams({
    status: 'any',
    limit: '250',
    created_at_min: startIso,
    created_at_max: endIso,
  });
  return shopifyRequestAll(`orders.json?${params.toString()}`, 'orders');
}

// Requires scope: read_orders
export const getSalesSummary = tool(
  'get_sales_summary',
  "Compute a sales summary for a date range: total revenue, percent change vs. the equivalent " +
    'prior period, and the top 3 products by order count. Numbers come from real order data, not estimates.',
  {
    start_date: z.string().describe('Start of the period, ISO 8601 (e.g. "2026-09-01")'),
    end_date: z.string().describe('End of the period, ISO 8601 (e.g. "2026-09-24")'),
  },
  async ({ start_date, end_date }) => {
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Invalid date range: start_date must be a valid date before end_date.' }],
      };
    }

    const durationMs = end.getTime() - start.getTime();
    const previousEnd = start;
    const previousStart = new Date(start.getTime() - durationMs);

    const [currentOrders, previousOrders] = await Promise.all([
      fetchOrdersInRange(start.toISOString(), end.toISOString()),
      fetchOrdersInRange(previousStart.toISOString(), previousEnd.toISOString()),
    ]);

    const summary = computeSalesSummary(currentOrders, previousOrders);

    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    };
  },
);
