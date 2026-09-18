import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { checkInventoryLevel } from './tools/inventory.js';
import { updateOrderStatus } from './tools/orders.js';

const shopifyServer = createSdkMcpServer({
  name: 'shopify',
  version: '0.1.0',
  tools: [checkInventoryLevel, updateOrderStatus],
});

const ALLOWED_TOOLS = ['mcp__shopify__check_inventory_level', 'mcp__shopify__update_order_status'];

const SYSTEM_PROMPT = `You are an operations agent for a Shopify store.
You can check inventory levels and change order status. Be precise, cite
concrete numbers/IDs from tool results, and ask for clarification if a
request is ambiguous.

update_order_status is a write action gated by role and explicit
confirmation: never guess the caller's role or set confirmed to true on
their behalf — ask them directly before calling this tool.`;

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
