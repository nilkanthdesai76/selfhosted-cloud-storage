import { PrismaClient } from '@prisma/client';
import { storageService } from '../services/storage.js';
import { config } from '../config/index.js';

const prisma = new PrismaClient();

export async function migrateToColdStorage() {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - config.storage.coldThresholdDays);
  
  try {
    const oldFiles = await prisma.file.findMany({
      where: {
        shardType: 'hot',
        lastAccessedAt: {
          lt: thresholdDate,
        },
        deletedAt: null,
      },
      take: 100, // Process in batches
    });
    
    console.log(`Found ${oldFiles.length} files to migrate to cold storage`);
    
    for (const file of oldFiles) {
      try {
        const { shardId, shardType } = await storageService.moveToColdstorage(
          file.fileHash,
          file.shardId
        );
        
        await prisma.file.update({
          where: { id: file.id },
          data: {
            shardId,
            shardType,
          },
        });
        
        console.log(`Migrated file ${file.id} to cold storage`);
      } catch (error) {
        console.error(`Failed to migrate file ${file.id}:`, error);
      }
    }
    
    return oldFiles.length;
  } catch (error) {
    console.error('Cold storage migration error:', error);
    return 0;
  }
}

export function startColdStorageScheduler() {
  console.log('Cold storage migration scheduler started');
  
  // Run immediately on startup
  migrateToColdStorage();
  
  // Run every 24 hours
  setInterval(() => {
    migrateToColdStorage();
  }, 24 * 60 * 60 * 1000);
}
