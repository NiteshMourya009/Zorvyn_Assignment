import { getRedisClient } from './redisClient.js';

/**
 * Gets a value from the cache.
 * Returns null if cache miss or Redis is unavailable.
 */
export const cacheGet = async (key) => {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Redis cacheGet error:', err);
    return null; // Fallback to DB
  }
};

/**
 * Sets a value in the cache with a TTL (in seconds).
 */
export const cacheSet = async (key, value, ttlSeconds = 300) => {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error('Redis cacheSet error:', err);
  }
};

/**
 * Invalidates keys matching a pattern.
 */
export const cacheInvalidate = async (pattern) => {
  const client = getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (err) {
    console.error('Redis cacheInvalidate error:', err);
  }
};
