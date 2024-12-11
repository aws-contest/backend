// backend/utils/redisClient.js
const Redis = require('ioredis'); // Use ioredis for Redis Cluster
const { redisPassword, redisNodes } = require('../config/keys');

class RedisClient {
  constructor() {
    this.cluster = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected && this.cluster) {
      return this.cluster;
    }

    try {
      console.log('Connecting to Redis Cluster...');

      // Parse Redis nodes from environment variables
      const nodes = redisNodes.split(',').map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port, 10) };
      });

      this.cluster = new Redis.Cluster(nodes, {
        redisOptions: {
          password: redisPassword || undefined,
        },
      });

      this.cluster.on('connect', () => {
        console.log('Redis Cluster Connected');
        this.isConnected = true;
      });

      this.cluster.on('error', (err) => {
        console.error('Redis Cluster Error:', err);
        this.isConnected = false;
      });

      return this.cluster;
    } catch (error) {
      console.error('Redis Cluster connection error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async set(key, value, options = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      let stringValue;
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }

      if (options.ttl) {
        return await this.cluster.setex(key, options.ttl, stringValue); // Use `setex` for TTL
      }
      return await this.cluster.set(key, stringValue);
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const value = await this.cluster.get(key);
      if (!value) return null;

      try {
        return JSON.parse(value);
      } catch (parseError) {
        return value; // Return as is if not JSON
      }
    } catch (error) {
      console.error('Redis get error:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.cluster.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
      throw error;
    }
  }

  async expire(key, seconds) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.cluster.expire(key, seconds);
    } catch (error) {
      console.error('Redis expire error:', error);
      throw error;
    }
  }

  async quit() {
    if (this.cluster) {
      try {
        await this.cluster.quit();
        this.isConnected = false;
        this.cluster = null;
        console.log('Redis Cluster connection closed successfully');
      } catch (error) {
        console.error('Redis quit error:', error);
        throw error;
      }
    }
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
