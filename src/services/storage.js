import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { hashFile } from '../utils/crypto.js';

export class StorageService {
  constructor() {
    this.hotPath = config.storage.hotPath;
    this.coldPath = config.storage.coldPath;
    this.numHotShards = config.storage.numHotShards;
    this.numColdShards = config.storage.numColdShards;
  }

  async initialize() {
    // Create storage directories
    for (let i = 0; i < this.numHotShards; i++) {
      await fs.mkdir(path.join(this.hotPath, `shard-${i}`), { recursive: true });
    }
    for (let i = 0; i < this.numColdShards; i++) {
      await fs.mkdir(path.join(this.coldPath, `shard-${i}`), { recursive: true });
    }
    await fs.mkdir(config.storage.tempPath, { recursive: true });
  }

  // Hybrid sharding: user-based for hot, round-robin for cold
  getShardId(userId, isHot = true) {
    const numShards = isHot ? this.numHotShards : this.numColdShards;
    const hash = parseInt(userId.substring(0, 8), 16);
    return hash % numShards;
  }

  getShardPath(shardId, isHot = true) {
    const basePath = isHot ? this.hotPath : this.coldPath;
    return path.join(basePath, `shard-${shardId}`);
  }

  // Create nested directory structure: ab/cd/abcd1234...
  getFilePath(fileHash, shardId, isHot = true) {
    const shardPath = this.getShardPath(shardId, isHot);
    const dir1 = fileHash.substring(0, 2);
    const dir2 = fileHash.substring(2, 4);
    return path.join(shardPath, dir1, dir2, fileHash);
  }

  async saveFile(buffer, userId, isHot = true) {
    const fileHash = hashFile(buffer);
    const shardId = this.getShardId(userId, isHot);
    const filePath = this.getFilePath(fileHash, shardId, isHot);
    
    // Create nested directories
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Check if file already exists (deduplication)
    try {
      await fs.access(filePath);
      return { fileHash, shardId, shardType: isHot ? 'hot' : 'cold', deduplicated: true };
    } catch {
      // File doesn't exist, save it
      await fs.writeFile(filePath, buffer);
      return { fileHash, shardId, shardType: isHot ? 'hot' : 'cold', deduplicated: false };
    }
  }

  async getFile(fileHash, shardId, shardType) {
    const isHot = shardType === 'hot';
    const filePath = this.getFilePath(fileHash, shardId, isHot);
    return fs.readFile(filePath);
  }

  // Get file stream for large files (better memory efficiency)
  getFileStream(fileHash, shardId, shardType) {
    const isHot = shardType === 'hot';
    const filePath = this.getFilePath(fileHash, shardId, isHot);
    return fsSync.createReadStream(filePath);
  }

  async deleteFile(fileHash, shardId, shardType) {
    const isHot = shardType === 'hot';
    const filePath = this.getFilePath(fileHash, shardId, isHot);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Delete file error:', error);
      return false;
    }
  }

  async moveToColdstorage(fileHash, hotShardId) {
    const hotPath = this.getFilePath(fileHash, hotShardId, true);
    const coldShardId = Math.floor(Math.random() * this.numColdShards);
    const coldPath = this.getFilePath(fileHash, coldShardId, false);
    
    await fs.mkdir(path.dirname(coldPath), { recursive: true });
    await fs.copyFile(hotPath, coldPath);
    await fs.unlink(hotPath);
    
    return { shardId: coldShardId, shardType: 'cold' };
  }
}

export const storageService = new StorageService();
