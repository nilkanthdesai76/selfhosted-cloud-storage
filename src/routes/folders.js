import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create folder
router.post('/create', authenticate, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Folder name required' });
    }
    
    // Verify parent folder belongs to user if provided
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId, userId: req.user.id },
      });
      if (!parentFolder) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
    }
    
    const folder = await prisma.folder.create({
      data: {
        name,
        userId: req.user.id,
        parentId: parentId || null,
      },
    });
    
    res.status(201).json({ folder });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// List folders
router.get('/list', authenticate, async (req, res) => {
  try {
    const { parentId } = req.query;
    
    const folders = await prisma.folder.findMany({
      where: {
        userId: req.user.id,
        parentId: parentId || null,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
    
    res.json({ folders });
  } catch (error) {
    console.error('List folders error:', error);
    res.status(500).json({ error: 'Failed to list folders' });
  }
});

// Toggle star on folder
router.patch('/:id/star', authenticate, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const updated = await prisma.folder.update({
      where: { id: req.params.id },
      data: { starred: !folder.starred },
    });
    
    res.json({ folder: updated });
  } catch (error) {
    console.error('Star toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

// Restore folder from trash
router.patch('/:id/restore', authenticate, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
        deletedAt: { not: null },
      },
    });
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found in trash' });
    }
    
    const updated = await prisma.folder.update({
      where: { id: req.params.id },
      data: { deletedAt: null },
    });
    
    res.json({ folder: updated, message: 'Folder restored' });
  } catch (error) {
    console.error('Restore folder error:', error);
    res.status(500).json({ error: 'Failed to restore folder' });
  }
});

// Get folder
router.get('/:id', authenticate, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        children: true,
        parent: true,
      },
    });
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    res.json({ folder });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ error: 'Failed to get folder' });
  }
});

// Update folder
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Prevent moving folder into itself or its children
    if (parentId === folder.id) {
      return res.status(400).json({ error: 'Cannot move folder into itself' });
    }
    
    const updatedFolder = await prisma.folder.update({
      where: { id: req.params.id },
      data: {
        name: name || folder.name,
        parentId: parentId !== undefined ? parentId : folder.parentId,
      },
    });
    
    res.json({ folder: updatedFolder });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder (soft delete - move to trash)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.user.id, deletedAt: null },
    });
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Soft delete - move to trash
    await prisma.folder.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    
    res.json({ message: 'Folder moved to trash' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Permanently delete folder
router.delete('/:id/permanent', authenticate, async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Delete folder permanently
    await prisma.folder.delete({
      where: { id: req.params.id },
    });
    
    res.json({ message: 'Folder permanently deleted' });
  } catch (error) {
    console.error('Permanent delete folder error:', error);
    res.status(500).json({ error: 'Failed to permanently delete folder' });
  }
});

export default router;
