import express from 'express';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { authenticate, authenticateSecretKey } from '../middleware/auth.js';
import { storageService } from '../services/storage.js';
import mime from 'mime-types';

const router = express.Router();
const prisma = new PrismaClient();

// Helper to serialize BigInt fields
const serializeFile = (file) => ({
  ...file,
  size: file.size.toString(),
});

// Upload file
router.post('/upload', authenticate, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = req.files.file;
    const { parentId } = req.body;
    
    // Check storage quota
    const newStorageUsed = BigInt(req.user.storageUsed) + BigInt(file.size);
    if (newStorageUsed > BigInt(req.user.plan.storageLimit)) {
      return res.status(403).json({ error: 'Storage quota exceeded' });
    }
    
    // Read file data - handle both temp file and buffer modes
    let fileBuffer;
    if (file.tempFilePath) {
      // File is stored in temp location, read it
      fileBuffer = await fs.readFile(file.tempFilePath);
      // Clean up temp file after reading
      await fs.unlink(file.tempFilePath).catch(() => {});
    } else {
      // File data is in memory
      fileBuffer = file.data;
    }
    
    // Save file to hot storage
    const { fileHash, shardId, shardType, deduplicated } = await storageService.saveFile(
      fileBuffer,
      req.user.id,
      true
    );
    
    // Create file record
    const fileRecord = await prisma.file.create({
      data: {
        userId: req.user.id,
        filename: file.name,
        originalName: file.name,
        fileHash,
        size: BigInt(file.size),
        mimeType: file.mimetype,
        shardId,
        shardType,
        parentId: parentId || null,
      },
    });
    
    // Update user storage
    if (!deduplicated) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { storageUsed: newStorageUsed },
      });
    }
    
    res.status(201).json({
      file: serializeFile(fileRecord),
      deduplicated,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Preview file (inline display)
router.get('/preview/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('Preview request for file:', fileId);
    
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: req.user.id,
        deletedAt: null,
      },
    });
    
    if (!file) {
      console.log('File not found in database');
      return res.status(404).json({ error: 'File not found' });
    }
    
    console.log('File found:', { 
      filename: file.filename, 
      fileHash: file.fileHash, 
      shardId: file.shardId, 
      shardType: file.shardType,
      mimeType: file.mimeType
    });
    
    const fileSize = Number(file.size);
    
    // Update last accessed
    await prisma.file.update({
      where: { id: fileId },
      data: { lastAccessedAt: new Date() },
    });
    
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName || file.filename)}"`);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    console.log('Fetching file from storage...');
    const fileBuffer = await storageService.getFile(
      file.fileHash,
      file.shardId,
      file.shardType
    );
    console.log('File buffer size:', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Preview error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Preview failed' });
    }
  }
});

// Download file
router.get('/download/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: req.user.id,
        deletedAt: null,
      },
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Use streaming for large files (better memory efficiency)
    const fileSize = Number(file.size);
    const useStreaming = fileSize > 10 * 1024 * 1024; // Stream if > 10MB
    
    // Update last accessed
    await prisma.file.update({
      where: { id: fileId },
      data: { lastAccessedAt: new Date() },
    });
    
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName || file.filename)}"`);
    res.setHeader('Content-Length', fileSize);
    
    if (useStreaming) {
      // Stream large files
      const fileStream = storageService.getFileStream(
        file.fileHash,
        file.shardId,
        file.shardType
      );
      
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Download failed' });
        }
      });
      
      fileStream.pipe(res);
    } else {
      // Send small files as buffer
      const fileBuffer = await storageService.getFile(
        file.fileHash,
        file.shardId,
        file.shardType
      );
      res.send(fileBuffer);
    }
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed' });
    }
  }
});

