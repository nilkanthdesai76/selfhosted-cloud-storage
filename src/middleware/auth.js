import { verifyAccessToken } from '../utils/jwt.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const secretKey = req.headers['x-secret-key'];
    
    // Try secret key first
    if (secretKey) {
      const user = await prisma.user.findUnique({
        where: { secretKey },
        include: { plan: true },
      });
      
      if (user) {
        req.user = user;
        return next();
      }
      return res.status(401).json({ error: 'Invalid secret key' });
    }
    
    // Fall back to JWT
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { plan: true },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const authenticateSecretKey = async (req, res, next) => {
  try {
    const secretKey = req.headers['x-secret-key'];
    
    if (!secretKey) {
      return res.status(401).json({ error: 'Secret key required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { secretKey },
      include: { plan: true },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid secret key' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Secret key auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
