import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { checkInventoryLevel } from './tools/inventory.js';
import { updateOrderStatus } from './tools/orders.js';
import { getSalesSummary } from './tools/sales.js';

const shopifyServer = createSdkMcpServer({
  name: 'shopify',
  version: '0.1.0',
  tools: [checkInventoryLevel, updateOrderStatus, getSalesSummary],
});

const ALLOWED_TOOLS = [
  'mcp__shopify__check_inventory_level',
  'mcp__shopify__update_order_status',
  'mcp__shopify__get_sales_summary',
];

const SYSTEM_PROMPT = `You are an operations agent for a Shopify store.
You can check inventory levels, change order status, and summarize sales.
Be precise, cite concrete numbers/IDs from tool results, and ask for
clarification if a request is ambiguous.

update_order_status is a write action gated by role and explicit
confirmation: never guess the caller's role or set confirmed to true on
their behalf — ask them directly before calling this tool.

get_sales_summary returns real computed figures (revenue, percent change,
top products); always use its numbers verbatim in your reply rather than
estimating or recalculating them yourself. A null percent change means the
prior period had zero revenue, not that nothing changed.`;

export function startAgentQuery(prompt) {
  return query({
    prompt,
    options: {
      systemPrompt: { type: 'custom', prompt: SYSTEM_PROMPT },
      mcpServers: { shopify: shopifyServer },
      tools: [],
      allowedTools: ALLOWED_TOOLS,
      permissionMode: 'bypassPermissions',
    },
  });
}
