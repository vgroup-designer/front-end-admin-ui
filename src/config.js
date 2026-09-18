import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  SHOPIFY_STORE_DOMAIN: z.string().min(1, 'SHOPIFY_STORE_DOMAIN is required'),
  SHOPIFY_CLIENT_ID: z.string().min(1, 'SHOPIFY_CLIENT_ID is required'),
  SHOPIFY_CLIENT_SECRET: z.string().min(1, 'SHOPIFY_CLIENT_SECRET is required'),
  SHOPIFY_API_VERSION: z.string().default('2024-10'),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const config = loadConfig();
