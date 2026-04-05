import Redis from 'ioredis';

let _client = null;

/**
 * Returns the ioredis singleton client.
 * On first call, creates the client using REDIS_URL or defaults to localhost:6379.
 * Uses lazyConnect so we can handle connection failures gracefully.
 */
export const getRedisClient = () => {
  if (_client) return _client;

  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  _client = new Redis(url, {
    lazyConnect: true,           // Don't auto-connect on creation
    enableOfflineQueue: false,   // Fail fast if Redis is down
    maxRetriesPerRequest: 1,     // Retry once, then fail fast
    connectTimeout: 3000,        // 3 second timeout
  });

  _client.on('connect', () => console.log('✅ Redis connected'));
  _client.on('error', (err) => {
    // Suppress spammy ECONNREFUSED logs after first message
    if (err.code !== 'ECONNREFUSED') {
      console.warn('⚠️  Redis error:', err.message);
    }
  });

  return _client;
};

/**
 * Connect Redis — call at server startup.
 * Returns false if connection fails (app runs without cache).
 */
export const connectRedis = async () => {
  const client = getRedisClient();
  try {
    await client.connect();
    return true;
  } catch (err) {
    console.warn('⚠️  Redis unavailable — analytics cache disabled:', err.message);
    return false;
  }
};
