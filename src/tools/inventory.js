import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { shopifyRequest, shopifyRequestAll } from '../shopify/client.js';
import { matchByName } from '../shopify/nameMatching.js';

async function findProductByName(name) {
  // Shopify's REST `title` filter isn't honored by the API, so fetch every
  // product and let matchByName resolve it client-side.
  const products = await shopifyRequestAll('products.json?limit=250&fields=id,title,variants', 'products');
  return matchByName(products, name, (product) => product.title);
}

async function findLocationByName(name) {
  const data = await shopifyRequest('locations.json');
  return matchByName(data.locations, name, (location) => location.name);
}

async function fetchInventoryLevels(inventoryItemIds, locationId) {
  const data = await shopifyRequest(
    `inventory_levels.json?inventory_item_ids=${inventoryItemIds.join(',')}&location_ids=${locationId}`,
  );
  return data.inventory_levels;
}

// Requires scopes: read_inventory, read_products, read_locations
export const checkInventoryLevel = tool(
  'check_inventory_level',
  'Look up available inventory for a product (by name) at a specific location (by name).',
  {
    product_name: z.string().min(1).describe('Product title as it appears in Shopify'),
    location_name: z.string().min(1).describe('Location name as it appears in Shopify'),
  },
  async ({ product_name, location_name }) => {
    const [product, location] = await Promise.all([findProductByName(product_name), findLocationByName(location_name)]);

    const inventoryItemIds = product.variants.map((variant) => variant.inventory_item_id);
    const levels = await fetchInventoryLevels(inventoryItemIds, location.id);

    const variants = product.variants.map((variant) => {
      const level = levels.find((l) => l.inventory_item_id === variant.inventory_item_id);
      return {
        variant_id: variant.id,
        variant_title: variant.title,
        sku: variant.sku,
        available: level ? level.available : null,
      };
    });

    return {
      content: [{ type: 'text', text: JSON.stringify({ product: product.title, location: location.name, variants }, null, 2) }],
    };
  },
);
