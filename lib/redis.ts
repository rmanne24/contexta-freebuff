import { Redis } from '@upstash/redis';

let client: Redis | null = null;
let checked = false;

/**
 * Returns an Upstash Redis client if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * (or Vercel KV env vars KV_REST_API_URL and KV_REST_API_TOKEN) are provided.
 * Returns null if not configured, allowing transparent fallback to local disk storage.
 */
export function getRedis(): Redis | null {
  if (checked) return client;
  checked = true;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    client = new Redis({ url, token });
  }
  return client;
}
