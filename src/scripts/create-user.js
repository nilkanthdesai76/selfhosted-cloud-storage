import { PrismaClient } from '@prisma/client';
import { hashPassword, generateSecretKey } from '../utils/crypto.js';

const prisma = new PrismaClient();

async function createUser(email, password) {
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      console.log(`User ${email} already exists!`);
      console.log(`Secret Key: ${existingUser.secretKey}`);
      return existingUser;
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
      include: {
        plan: true,
      },
    });
    
    console.log('\n✅ User created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${user.email}`);
    console.log(`Secret Key: ${user.secretKey}`);
    console.log(`Plan: ${user.plan.name}`);
    console.log(`Storage Limit: ${Number(user.plan.storageLimit) / (1024 * 1024 * 1024)}GB`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || 'admin@example.com';
const password = process.argv[3] || 'password123';

createUser(email, password);
