import express from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, generateSecretKey } from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const router = express.Router();
const prisma = new PrismaClient();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const passwordHash = await hashPassword(password);
    const secretKey = generateSecretKey();
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        secretKey,
        planId: 'free',
      },
      select: {
        id: true,
        email: true,
        secretKey: true,
        storageUsed: true,
        plan: true,
      },
    });
    
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    res.status(201).json({
      user: {
        ...user,
        storageUsed: user.storageUsed.toString(),
        plan: {
          ...user.plan,
          storageLimit: user.plan.storageLimit.toString(),
        },
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { plan: true },
    });
    
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        secretKey: user.secretKey,
        storageUsed: user.storageUsed.toString(),
        plan: {
          ...user.plan,
          storageLimit: user.plan.storageLimit.toString(),
        },
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    const accessToken = generateAccessToken(decoded.userId);
    
    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

export default router;

// Get current user info
import { authenticate } from '../middleware/auth.js';

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { plan: true },
      select: {
        id: true,
        email: true,
        secretKey: true,
        storageUsed: true,
        plan: true,
      },
    });
    
    res.json({
      user: {
        ...user,
        storageUsed: user.storageUsed.toString(),
        plan: {
          ...user.plan,
          storageLimit: user.plan.storageLimit.toString(),
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});
