import Queue from 'bull';
import Redis from 'ioredis';
import { config } from '../config/index.js';

// Create Redis connection
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
};

// Create queues
export const coldStorageQueue = new Queue('cold-storage-migration', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 86400, // Keep failed jobs for 7 days
    },
  },
});

// Queue event handlers
coldStorageQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed: Moved file to cold storage`);
});

coldStorageQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

coldStorageQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} stalled`);
});

export default {
  coldStorageQueue,
};
