import express from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { hashPassword, comparePassword, generateSecretKey } from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { emailService } from '../services/email.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Step 1: Request OTP for signup
router.post('/signup/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Create temporary ID for tracking this signup flow
    const tempUserId = crypto.randomBytes(16).toString('hex');
    
    // Store OTP (userId is null for signup since user doesn't exist yet)
    await prisma.oTP.create({
      data: {
        email,
        code,
        type: `signup:${tempUserId}`,
        expiresAt,
      },
    });
    
    // Send OTP email
    await emailService.sendOTP(email, code, 'signup');
    
    res.json({ 
      message: 'OTP sent to your email',
      tempUserId,
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Step 2: Verify OTP and complete signup
router.post('/signup/verify', async (req, res) => {
  try {
    const { email, otp, password, tempUserId } = req.body;
    
    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'Email, OTP, and password required' });
    }
    
    // Find valid OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        code: otp,
        type: `signup:${tempUserId}`,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });
    
    // Create user
    const passwordHash = await hashPassword(password);
    const secretKey = generateSecretKey();
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        secretKey,
        planId: 'free',
        emailVerified: true,
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
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Step 1: Request OTP for login
router.post('/login/request-otp', async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { plan: true },
    });
    
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if device is trusted
    if (deviceId) {
      const trustedDevice = await prisma.trustedDevice.findUnique({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId,
          },
        },
      });
      
      if (trustedDevice) {
        // Skip OTP for trusted device
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);
        
        // Update last used
        await prisma.trustedDevice.update({
          where: { id: trustedDevice.id },
          data: { lastUsedAt: new Date() },
        });
        
        return res.json({
          skipOTP: true,
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
      }
    }
    
    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await prisma.oTP.create({
      data: {
        userId: user.id,
        email,
        code,
        type: 'login',
        expiresAt,
      },
    });
    
    // Send OTP
    await emailService.sendOTP(email, code, 'login');
    
    res.json({ 
      message: 'OTP sent to your email',
      requireOTP: true,
    });
  } catch (error) {
    console.error('Login request OTP error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Step 2: Verify OTP and complete login
router.post('/login/verify', async (req, res) => {
  try {
    const { email, otp, rememberDevice, deviceId, deviceName } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { plan: true },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        userId: user.id,
        email,
        code: otp,
        type: 'login',
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });
    
    // Add trusted device if requested
    if (rememberDevice && deviceId) {
      await prisma.trustedDevice.upsert({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId,
          },
        },
        update: {
          lastUsedAt: new Date(),
          deviceName: deviceName || 'Unknown Device',
        },
        create: {
          userId: user.id,
          deviceId,
          deviceName: deviceName || 'Unknown Device',
        },
      });
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
    console.error('Verify login OTP error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;

// Forgot password - request reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Don't reveal if user exists
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });
    
    // Send reset email
    await emailService.sendPasswordReset(email, token);
    
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }
    
    // Find valid reset token
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: { user: true },
    });
    
    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Update password
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    });
    
    // Mark token as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change password (authenticated)
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    
    // Verify current password
    if (!(await comparePassword(currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user info
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
        emailVerified: true,
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

// Get trusted devices
router.get('/trusted-devices', authenticate, async (req, res) => {
  try {
    const devices = await prisma.trustedDevice.findMany({
      where: { userId: req.user.id },
      orderBy: { lastUsedAt: 'desc' },
    });
    
    res.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

// Remove trusted device
router.delete('/trusted-devices/:deviceId', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    await prisma.trustedDevice.delete({
      where: {
        userId_deviceId: {
          userId: req.user.id,
          deviceId,
        },
      },
    });
    
    res.json({ message: 'Device removed' });
  } catch (error) {
    console.error('Remove device error:', error);
    res.status(500).json({ error: 'Failed to remove device' });
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
