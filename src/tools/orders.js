import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { shopifyRequest } from '../shopify/client.js';
import { requireApproval } from '../approval.js';

const ACTION_ENDPOINTS = {
  close: (orderId) => ({ path: `orders/${orderId}/close.json`, method: 'POST' }),
  reopen: (orderId) => ({ path: `orders/${orderId}/open.json`, method: 'POST' }),
  cancel: (orderId, reason) => ({
    path: `orders/${orderId}/cancel.json`,
    method: 'POST',
    body: reason ? { reason } : undefined,
  }),
};

// Requires scope: write_orders
export const updateOrderStatus = tool(
  'update_order_status',
  'Close, reopen, or cancel a Shopify order. Requires an admin/staff role and explicit confirmation.',
  {
    order_id: z.number().int().positive().describe('Numeric Shopify order ID'),
    action: z.enum(['close', 'reopen', 'cancel']).describe('Status transition to apply'),
    reason: z.string().optional().describe('Reason for cancellation; only used when action is "cancel"'),
    role: z.enum(['admin', 'staff', 'shopper']).describe("Caller's role; only admin or staff may perform this action"),
    confirmed: z.boolean().describe('Must be true to proceed; represents explicit confirmation of this write'),
  },
  async ({ order_id, action, reason, role, confirmed }) => {
    const approval = requireApproval({ role, confirmed });
    if (!approval.allowed) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Action rejected: ${approval.reason}` }],
      };
    }

    const { path, method, body } = ACTION_ENDPOINTS[action](order_id, reason);
    const data = await shopifyRequest(path, { method, body });

    return {
      content: [{ type: 'text', text: JSON.stringify(data.order, null, 2) }],
    };
  },
);
