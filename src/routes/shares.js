import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { storageService } from '../services/storage.js';
import { generateShareToken, hashPassword, comparePassword } from '../utils/crypto.js';
import { config } from '../config/index.js';

const router = express.Router();
const prisma = new PrismaClient();

// List user's shares
router.get('/list', authenticate, async (req, res) => {
  try {
    const shares = await prisma.share.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
      },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            size: true,
            mimeType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ shares });
  } catch (error) {
    console.error('List shares error:', error);
    res.status(500).json({ error: 'Failed to list shares' });
  }
});

// Create share link
router.post('/create', authenticate, async (req, res) => {
  try {
    const { fileId, password, expiryDays, maxDownloads } = req.body;
    
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
    
    const shareToken = generateShareToken();
    const expiresAt = expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + config.sharing.defaultExpiryDays * 24 * 60 * 60 * 1000);
    
    const share = await prisma.share.create({
      data: {
        fileId,
        userId: req.user.id,
        shareToken,
        passwordHash: password ? await hashPassword(password) : null,
        expiresAt,
        maxDownloads: maxDownloads || config.sharing.maxDownloadsDefault,
      },
    });
    
    res.status(201).json({
      shareUrl: `${req.protocol}://${req.get('host')}/api/shares/${shareToken}`,
      share,
    });
  } catch (error) {
    console.error('Create share error:', error);
    res.status(500).json({ error: 'Failed to create share' });
  }
});

// Download via share link
router.get('/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;
    const { password } = req.query;
    
    const share = await prisma.share.findUnique({
      where: { shareToken },
      include: { file: true },
    });
    
    if (!share || !share.isActive) {
      return res.status(404).json({ error: 'Share not found' });
    }
    
    if (share.expiresAt && new Date() > share.expiresAt) {
      return res.status(410).json({ error: 'Share link expired' });
    }
    
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      return res.status(403).json({ error: 'Download limit reached' });
    }
    
    if (share.passwordHash && !password) {
      return res.status(401).json({ error: 'Password required' });
    }
    
    if (share.passwordHash && !(await comparePassword(password, share.passwordHash))) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Use streaming for large files
    const fileSize = Number(share.file.size);
    const useStreaming = fileSize > 10 * 1024 * 1024; // Stream if > 10MB
    
    await prisma.share.update({
      where: { id: share.id },
      data: { downloadCount: { increment: 1 } },
    });
    
    res.setHeader('Content-Type', share.file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(share.file.originalName || share.file.filename)}"`);
    res.setHeader('Content-Length', fileSize);
    
    if (useStreaming) {
      // Stream large files
      const fileStream = storageService.getFileStream(
        share.file.fileHash,
        share.file.shardId,
        share.file.shardType
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
        share.file.fileHash,
        share.file.shardId,
        share.file.shardType
      );
      res.send(fileBuffer);
    }
  } catch (error) {
    console.error('Share download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;