// List files
router.get('/list', authenticate, async (req, res) => {
  try {
    const { parentId } = req.query;
    
    const files = await prisma.file.findMany({
      where: {
        userId: req.user.id,
        parentId: parentId || null,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Also get folders
    const folders = await prisma.folder.findMany({
      where: {
        userId: req.user.id,
        parentId: parentId || null,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
    
    // Combine and serialize
    const serializedFiles = files.map(serializeFile);
    const serializedFolders = folders.map(f => ({ ...f, isFolder: true }));
    
    res.json({ files: [...serializedFolders, ...serializedFiles] });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Recent files (last 50 accessed)
router.get('/recent', authenticate, async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      where: {
        userId: req.user.id,
        deletedAt: null,
      },
      orderBy: { lastAccessedAt: 'desc' },
      take: 50,
    });
    
    res.json({ files: files.map(serializeFile) });
  } catch (error) {
    console.error('Recent files error:', error);
    res.status(500).json({ error: 'Failed to get recent files' });
  }
});

// Starred files
router.get('/starred', authenticate, async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      where: {
        userId: req.user.id,
        starred: true,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    const folders = await prisma.folder.findMany({
      where: {
        userId: req.user.id,
        starred: true,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
    
    const serializedFiles = files.map(serializeFile);
    const serializedFolders = folders.map(f => ({ ...f, isFolder: true }));
    
    res.json({ files: [...serializedFolders, ...serializedFiles] });
  } catch (error) {
    console.error('Starred files error:', error);
    res.status(500).json({ error: 'Failed to get starred files' });
  }
});

// Toggle star on file
router.patch('/:fileId/star', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await prisma.file.findFirst({
      where: { id: fileId, userId: req.user.id },
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { starred: !file.starred },
    });
    
    res.json({ file: serializeFile(updated) });
  } catch (error) {
    console.error('Star toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

// Trash - list deleted files
router.get('/trash', authenticate, async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: 'desc' },
    });
    
    const folders = await prisma.folder.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: 'desc' },
    });
    
    const serializedFiles = files.map(f => ({
      ...serializeFile(f),
      daysUntilPermanentDelete: Math.max(0, 30 - Math.floor((Date.now() - new Date(f.deletedAt).getTime()) / (1000 * 60 * 60 * 24))),
    }));
    const serializedFolders = folders.map(f => ({
      ...f,
      isFolder: true,
      daysUntilPermanentDelete: Math.max(0, 30 - Math.floor((Date.now() - new Date(f.deletedAt).getTime()) / (1000 * 60 * 60 * 24))),
    }));
    
    res.json({ files: [...serializedFolders, ...serializedFiles] });
  } catch (error) {
    console.error('Trash list error:', error);
    res.status(500).json({ error: 'Failed to get trash' });
  }
});

// Restore file from trash
router.patch('/:fileId/restore', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: req.user.id,
        deletedAt: { not: null },
      },
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found in trash' });
    }
    
    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: null },
    });
    
    res.json({ file: serializeFile(updated), message: 'File restored' });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Failed to restore file' });
  }
});

// Permanently delete file
router.delete('/:fileId/permanent', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: req.user.id,
      },
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Delete from storage
    await storageService.deleteFile(file.fileHash, file.shardId, file.shardType);
    
    // Update user storage
    await prisma.user.update({
      where: { id: req.user.id },
      data: { storageUsed: { decrement: file.size } },
    });
    
    // Delete from database
    await prisma.file.delete({ where: { id: fileId } });
    
    res.json({ message: 'File permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: 'Failed to permanently delete file' });
  }
});

// Empty trash
router.delete('/trash/empty', authenticate, async (req, res) => {
  try {
    const trashedFiles = await prisma.file.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null },
      },
    });
    
    // Delete files from storage and calculate total size
    let totalSize = BigInt(0);
    for (const file of trashedFiles) {
      await storageService.deleteFile(file.fileHash, file.shardId, file.shardType);
      totalSize += file.size;
    }
    
    // Delete folders from trash
    await prisma.folder.deleteMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null },
      },
    });
    
    // Delete files from database
    await prisma.file.deleteMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null },
      },
    });
    
    // Update user storage
    await prisma.user.update({
      where: { id: req.user.id },
      data: { storageUsed: { decrement: totalSize } },
    });
    
    res.json({ message: 'Trash emptied', deletedCount: trashedFiles.length });
  } catch (error) {
    console.error('Empty trash error:', error);
    res.status(500).json({ error: 'Failed to empty trash' });
  }
});

// Delete file (soft delete - move to trash)
router.delete('/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: req.user.id,
        deletedAt: null,
      },
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    await prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
