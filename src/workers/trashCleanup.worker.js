import { PrismaClient } from '@prisma/client';
import { storageService } from '../services/storage.js';

const prisma = new PrismaClient();
const TRASH_RETENTION_DAYS = 30;

export async function cleanupTrash() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - TRASH_RETENTION_DAYS);
  
  console.log(`[Trash Cleanup] Running cleanup for items deleted before ${cutoffDate.toISOString()}`);
  
  try {
    // Find files to permanently delete
    const filesToDelete = await prisma.file.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
    });
    
    console.log(`[Trash Cleanup] Found ${filesToDelete.length} files to permanently delete`);
    
    // Delete files from storage and update user storage
    for (const file of filesToDelete) {
      try {
        await storageService.deleteFile(file.fileHash, file.shardId, file.shardType);
        await prisma.user.update({
          where: { id: file.userId },
          data: { storageUsed: { decrement: file.size } },
        });
        await prisma.file.delete({ where: { id: file.id } });
        console.log(`[Trash Cleanup] Deleted file: ${file.filename}`);
      } catch (err) {
        console.error(`[Trash Cleanup] Failed to delete file ${file.id}:`, err);
      }
    }
    
    // Delete old folders from trash
    const foldersDeleted = await prisma.folder.deleteMany({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
    });
    
    console.log(`[Trash Cleanup] Deleted ${foldersDeleted.count} folders`);
    console.log(`[Trash Cleanup] Cleanup complete`);
  } catch (error) {
    console.error('[Trash Cleanup] Error:', error);
  }
}

export function startTrashCleanupScheduler() {
  // Run cleanup daily at 3 AM
  const runCleanup = () => {
    const now = new Date();
    const next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);
    if (next3AM <= now) {
      next3AM.setDate(next3AM.getDate() + 1);
    }
    const delay = next3AM.getTime() - now.getTime();
    
    setTimeout(() => {
      cleanupTrash();
      // Schedule next run
      setInterval(cleanupTrash, 24 * 60 * 60 * 1000);
    }, delay);
    
    console.log(`[Trash Cleanup] Scheduled for ${next3AM.toISOString()}`);
  };
  
  runCleanup();
  
  // Also run once on startup (after 1 minute delay)
  setTimeout(cleanupTrash, 60 * 1000);
}
